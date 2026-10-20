# PostgreSQL dataset

A synthetic African-safari database (watering holes, animals, observations) in Postgres 16 with logical replication on, a writer that never stops, and eight schema changes you apply one at a time. A second Postgres subscribes to it so you can watch what replication does with each change before you point a real pipeline at it.

<!-- bench:start -->Measured end to end, from `docker compose up` on fresh volumes to `verify.py` passing against the subscriber: 29 s, so budget 1 minute (median of the runs recorded in [bench.txt](bench.txt)).<!-- bench:end -->

## Run it

Needs Docker with Compose v2, Python 3.9+, and `psql`. No Python packages.

```bash
cd pg && docker compose -p terra up -d --wait
```

```bash
python3 stream.py
```

```bash
events/apply.sh all && python3 verify.py --wait 120
```

Run the second command in its own terminal; it writes about ten rows a second until you stop it. The third applies the eight events to the source and to the subscriber, waiting for the subscriber to catch up where an event needs it, then checks that the subscriber matches. To take the events one at a time: `events/apply.sh 1`, then `python3 verify.py --wait 120`, and so on to 8. If the subscriber is not running, `apply.sh` stops; set `SUB_DSN=none` to apply to the source only, for example when Artie is the consumer.

If `docker compose up --wait` reports the subscriber unhealthy, its `CREATE SUBSCRIPTION` failed on first start, usually because the `artie` password in `init/03_artie.sql` and `TERRA_ARTIE_PASSWORD` differ; check `docker compose -p terra logs subscriber`, fix, then `docker compose -p terra down -v` and start again.

Ports: the source is on `localhost:5432` (all interfaces, since Artie has to reach it), the subscriber on `127.0.0.1:5433` only. Both use the `postgres` password in `docker-compose.yml`. Reset everything with `docker compose -p terra down -v`. The event files can be re-run; each one checks the current schema before it changes it.

## What you will see

Full detail with log lines is in [docs/events-observed.md](../docs/events-observed.md). The short version, from running the sequence on 2026-10-20:

- `verify.py` prints one line per table: source rows, subscriber rows, column count, and `ok` or what differs. It passes after every event when `apply.sh` is allowed to touch the subscriber, and the subscriber logs no errors.
- The subscriber needs DDL typed in by hand for every event. That is what `events/subscriber/` is. Logical replication copies rows, not schema; a replica cannot infer a new column from the rows that carry it. This is the gap a CDC tool fills, and it is why the subscriber is a stand-in, not a substitute, for a pipeline.
- Events 05 (rename) and 08 (drop) are done in two steps on the subscriber: first make it accept both the old and the new row shape, then, after `apply.sh` has confirmed the subscriber applied everything that committed before the event, drop the old column. If you rename on both sides at the same moment while rows are in flight, replication stops for good with `missing replicated column: "name"`; docs/events-observed.md shows that happening and why.
- If you run `SUB_DSN=none events/apply.sh all`, so the subscriber gets no DDL, replication stops at event 01 and never recovers on its own. The worker fails on the same transaction every 5 seconds, nothing later is applied for any table, and the slot keeps WAL on the source until you fix the subscriber or drop the slot.
- `stream.py` may print one failed tick during event 08. It reads the schema at the start of each tick and the column drop landed inside one. The batch was never committed; it resyncs and continues.
- `verify.py` usually needs two or three attempts right after an event. The subscriber runs a second or two behind the writer.

## Connect Artie

By the end, enter these values in Artie:

| Field | Value |
| --- | --- |
| Host name | Tunnel address or VM IP |
| Port | `5432` or the tunnel-assigned port |
| Service account | `artie` and the password set in `init/03_artie.sql` |
| Database | `terra` |

Change the placeholder passwords first (see [SECURITY.md](../SECURITY.md)):

- `docker-compose.yml`: `POSTGRES_PASSWORD`, or set `TERRA_ADMIN_PASSWORD` in the environment
- `init/03_artie.sql`: the `artie` role password, and set `TERRA_ARTIE_PASSWORD` to the same value so the subscriber can connect

### Expose the database

For a quick test, start a TCP tunnel:

```bash
ngrok tcp 5432
```

Give Artie the host and port printed by ngrok. Tunnel addresses are ephemeral and free-tier transfer limits may make them unsuitable for a large backfill.

For a steadier demo, run this directory on a small VM and allow inbound `5432` only from Artie's egress IP ranges (listed in [docs/sources.md](../docs/sources.md), key `artie-connection-options`). Do not expose Postgres to `0.0.0.0/0`.

### Create the source

Create a PostgreSQL source using the host, port, `artie` credentials, and database `terra`. Set the publication to `dbz_publication`. Artie creates its own replication slot. The publication is `FOR ALL TABLES`, which is what Artie's Postgres page asks for (`artie-postgres` in sources.md).

Once validated, Artie backfills `watering_holes`, `animals`, and `observations`, then streams changes. Run `stream.py` and the events exactly as above; `verify.py` has a `--dest-type snowflake` and `--dest-type bigquery` mode for the destination, see "Verify".

Keep the subscriber running or not, as you like. Artie and the subscriber each hold their own replication slot on the source.

### Keeping the slot healthy

If the database sits idle, Artie's docs say to enable heartbeats so the slot keeps advancing (`artie-postgres` in sources.md). The heartbeat table is commented out at the bottom of `init/03_artie.sql`. `stream.py` makes this moot while it runs.

Delete the Artie pipeline before tearing down a source it is still trying to read.

## Verify

```bash
python3 verify.py                                   # source 5432 vs subscriber 5433
python3 verify.py --wait 120                        # keep retrying for up to 120 s
python3 verify.py --dest-type snowflake --dest TERRA.PUBLIC --wait 600
python3 verify.py --dest-type bigquery --dest my-project.terra --wait 600
```

For a Postgres destination it compares, per table: column names and full types (`numeric(6,2)`, not just `numeric`), row count, and an md5 over every row's text form ordered by primary key. Rows flagged `__artie_delete = true` are excluded on the destination and `__artie_*` columns are ignored, so a destination with soft deletes on should still match. `--dest-schema` points it at the schema Artie writes to.

For Snowflake and BigQuery it compares column names, row count and the sum of the primary key, through the `snowsql` and `bq` CLIs. Those two modes were written against the docs and have not been run against a real destination. Doing that is item 1 of the hand-off checklist in the v0.1 pull request.

Extra columns on the destination are reported but do not fail the check for Snowflake and BigQuery, or for Postgres with `--allow-extra-columns`. `--ignore-types` skips the type comparison, which is needed for Postgres tables Artie created with its own type choices. Artie's docs say a dropped or renamed source column stays in the destination unless hard deletes for columns are on (`artie-schema-evolution` in sources.md), so after events 05 and 08 a destination is expected to still have `name` and `status`.

Exit status is 0 on a full match, 1 otherwise, which is what CI keys on.

## The eight events

Each file in `events/` has a header saying what Postgres emits for it, what Artie's docs say (or that they say nothing), and what the destination should look like after. [docs/events-expected.md](../docs/events-expected.md) is the same information as one table with citations; [docs/events-observed.md](../docs/events-observed.md) is what happened.

| # | Event | DDL | Subscriber needed |
| --- | --- | --- | --- |
| 01 | Weigh-in | `ALTER TABLE animals ADD COLUMN weight_kg numeric(6,2)` | add the column first |
| 02 | A pangolin is sighted | `ALTER TYPE animal_species ADD VALUE 'pangolin'` | add the label first |
| 03 | The herd outgrows int | `ALTER COLUMN animal_id TYPE bigint` on `animals` and `observations` | widen first |
| 04 | The collars come online | `CREATE TABLE collar_pings (...)` | create the table first, `REFRESH PUBLICATION` after |
| 05 | The naming committee | `ALTER TABLE animals RENAME COLUMN name TO display_name` | add `display_name` and make `name` nullable first; after catch-up copy and drop `name` |
| 06 | Rangers file structured reports | `ALTER TABLE observations ADD COLUMN field_report jsonb` | add the column first |
| 07 | Survey adds elevation | `ALTER TABLE watering_holes ADD COLUMN elevation_m int NOT NULL DEFAULT 0` | add the column first |
| 08 | Status moves to the collars | `ALTER TABLE animals DROP COLUMN status` | make `status` nullable first; drop it after catch-up |

Every event also touches rows, because a DDL statement on its own is not a WAL event a consumer can see (`artie-postgres` in sources.md). `stream.py` reads the live schema before every batch and starts using each new column or table as soon as it exists.

## Queries

`queries.sql` has three queries. Run it against either side:

```bash
psql postgresql://postgres:change-me-admin-password@localhost:5432/terra -f queries.sql
psql postgresql://postgres:change-me-admin-password@localhost:5433/terra -f queries.sql
```

1. Observations per watering hole. Works on the seed.
2. Verified field reports per ranger. Needs event 06 (`field_report`).
3. Latest collar ping per animal with the hole and its elevation. Needs event 04 (`collar_pings`), reads better after 05 (`display_name`) and 07 (`elevation_m`).

## Seed data

`init/02_seed.sql` is checked in and is byte-identical to:

```bash
python3 generate_seed.py --animals 150 --observations-per-animal 10 -o init/02_seed.sql
```

CI runs that command and `cmp`s the result. For a larger dataset:

| Preset | Approximate observations | Intended use |
| --- | ---: | --- |
| `tiny` | 45k | Fast smoke test |
| `demo` | 550k | Managed free-tier demo |
| `1m` | 1m | Local Docker or VM |
| `5m` | 5m | Local only |

```bash
python3 generate_seed.py --size demo -o init/02_seed.sql
```

The generator is deterministic: the same arguments and `--seed` produce identical output. About one note in ten is over 2 kB, and `observations.notes` has `STORAGE EXTERNAL`, so those notes are stored out of line in the TOAST table rather than compressed inline (with the default strategy they compress to about 1.3 kB and never leave the row). An UPDATE that does not touch `notes` then omits the column from the WAL, which is the case Artie's docs describe under TOAST handling (`artie-postgres` in sources.md). Timestamps mix `+02` and `+03` offsets. Initialization scripts run only on a fresh volume, so reload with `docker compose -p terra down -v && docker compose -p terra up -d --wait`.

## Contents

```text
pg/
├── docker-compose.yml      # source (5432) and subscriber (5433), both Postgres 16
├── init/                   # source init: 01 schema, 02 seed, 03 artie role + publication
├── subscriber/             # subscriber init: CREATE SUBSCRIPTION
├── generate_seed.py        # deterministic seed generator
├── stream.py               # continuous deterministic writer
├── events/                 # 01..08 schema events, apply.sh, subscriber/ DDL
├── verify.py               # source vs destination comparison
├── queries.sql             # baseline and two post-event queries
├── bench.sh, bench.txt     # timing from nothing to verified replica
├── bench_readme.py         # keeps the number at the top of this file honest
└── schema_svg.py           # draws the schema from information_schema
```

## Scope

In v0.1: one Postgres source, one writer, eight events, one offline consumer, one verifier. The subscriber is there so the demo can be tested without an account; it is not a model of what any pipeline does with DDL.

Out: a hosted always-on instance, public credentials, chaos or dirty-data flags, a second source database, dbt models, Snowflake or BigQuery verification runs. The `--dest-type` modes in `verify.py` exist but are unproven.

Data is synthetic (CC0). Code is Apache-2.0, see [LICENSE](../LICENSE).
