# PostgreSQL dataset

A synthetic African-safari database (watering holes, animals, observations) in Postgres 16 with logical replication on, a writer that never stops, and eight schema changes you apply one at a time. A second Postgres subscribes to it so you can watch what replication does with each change before you point a real pipeline at it.

<!-- bench:start -->Measured end to end, from `docker compose up` on fresh volumes to `verify.py` passing against the subscriber: 163 s, so budget 3 minutes (median of the runs recorded in [bench.txt](bench.txt)).<!-- bench:end -->

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

If `docker compose up --wait` reports the subscriber unhealthy, its subscription or initial copy failed, usually because an old source volume has a different `artie` password or schema; check `docker compose -p terra logs subscriber`, then `docker compose -p terra down -v` and start again. The Compose project name is fixed to `terra`, so `-p terra` is optional.

Ports: the source is on `localhost:5432` (all interfaces, since Artie has to reach it), the subscriber on `127.0.0.1:5433` only. Both use the `postgres` password from `TERRA_ADMIN_PASSWORD`, default `change-me-admin-password`. `docker compose up --wait` returns only after the subscriber has finished copying every table. Reset everything with `docker compose -p terra down -v`. The event files can be re-run; each one checks the current schema before it changes it.

## What you will see

Two consumers have run the full sequence: the Postgres subscriber that ships
in `docker-compose.yml` (every run, in CI) and real Artie pipelines, on
2026-10-21, once to Snowflake and once to a Postgres destination with
`verify.py` after every event (docs/artie-run.md). The table says what each
did. Nothing in the right column is a general claim about Artie; it is what
those runs showed, and docs/artie-run.md has the timestamps.

| | subscriber stand-in (docs/events-observed.md) | Artie, two runs (docs/artie-run.md) |
| --- | --- | --- |
| `verify.py` | passes after every event, zero subscriber errors, full checksum | Snowflake: columns and counts through the MCP only (no `snowsql` here). Postgres destination: full checksum PASS after the backfill and after events 01, 02, 05, 06, 07, 08; 03 and 04 needed operator action first |
| 01 add column | column added on the subscriber first; next row fits | `WEIGHT_KG NUMBER(6,2)` appeared on the next flush |
| 02 enum value | label added on the subscriber first | `SPECIES` is VARCHAR, nothing to do |
| 03 int to bigint | widened on the subscriber first | Snowflake: already `NUMBER(38,0)`. Postgres: the column stays `integer` and every flush fails on the first id above 2^31; widening it by hand, pausing, redeploying and reconnecting did not clear it, a drop-and-backfill did until the next wide id, and a pipeline created after the event ran clean |
| 04 new table | `CREATE TABLE` then `REFRESH PUBLICATION`, which copies existing rows | auto-replicate off: not picked up; added by hand and backfilled; rows written between the backfill snapshot and the end of the deploy were not forwarded (107 of 1420). Auto-replicate on: picked up 4.5 minutes later, 85 of 85 rows matched |
| 05 rename | both columns during catch-up, then `name` dropped by `apply.sh`; renaming both sides at once stalls replication for good | both `NAME` and `DISPLAY_NAME` stay; `NAME` is frozen |
| 06 jsonb column and the TOAST case | column added first; the 25 out-of-line `notes` arrived byte-identical | `FIELD_REPORT VARIANT` on Snowflake; on Postgres all 249 out-of-line `notes` byte-identical after the UPDATE, checksum PASS 19 s after the writer stopped |
| 07 NOT NULL DEFAULT column | column added first | `ELEVATION_M NUMBER(38,0)` on Snowflake, `elevation_m integer` on Postgres; nullable, no default, both times |
| 08 drop column | `status` made nullable first, dropped after catch-up | `STATUS` stays, frozen |
| lag | 1 to 3 s | 30 s flush interval, 0.6 to 3.5 s reported latency on Snowflake; on Postgres with a 20 s flush, a checksum match 19 to 51 s after the writer stopped, and 6 to 10 minutes before a freshly deployed transfer's first flush |
| what it needs from you | the DDL in `events/subscriber/`, applied by `apply.sh` | nothing for columns; a table added to the pipeline before writing to it, or auto-replicate; on a Postgres destination, a re-backfill or a new pipeline after an int to bigint change |

Things that look wrong and are not, on the subscriber side:

- `verify.py` usually needs two or three attempts right after an event. The subscriber runs a second or two behind the writer.
- `stream.py` may print one failed tick during event 08. It reads the schema at the start of each tick and the column drop landed inside one. The batch was never committed; it resyncs and continues.
- If you run `SUB_DSN=none events/apply.sh all` with the subscriber attached, so it gets no DDL, replication stops at event 01 and never recovers on its own. The worker fails on the same transaction every 5 seconds, nothing later is applied for any table, and the slot keeps WAL on the source until you fix the subscriber or drop the slot. Detach the subscriber first (`docker compose rm -sf subscriber`, then drop its slot) when something else is the consumer.

Event 06 is also the TOAST case. Its UPDATE sets `field_report` on 25 rows whose `notes` are stored out of line and leaves `notes` alone, so the WAL carries no `notes` value for them (`notes[text]:unchanged-toast-datum` in a `test_decoding` peek); the consumer has to keep what it has. `stream.py` does the same about once a second by moving an observation to another watering hole. `verify.py` checksums `notes`, so a consumer that dropped or nulled them fails.

## Connect Artie

By the end, enter these values in Artie:

| Field | Value |
| --- | --- |
| Host name | Tunnel address or VM IP |
| Port | `5432` or the tunnel-assigned port |
| Service account | `artie` and the password in `TERRA_ARTIE_PASSWORD` (default in `docker-compose.yml`) |
| Database | `terra` |

Change the placeholder passwords first (see [SECURITY.md](../SECURITY.md)):

- Set `TERRA_ADMIN_PASSWORD` in the environment. `docker-compose.yml` and every script in this directory read it, so the commands in this README keep working.
- Set `TERRA_ARTIE_PASSWORD` too. `init/03_artie.sh` creates the `artie` role from it and the subscriber connects with it, so there is nothing to edit in a file.

### Expose the database

For a quick test, start a TCP tunnel:

```bash
ngrok tcp 5432
```

Give Artie the host and port printed by ngrok. Tunnel addresses are ephemeral and free-tier transfer limits may make them unsuitable for a large backfill.

For a steadier demo, run this directory on a small VM and allow inbound `5432` only from Artie's egress IP ranges (listed in [docs/sources.md](../docs/sources.md), key `artie-connection-options`). Do not expose Postgres to `0.0.0.0/0`.

### Create the source

Create a PostgreSQL source using the host, port, `artie` credentials, and database `terra`. Set the publication to `dbz_publication`. Artie creates its own replication slot. The publication is `FOR ALL TABLES`, which is what Artie's Postgres page asks for (`artie-postgres` in sources.md). Two things the 2026-10-21 run hit on the first deploy (docs/artie-run.md): the source reader's "publish partitioned table changes via partition root" setting defaults to on and must be turned off to match this publication, and a Postgres or Snowflake destination schema that does not exist yet is created only if "dynamically create namespaces" is on.

Once validated, Artie backfills `watering_holes`, `animals`, and `observations`, then streams changes. Run `stream.py` and the events exactly as above; `verify.py` has a `--dest-type snowflake` and `--dest-type bigquery` mode for the destination, see "Verify".

Keep the subscriber running or not, as you like. Artie and the subscriber each hold their own replication slot on the source.

### Keeping the slot healthy

If the database sits idle, Artie's docs say to enable heartbeats so the slot keeps advancing (`artie-postgres` in sources.md). The heartbeat table is commented out at the bottom of `init/03_artie.sh`. `stream.py` makes this moot while it runs.

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

Extra columns on the destination are reported but do not fail the check for Snowflake and BigQuery, or for Postgres with `--allow-extra-columns`. `--ignore-types` skips the type comparison, which is needed for Postgres tables Artie created with its own type choices. After event 05 an Artie destination keeps `name` and only has `display_name` for rows changed since the rename, so add `--exclude-columns animals.display_name`; `--no-checksum` falls back to names, counts and primary key sums, as the Snowflake and BigQuery modes do. Artie's docs say a dropped or renamed source column stays in the destination unless hard deletes for columns are on (`artie-schema-evolution` in sources.md), so after events 05 and 08 a destination is expected to still have `name` and `status`.

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
| 06 | Rangers file structured reports | `ALTER TABLE observations ADD COLUMN field_report jsonb`, then update 25 out-of-line rows without touching `notes` | add the column first |
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
├── init/                   # source init: 01 schema, 02 seed, 03 artie role (password from env) + publication
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

## The stranger test

`first_run.sh` runs the three commands above exactly as written, times them, and prints one line such as `first run: 41 seconds, verify PASS`. CI runs it as its own job, so the README path is tested by something that has never seen the repo before.

## Scope

In v0.1: one Postgres source, one writer, eight events, one offline consumer, one verifier. The subscriber is there so the demo can be tested without an account; it is not a model of what any pipeline does with DDL.

Out: a hosted always-on instance, public credentials, chaos or dirty-data flags, a second source database, dbt models, Snowflake or BigQuery verification runs. The `--dest-type` modes in `verify.py` exist but are unproven.

Data is synthetic (CC0). Code is Apache-2.0, see [LICENSE](../LICENSE).
