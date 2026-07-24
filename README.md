# Terra safari demo — a Postgres source Artie can replicate from

Terra runs an African-safari wildlife dataset in Postgres with logical replication enabled, then exposes it so an Artie pipeline can use it as a source.

By the end, enter these values in Artie:

| Field | Value |
| --- | --- |
| Host name | Tunnel address or VM IP |
| Port | `5432` or the tunnel-assigned port |
| Service account | `artie` and the password set in `init/03_artie.sql` |
| Database | `terra` |

## Contents

```text
terra/
├── docker-compose.yml      # Postgres 16 with wal_level=logical
├── generate_seed.py        # deterministic safari-data generator
└── init/
    ├── 01_schema.sql       # pre-migration schema
    ├── 02_seed.sql         # generated seed data
    └── 03_artie.sql        # Artie role, grants, publication
```

The initial schema has three tables:

- `watering_holes`: synthetic, named regional reference locations.
- `animals`: tracked animal records using the `animal_species` enum.
- `observations`: time-stamped observations at watering holes.

`animal_species` contains the Big Five plus cheetah, giraffe, plains zebra,
hippopotamus, blue wildebeest, spotted hyena, common warthog, ostrich, impala,
and African wild dog. The locations and individual records are synthetic and
are not a wildlife-management dataset.

## Prerequisites

- Docker with Compose v2
- Python 3.9+
- Either an ngrok TCP tunnel or a VM if Artie must reach the database over the internet

## Generate seed data

The checked-in `init/02_seed.sql` is a smoke-sized deterministic seed. Generate a larger dataset when needed:

```bash
cd terra
python3 generate_seed.py --size demo -o init/02_seed.sql
```

Available presets:

| Preset | Approximate observations | Intended use |
| --- | ---: | --- |
| `tiny` | 45k | Fast smoke test |
| `demo` | 550k | Managed free-tier demo |
| `1m` | 1m | Local Docker or VM |
| `5m` | 5m | Local only |

Override a preset directly when needed:

```bash
python3 generate_seed.py --animals 40000 --observations-per-animal 60 -o init/02_seed.sql
```

The generator is deterministic: the same arguments and `--seed` produce identical data. Observation notes deliberately mix short values with varied multi-paragraph values so the larger values use Postgres TOAST storage. Generated timestamps use realistic regional `+02` and `+03` offsets; paired cross-offset rows exercise timestamp normalization without inventing DST behavior for these safari regions.

## Start Postgres

Change the placeholder passwords first:

- `docker-compose.yml`: `POSTGRES_PASSWORD`
- `init/03_artie.sql`: the `artie` role password

Then start and verify:

```bash
docker compose up -d
docker compose logs -f postgres

docker compose exec postgres psql -U postgres -d terra \
  -c "SELECT count(*) FROM observations;"
docker compose exec postgres psql -U postgres -d terra \
  -c "SELECT pubname FROM pg_publication;"
```

The initialization scripts run only for a fresh volume. To reload schema or seed changes:

```bash
docker compose down -v
docker compose up -d
```

## Expose the database

For a quick test, start a TCP tunnel:

```bash
ngrok tcp 5432
```

Give Artie the host and port printed by ngrok. Tunnel addresses are ephemeral and free-tier transfer limits may make them unsuitable for a large backfill.

For a steadier demo, run this directory on a small VM and allow inbound `5432` only from Artie's egress IP ranges. Do not expose Postgres to `0.0.0.0/0`.

## Connect Artie

Create a PostgreSQL source using the host, port, `artie` credentials, and database `terra`. Set the publication to `dbz_publication`. Artie creates its own replication slot.

Once validated, Artie backfills `watering_holes`, `animals`, and `observations`, then streams changes.

## CDC schema-evolution demo

The point of the dataset is to make live changes and observe them downstream. Run commands as `postgres` or another database admin.

```bash
# A new column appears downstream when a subsequent row change is emitted.
docker compose exec postgres psql -U postgres -d terra \
  -c "ALTER TABLE animals ADD COLUMN weight_kg numeric(6,2);"
docker compose exec postgres psql -U postgres -d terra \
  -c "UPDATE animals SET updated_at = now() WHERE animal_id = 1;"

# Continue the demo with a rename. The int-to-bigint exercise must update both
# sides of observations.animal_id's foreign-key relationship in one migration.
docker compose exec postgres psql -U postgres -d terra \
  -c "ALTER TABLE animals RENAME COLUMN name TO display_name;"
```

A bare `ADD COLUMN` is not itself a WAL event. Touch a row in that table after the DDL to make the schema change visible to a streaming consumer. Every table has a primary key, so updates and deletes retain row identity over logical replication.

## Tear down

```bash
docker compose down -v
```

Delete the Artie pipeline before tearing down a source it is still trying to read.
