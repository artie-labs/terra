# PostgreSQL dataset

Terra runs an African-safari wildlife dataset in Postgres with logical replication enabled, then exposes it so an Artie pipeline can use it as a source.

By the end, enter these values in Artie:

| Field | Value |
| --- | --- |
| Host name | Tunnel address or VM IP |
| Port | `5432` or the tunnel-assigned port |
| Service account | `artie` and the password in `TERRA_ARTIE_PASSWORD` (default in `docker-compose.yml`) |
| Database | `terra` |

## Contents

```text
pg/
├── docker-compose.yml      # source (5432) and subscriber (127.0.0.1:5433), Postgres 16
├── generate_seed.py        # deterministic safari-data generator
├── init/
│   ├── 01_schema.sql       # pre-migration schema
│   ├── 02_seed.sql         # generated seed data
│   └── 03_artie.sh         # Artie role (password from TERRA_ARTIE_PASSWORD), grants, publication
└── subscriber/
    └── 02_subscribe.sh     # CREATE SUBSCRIPTION on the subscriber's first start
```

`observations.notes` is stored out of line (`STORAGE EXTERNAL`), so about one note in ten lives in the TOAST table rather than compressed inline.

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
cd pg
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

The Compose project name is fixed to `terra` in `docker-compose.yml`, so `-p terra` is optional; the commands below keep it for clarity. A volume from before this version has the old schema and cannot be reused: run `docker compose -p terra down -v` once first.

Change the placeholder passwords first, both through the environment:

- `TERRA_ADMIN_PASSWORD`: the `postgres` superuser on both containers
- `TERRA_ARTIE_PASSWORD`: the `artie` role, created by `init/03_artie.sh` and used by the subscriber to connect

There is nothing to edit in a file. Then start and verify:

```bash
docker compose -p terra up -d
docker compose -p terra logs -f postgres

docker compose -p terra exec postgres psql -U postgres -d terra \
  -c "SELECT count(*) FROM observations;"
docker compose -p terra exec postgres psql -U postgres -d terra \
  -c "SELECT pubname FROM pg_publication;"
```

`up -d --wait` returns once the seed has loaded and the subscriber has finished copying every table (30 minutes at most for the largest preset). The initialization scripts run only for a fresh volume. To reload schema or seed changes:

```bash
docker compose -p terra down -v
docker compose -p terra up -d
```

## The subscriber

`docker compose up` also starts `subscriber`, a second Postgres 16 on `127.0.0.1:5433` that subscribes to `dbz_publication` with native logical replication. It is a stand-in for a replication consumer so the dataset can be exercised with no account anywhere. It holds its own replication slot (`terra_sub`) on the source, next to the one Artie creates. It is not a CDC pipeline: DDL is not replicated, so any schema change made on the source must also be made on the subscriber, or its apply worker fails and retries forever while the slot retains WAL on the source. The numbered events in the next change carry that subscriber-side DDL; until then, either apply your DDL to `localhost:5433` first, or stop the subscriber before changing the schema:

```bash
docker compose -p terra stop subscriber     # pause it; its slot keeps WAL until it is back
docker compose -p terra rm -sf subscriber && docker volume rm terra_terra_subdata   # remove it; the slot is dropped on next start
```

If `up --wait` reports the subscriber unhealthy, its subscription or initial copy failed; `docker compose -p terra logs subscriber` says why, usually a password mismatch or an old source volume.

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

The point of the dataset is to make live changes and observe them downstream. With the subscriber running, apply each change to the subscriber (`localhost:5433`) first, then to the source; additive changes are safe in that order. Run commands as `postgres` or another database admin.

```bash
# A new column appears downstream when a subsequent row change is emitted.
docker compose -p terra exec subscriber psql -U postgres -d terra \
  -c "ALTER TABLE animals ADD COLUMN weight_kg numeric(6,2);"
docker compose -p terra exec postgres psql -U postgres -d terra \
  -c "ALTER TABLE animals ADD COLUMN weight_kg numeric(6,2);"
docker compose -p terra exec postgres psql -U postgres -d terra \
  -c "UPDATE animals SET updated_at = now() WHERE animal_id = 1;"
```

A bare `ADD COLUMN` is not itself a WAL event. Touch a row in that table after the DDL to make the schema change visible to a streaming consumer. Every table has a primary key, so updates and deletes retain row identity over logical replication. Renames and drops are not safe to do by hand on both sides at once while rows are being written; the numbered events in the next change do them in two steps.

## Tear down

```bash
docker compose -p terra down -v
```

This also drops the subscriber's `terra_sub` slot on the source, because the source is removed with it.

Delete the Artie pipeline before tearing down a source it is still trying to read.
