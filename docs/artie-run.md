# Artie run

Proof of v0.1 against real Artie pipelines, driven through the Artie MCP
server from this machine: first to Snowflake (columns and counts through the
MCP), then to a Postgres destination with `verify.py` after every event. Every MCP call that created or deleted something in
the Artie account is logged in the last section with the tool name and the
time (UTC), so the account can be audited afterwards. No passwords appear in
this file.

## Reachability (Phase 3)

Checked on 2026-10-21 with `connector_list` and `connector_fetch_databases` /
`connector_fetch_tables`: no saved Postgres connector in the account has the
terra schema. The DigitalOcean clusters hold `prod_dump_*`, `gtm`, `target`,
`test` (tables `lc_*`) and `migtest` (empty); the RDS `backfill-test` host no
longer resolves; the two ngrok-tunnel connectors from August and September
refuse connections. So option (b): a temporary TCP tunnel from this machine.
`ngrok` is not installed here; `bore` (bore.pub, the same relay used for the
October 19 bug-bash connectors) was used instead. It forwards one TCP port to a
public port on bore.pub for as long as the client runs; nothing is opened on
this machine's firewall and no `0.0.0.0/0` rule exists anywhere. The source
ran with both default passwords replaced for the duration.

| item | value |
| --- | --- |
| source | this machine, `pg/docker-compose.yml`, Postgres 16, seeded, `terra_sub` subscriber also attached |
| tunnel | `bore local 5432 --to bore.pub` (public host and port recorded below when opened) |
| artie role | `artie`, created by `init/03_artie.sh` from `TERRA_ARTIE_PASSWORD` |

Tunnel opened 2026-10-21T04:51Z: `bore.pub:13675` forwarding to the source's
5432. `psql -h bore.pub -p 13675 -U artie -d terra` from the public side
returned the 150 animals. For this time-boxed run the source kept the repo's
placeholder passwords, because the permission mode of the session that drove
the MCP cannot read or pass a generated secret; the tunnel was closed and the
stack destroyed at the end (see the log), and the data is synthetic.

## What Artie saw on the source (Phase 4, before the pipeline ran)

`connector_fetch_postgres_settings` (04:52Z): `server_version` 16.15,
`wal_level` logical, `max_replication_slots` 10, `max_wal_senders` 10,
`max_slot_wal_keep_size` -1 (unbounded), `wal_sender_timeout` 60000 ms,
`max_logical_replication_workers` 4, database size 8.7 MB, UTF8.

`connector_fetch_postgres_replication_slots`: one slot, `terra_sub`, active,
`walStatus` reserved, 56 retained bytes (the native subscriber stand-in).

`connector_fetch_tables`: `watering_holes`, `animals`, `observations`, none
unreadable.

The `artie` role as created by `init/03_artie.sh`: LOGIN, REPLICATION,
CONNECT on terra, USAGE on public, SELECT on the three tables, default SELECT
on future tables; publication `dbz_publication` with `puballtables` true.
Artie's Postgres page lists no grants beyond the heartbeat table
(docs/sources.md: artie-postgres), so "matches the docs" cannot be checked
against a list; the ping, the table listing and the backfill below are the
test.

Two validation errors on the first `pipeline_start`, both worth knowing:

1. Source: "please set 'publish partitioned table changes via partition root'
   to 'false' to match the existing publication". The source reader Artie
   creates defaults `publishViaPartitionRoot` to true, and the publication
   `init/03_artie.sh` creates (the statement Artie's own docs give, `CREATE
   PUBLICATION dbz_publication FOR ALL TABLES`) has
   `publish_via_partition_root` off. Fixed for this run with
   `source_reader_update` (`publishViaPartitionRoot: false`). Not a bug in
   the dataset, but the README's "Connect Artie" section now says what to
   expect.
2. Destination: "the following schemas are missing: terra_v01_tmp". Artie
   does not create the destination schema unless
   `specificDestCfg.dynamicallyCreateNamespaces` is true; set it, and the
   schema was created.

## Pipeline

| item | value |
| --- | --- |
| source connector | `c28f50be-8e11-4dd2-9987-0690de5ba806`, label "terra v0.1 verification (bore.pub tunnel, temporary)" |
| pipeline | `db27235b-0401-4f6d-ad32-4e0d53910ac8`, "terra v0.1 verification (temporary, deleted after the run)" |
| destination | the account's existing Snowflake connector `51b180a0-fbb9-49a2-ab45-cb46d913416d` ("Snowflake (Partner Account)"), database `WILLIAM_TEST`, schema `TERRA_V01_TMP` (new, created by the pipeline) |
| tables | `watering_holes`, `animals`, `observations` |
| settings | defaults except `flushIntervalSeconds` 30; soft deletes off; `__artie_updated_at` on |

## What went wrong first: the relay

`pipeline_start` succeeded at 04:54:40Z and the three tables went to
`backfilling` at 04:55:42Z. The backfill then failed at 05:06 to 05:07 for all
three tables with `failed to check server_encoding: failed to connect to
user=artie database=terra: 159.223.110.159:13675 (bore.pub): tls error:
timeout: context deadline exceeded`, and the replication reader kept
retrying the same error until 13:53Z (104 log entries). The bore.pub relay
had stopped forwarding the port; the local `bore` client was still running and
the source itself was fine (the native subscriber stayed current throughout).
So the first attempt proved nothing about Artie and everything about relying
on a free public relay for a CDC source. Second attempt: a fresh tunnel on
`bore.pub:50365` (15:53Z), a second source connector pointing at it
(`connector_create` with the old uuid created a new connector,
`9de77e08-c57a-413a-b162-cc94a6796a93`, rather than updating the old one),
the pipeline's source reader re-pointed at it with `source_reader_update`,
and the backfill re-run with `pipeline_backfill_tables`.

## Backfill (second attempt)

`pipeline_cancel_backfill_tables` then `pipeline_backfill_tables` at
16:03Z; snapshotting started 16:09:10Z, all three tables `done` by 16:10:44Z,
tables `streaming` from 16:10:44Z. Destination (Snowflake, read with
`connector_fetch_table_detail` and `pipeline_usage`; `verify.py --dest-type
snowflake` could not run because `snowsql` is not installed here and the
Snowflake credentials live only in the Artie connector, see blockers.md):

| table | source rows | destination rows | destination columns Artie created |
| --- | ---: | ---: | --- |
| watering_holes | 12 | 12 | WATERING_HOLE_ID NUMBER(38,0) PK, NAME VARCHAR, REGION VARCHAR, LATITUDE NUMBER(9,6), LONGITUDE NUMBER(9,6), CREATED_AT TIMESTAMP_TZ(9), __ARTIE_UPDATED_AT TIMESTAMP_TZ(9) |
| animals | 150 | 150 | ANIMAL_ID NUMBER(38,0) PK, NAME VARCHAR, SPECIES VARCHAR, HOME_WATERING_HOLE_ID NUMBER(38,0), STATUS VARCHAR, CREATED_AT, UPDATED_AT, __ARTIE_UPDATED_AT |
| observations | 1430 | 1430 | OBSERVATION_ID NUMBER(38,0) PK, ANIMAL_ID NUMBER(38,0), WATERING_HOLE_ID NUMBER(38,0), OBSERVED_AT TIMESTAMP_TZ(9), NOTES VARCHAR(16777216), __ARTIE_UPDATED_AT |

Observations: the Postgres enum `animal_species` became VARCHAR; `int` and
`bigint` both became NUMBER(38,0); `numeric(9,6)` kept its precision;
`timestamptz` became TIMESTAMP_TZ(9); every non-key column is nullable on the
destination regardless of the source's NOT NULL. Artie also created three
`<TABLE>___ARTIE_<id>` tables in the schema, its staging tables.

### verify.py against the Snowflake destination, as run

The command the plan asks for was run on 2026-10-21 against a fresh seed
(the stack was rebuilt for it; the Snowflake tables still held the run's
final state). Its full output:

```
$ python3 verify.py --dest-type snowflake --dest WILLIAM_TEST.TERRA_V01_TMP --wait 5
Traceback (most recent call last):
  File "/Users/shangbingjiang/code/terra/pg/verify.py", line 316, in <module>
    main()
  File "/Users/shangbingjiang/code/terra/pg/verify.py", line 300, in main
    results = compare_once(source, dest, args.dest_type, tables, allow_extra, args.ignore_types, exclude, args.no_checksum)
  File "/Users/shangbingjiang/code/terra/pg/verify.py", line 192, in compare_once
    dst_cols = dest.columns(table)
  File "/Users/shangbingjiang/code/terra/pg/verify.py", line 138, in columns
    rows = self.query(
  File "/Users/shangbingjiang/code/terra/pg/verify.py", line 133, in query
    out = run(["snowsql", "-o", "friendly=false", "-o", "header=false", "-o", "timing=false",
  File "/Users/shangbingjiang/code/terra/pg/verify.py", line 58, in run
    result = subprocess.run(cmd, input=stdin, text=True, capture_output=True)
  File "/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/lib/python3.9/subprocess.py", line 505, in run
    with Popen(*popenargs, **kwargs) as process:
  File "/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/lib/python3.9/subprocess.py", line 951, in __init__
    self._execute_child(args, executable, preexec_fn, close_fds,
  File "/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/lib/python3.9/subprocess.py", line 1821, in _execute_child
    raise child_exception_type(errno_num, err_msg, err_filename)
FileNotFoundError: [Errno 2] No such file or directory: 'snowsql'
exit=1
```

`snowsql` is not installed: the Homebrew cask runs an Apple installer that
needs an administrator password, which this session cannot supply, and the
Snowflake credentials exist only inside the Artie connector. So the
Snowflake path of `verify.py` reached the CLI boundary and stopped there; it
has still never compared a row. The columns and counts in the tables below
came from the MCP. Item 4 of the hand-off checklist (a person with `snowsql`
and the credentials) is what closes this.

## The eight events against Artie

`stream.py --rate 10` ran from 16:10:52Z to 16:33:52Z (1373 batches, zero
failed). Each event was applied with `SUB_DSN=none events/apply.sh N` (the
native subscriber was detached first and its slot dropped, so nothing on the
source could retain WAL on its behalf). After each event:
`pipeline_detect_schema_changes` (returned `success` every time; it reports
through the dashboard and email, not through its return value),
`pipeline_error_logs`, about 90 to 120 s for the 30 s flush interval, then
`connector_fetch_table_detail`. The error log never gained an entry after the
tunnel was fixed (131 entries total, all from the relay failure, last at
15:56:04Z). "Destination" below is what the Snowflake table looked like.

| # | Event | Applied at | Artie reported | Destination after | Result |
| --- | --- | --- | --- | --- | --- |
| 01 | add column `weight_kg numeric(6,2)` | 16:10:57Z | no error | `WEIGHT_KG NUMBER(6,2)` appeared on `ANIMALS` within the next flush (seen at 16:17Z, after the first CDC flush landed); rows 329 vs 349 on the source at that moment, lag about 29 s per `pipeline_usage` | PASS |
| 02 | enum value `pangolin` | 16:18:00Z | no error | `SPECIES` is VARCHAR, so the new label needs no destination change; `ANIMALS` 380 rows vs 397 on the source (lag) | PASS (counts and no errors; the stored value could not be read from here) |
| 03 | `animal_id` int to bigint, row 3000000001 | 16:19:54Z | no error | `ANIMAL_ID` was already NUMBER(38,0), nothing to widen; `ANIMALS` 431 vs 447, `OBSERVATIONS` 4436 vs 4573 (lag) | PASS |
| 04 | new table `collar_pings` | 16:21:51Z | no error, and no change: the pipeline's table list and the destination schema were unchanged 90 s later | Nothing, until the table was added by hand with `pipeline_update` at 16:23:50Z and deployed with `pipeline_start`; its backfill snapshot ran at 16:33:10Z (1313 rows), `COLLAR_PINGS` created 16:33:07Z with PING_ID NUMBER(38,0) PK, ANIMAL_ID, WATERING_HOLE_ID NUMBER(38,0), PINGED_AT TIMESTAMP_TZ(9), LATITUDE and LONGITUDE NUMBER(9,6), BATTERY_PCT NUMBER(38,0) | As documented: new tables are not picked up by a pipeline without auto-replicate (docs/sources.md: artie-tables). See the gap below. |
| 05 | rename `name` to `display_name` | 16:24:06Z | no error | `ANIMALS` has both `NAME` and `DISPLAY_NAME`; 570 rows vs 578 | As documented (artie-schema-evolution: no renames; a rename is a column added plus a column no longer sent) |
| 06 | add `field_report jsonb`, then UPDATE 25 out-of-line rows without touching `notes` | 16:26:32Z | no error | `FIELD_REPORT VARIANT` appeared on `OBSERVATIONS`; 5835 rows vs 5933 (lag); `NOTES` unchanged in type and the table kept growing in bytes | PASS for the column. Whether the 25 rows kept their full `notes` cannot be confirmed from here: the MCP exposes columns and counts, not values. The native subscriber kept them byte for byte (docs/events-observed.md). |
| 07 | add `elevation_m int NOT NULL DEFAULT 0`, update 12 rows | 16:28:54Z | no error | `ELEVATION_M NUMBER(38,0)`, nullable, no default; 12 rows | PASS; the NOT NULL and the default do not travel, which the docs leave unsaid |
| 08 | drop `status` | 16:31:17Z | no error | `STATUS` still on `ANIMALS` (hard deletes for columns are off); 762 rows vs 782 (lag) | As documented (artie-schema-evolution) |

Final state after the writer stopped and the pipeline settled (16:35Z):

| table | source | destination |
| --- | ---: | ---: |
| watering_holes | 12 | 12 |
| animals | 788 | 788 |
| observations | 6915 | 6915 |
| collar_pings | 1420 | 1313 |

`pipeline_usage` for the run: 2937 animals rows, 11023 observations rows,
24 watering_holes rows and 1313 collar_pings rows processed (backfill plus
CDC), CDC latency 0.6 to 3.5 s once the first flush had landed.

### The gap on collar_pings

The 107 missing rows were written between the backfill snapshot of
`collar_pings` (16:33:10Z) and the end of the redeploy that added the table
(16:33:36Z). The reader that consumed that stretch of WAL did not have the
table in its configuration, so it advanced past those rows without forwarding
them, and the new reader started after them. Rows written before the
snapshot were covered by the backfill, rows written after the redeploy would
have streamed. So: add a table to the pipeline before writing to it, or run a
second backfill after the deploy finishes. The native subscriber has the same
shape of gap and closes it with `REFRESH PUBLICATION` (docs/events-observed.md
event 04). This is an observation on one run, not a documented behavior.

## Where Artie and the subscriber stand-in differ

| | subscriber stand-in | Artie (this run) |
| --- | --- | --- |
| schema changes | needs the DDL applied on its side, else it stops and retains WAL | new columns appear on the next flush; nothing to do |
| new table | `CREATE TABLE` plus `REFRESH PUBLICATION` by hand | added to the pipeline by hand (or by the scheduled auto-replicate), then backfilled |
| rename | both columns during catch-up, then the old one dropped by `apply.sh` | both columns stay; the old one is frozen |
| drop | column dropped after catch-up | column stays, frozen, unless hard deletes for columns is on |
| types | identical to the source | NUMBER(38,0), VARCHAR, NUMBER(p,s), TIMESTAMP_TZ(9), VARIANT; enums become VARCHAR; NOT NULL and defaults are not carried |
| extra columns | none | `__ARTIE_UPDATED_AT` on every table |
| lag | 1 to 3 s | 30 s flush interval; 0.6 to 3.5 s reported latency between flushes |
| verification here | `verify.py`, full checksum | columns and counts through the MCP only |

## Second run: a Postgres destination, with `verify.py` after every event

Run on 2026-10-21 from 19:59Z to 22:42Z. The point of this run was the one
thing the Snowflake run could not give: `verify.py` comparing rows, not the
MCP reporting columns and counts. Artie wrote into schema `artie` of the
source database itself, through the same tunnel, so `verify.py` could compare
`public` against `artie` on localhost with its full per-row checksum. This is
a verification trick, not a deployment pattern: the publication is
`FOR ALL TABLES`, so Artie's own destination tables are in the publication too
(see event 04 below).

Setup. One connector served as both source and destination: the saved
connector `21b175b9` (bore.pub:50365, role `artie_dest`), which the previous
session had created and which `connector_list` showed at 18:39Z even though
that `connector_create` call had been reported refused. The role was given
`REPLICATION`, `SELECT` on `public` and `CREATE` on the database, and owned
the empty schema `artie`. Source reader: `publishViaPartitionRoot: false`.
Pipeline: `dynamicallyCreateNamespaces: true`, flush interval 30 s (20 s from
21:27Z), `__artie_updated_at` on, soft deletes off. Each event was applied
with `SUB_DSN=none events/apply.sh N` 12 s into a 45 s burst of
`stream.py --rate 10`; once the writer stopped, `verify.py` ran with
`--wait` until the two sides matched or the wait ran out. The command, every
time (from `pg/`):

```
python3 verify.py --dest-type postgres \
  --dest postgresql://postgres:...@localhost:5432/terra --dest-schema artie \
  --allow-extra-columns --ignore-types --wait 180      # plus --exclude-columns animals.display_name from event 05 on
```

`--ignore-types` because Artie creates `timestamptz` columns as
`timestamp with time zone` precision 6 and `numeric(6,2)` as `numeric`;
`--allow-extra-columns` for `__artie_updated_at` and, later, the frozen
`name` and `status`. The checksum covers every column both sides share.

### After the backfill (pipeline `9205994f`, deployed 20:09Z)

```
21:01:56Z
table            src rows   dst rows  cols  status
animals               150        150     7  ok
observations         1430       1430     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 1 attempt(s))
```

### The eight events, with the `verify.py` output

| # | Event | Applied | `verify.py` | Seconds after the writer stopped |
| --- | --- | --- | --- | ---: |
| 01 | add column `weight_kg` | 21:02:44Z | PASS, 8 columns on `animals` | 51 |
| 02 | enum value `pangolin` | 21:04:26Z | PASS | 71 |
| 03 | `animal_id` int to bigint, row 3000000001 | 21:06:22Z | FAIL for 43 minutes, then PASS after a drop-and-backfill; the pipeline never streamed another wide id | see below |
| 04 | new table `collar_pings` | 21:49:55Z | FAIL (table missing) until auto-replicate added it at 21:54:31Z; `collar_pings` 85/85 PASS at 22:11Z; `animals` and `observations` still stuck from event 03 | see below |
| | second pipeline `bc4a360d`, created after event 03 | 22:13:30Z | PASS on all four tables, all `animal_id` columns `bigint` | backfill done 22:23Z |
| 05 | rename `name` to `display_name` | 22:23:31Z | PASS; `display_name` added, `name` kept and frozen | 144 (first flush of a new transfer) |
| 06 | `field_report jsonb`, 25 out-of-line rows updated | 22:36:53Z | PASS; all 249 long `notes` byte-identical | 19 |
| 07 | `elevation_m int NOT NULL DEFAULT 0` | 22:38:07Z | PASS; destination column nullable, no default | 28 |
| 08 | drop `status` | 22:39:28Z | PASS; `status` kept and frozen | 25 |

Events 01 and 02, as printed:

```
event 1: writer started 21:02:32Z, applied at 21:02:44Z, writer stopped 21:03:17Z
stream: stopped after 45 ticks  totals obs+272 obs~48 obs-38 animal+21 animal~71 ping+0
table            src rows   dst rows  cols  status
animals               171        171     8  ok
observations         1664       1664     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 21 attempt(s))        exit 0 at 21:04:08Z

event 2: applied at 21:04:26Z, writer stopped 21:04:59Z
table            src rows   dst rows  cols  status
animals               188        188     8  ok
observations         1900       1900     5  ok
watering_holes         12         12     6  ok
verify: PASS (3 tables match, 29 attempt(s))        exit 0 at 21:06:10Z
```

### Event 03 on a Postgres destination: the pipeline stops

Artie created `artie.animals.animal_id` and `artie.observations.animal_id`
as `integer` at backfill time (the source type then). After the event the
source inserted animal 3000000001, and from 21:09:06Z every flush of both
tables failed with the same error in `pipeline_error_logs`:

```
Failed to flush table: failed to merge for "artie.animals": ... failed to prepare temporary table:
failed to copy from rows: ERROR: COPY from stdin failed: unable to encode 3000000001 into binary
format for int4 (OID 23): 3000000001 is greater than maximum value for int4 (SQLSTATE 57014)
```

`verify.py --wait 180` at 21:06:56Z:

```
table            src rows   dst rows  cols  status
animals               208        188     8  checksum differs; rows 208 vs 188
observations         2125       1900     5  checksum differs; rows 2125 vs 1900
watering_holes         12         12     6  ok
verify: FAIL (2 of 3 tables differ, 73 attempt(s))  at 21:09:57Z
```

The destination counts froze at the event 02 numbers. What was tried, in
order, each followed by `verify.py --wait 240` or longer; the error kept
repeating every one to two minutes throughout:

| time | action | effect |
| --- | --- | --- |
| 21:10:41Z | `ALTER TABLE artie.animals ALTER COLUMN animal_id TYPE bigint` (and observations) by hand | none; same error at 21:11:48Z and after. Artie's temporary table still used int4 |
| 21:15:10Z | `pipeline_start` | nothing to deploy, `lastDeployedAt` unchanged |
| 21:20:48Z | `pipeline_update_status` "transfer paused", 21:21:01Z "running" | `lastDeployedAt` moved, but Artie's four sessions on the database (reader from 20:05Z, writer from 20:20Z) stayed connected; same error |
| 21:26:50Z | flush interval 30 to 20 s, `pipeline_start` 21:27:05Z | deploy recorded 21:26:58Z; sessions unchanged; same error |
| 21:32:54Z | `pg_terminate_backend` on all four sessions | reconnected within 9 s; same error at 21:35:45Z |
| 21:37:10Z | `pipeline_backfill_tables`, `beforeBackfill: drop_table`, both tables | queued for 12 minutes; tables dropped and recreated with `bigint`; `verify.py` PASS at 21:49:30Z (208/2125/12, 1 attempt) |

Then, during event 04, the writer inserted animals 3000000002 onward and the
error returned at 22:08:31Z with `3000000008`, `3000000007`, `3000000006`:
the backfill path wrote the wide ids, the CDC path still encoded the column
as int4. Nothing else was flushed to those two tables for the rest of that
pipeline's life. A pipeline created after the event (`bc4a360d`, 22:13Z)
captured `bigint` and streamed 106 wide animals and 152 observations
referencing them without an error. So on a Postgres destination the widening
is a re-sync event: drop and backfill, or a new pipeline, not an `ALTER` on
the destination. docs/events-expected.md said this case was undocumented;
this is what it does.

### Event 04: auto-replicate, and what it picks up in the same database

`autoReplicateNewTables` was on. The table created at 21:49:55Z was not in
the pipeline at 21:53:31Z (`verify.py`: `collar_pings  85  -  missing on
destination`). `pipeline_detect_schema_changes` at 21:54:12Z returned
`success`; at 21:54:31Z the pipeline gained four tables: `public.collar_pings`,
and `artie.animals`, `artie.observations`, `artie.watering_holes` with
destination names `artie_animals` and so on, because Artie's own destination
tables are in the `FOR ALL TABLES` publication of this same database. They
were removed with `pipeline_update` at 22:00:03Z (auto-replicate off from
then), deployed 22:00:12Z; the new reader and transfer connected at 22:06:01Z.
`verify.py` at 22:11:52Z:

```
table            src rows   dst rows  cols  status
animals               226        208     8  checksum differs; rows 226 vs 208
collar_pings           85         85     7  ok
observations         2293       2125     5  checksum differs; rows 2293 vs 2125
watering_holes         12         12     6  ok
verify: FAIL (2 of 4 tables differ, 115 attempt(s))
```

The new table matched; the two from event 03 were stuck as described. When
Artie recreated `artie.animals` during the drop-and-backfill it also created
an enum type `artie.animal_species` (16 labels) in the destination schema,
while the recreated column kept using `public.animal_species`. `stream.py`
counted enum labels by type name without a schema and printed "32 species";
it now filters on the `public` namespace.

### The second pipeline and events 05 to 08

Pipeline `9205994f` deleted 22:12:46Z, Artie's slot dropped, schema `artie`
dropped and recreated empty. Pipeline `bc4a360d` created 22:13:00Z from the
same connector with the four tables, flush 20 s, auto-replicate off; started
22:13:30Z. The reader logged `replication slot "artie" is active for PID
63036` three times between 22:22:58Z and 22:23:19Z (two reader instances
during the rollout) and was streaming at 22:23:44Z. Backfill snapshot
22:23:07Z, tables `streaming` 22:26:03Z, deploy finished 22:26:27Z.

```
second pipeline bc4a360d: four destination tables present at 22:23:08Z
table            src rows   dst rows  cols  status
animals               226        226     8  ok
collar_pings           85         85     7  ok
observations         2293       2293     5  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 1 attempt(s))         22:23:09Z
artie.animals|bigint   artie.collar_pings|bigint   artie.observations|bigint
```

Event 05 (applied 22:23:31Z): two `--wait 300` runs found nothing flushed,
because the transfer made its first destination connection only at
22:36:02Z, ten minutes after the deploy finished. Third run:

```
table            src rows   dst rows  cols  status
animals               244        244     8  ok (excluded from checksum: display_name; extra on destination: name)
collar_pings          176        176     7  ok
observations         2425       2425     5  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 79 attempt(s))        22:36:28Z
```

Events 06, 07, 08, each a PASS within 30 s of the writer stopping:

```
event 6: applied at 22:36:53Z, writer stopped 22:37:27Z
table            src rows   dst rows  cols  status
animals               268        268     8  ok (excluded from checksum: display_name; extra on destination: name)
collar_pings          266        266     7  ok
observations         2559       2559     6  ok
watering_holes         12         12     6  ok
verify: PASS (4 tables match, 8 attempt(s))         exit 0 at 22:37:46Z
long_notes 249, same_md5 249, with_report 182, same_report 182   (public vs artie, joined on observation_id)

event 7: applied at 22:38:07Z, writer stopped 22:38:40Z
table            src rows   dst rows  cols  status
animals               289        289     8  ok (excluded from checksum: display_name; extra on destination: name)
collar_pings          366        366     7  ok
observations         2715       2715     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 11 attempt(s))        exit 0 at 22:39:08Z
artie.elevation_m  integer  nullable, no default     public.elevation_m  integer  NOT NULL DEFAULT 0

event 8: applied at 22:39:28Z, writer stopped 22:40:01Z
table            src rows   dst rows  cols  status
animals               313        313     7  ok (excluded from checksum: display_name; extra on destination: name, status)
collar_pings          456        456     7  ok
observations         2854       2854     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 10 attempt(s))        exit 0 at 22:40:26Z
artie.animals:  animal_id, name, species, home_watering_hole_id, status, created_at, updated_at, weight_kg, __artie_updated_at, display_name
public.animals: animal_id, display_name, species, home_watering_hole_id, created_at, updated_at, weight_kg
```

Final state at 22:40:52Z: 106 animals above the int4 range on both sides,
152 destination observations referencing them, `display_name` filled on 199
of 313 destination rows (the rows touched since the rename), slot lag 111 kB.
`pipeline_usage` for `bc4a360d` (22:13Z to 22:41Z): animals 540 rows,
collar_pings 456, observations 3443, watering_holes 25, latency about 41 s.
Its error log held only the three slot-conflict lines from the rollout.

What this run adds to the Snowflake run's table in pg/README.md: the checksum
holds for every event that Artie handles, the TOAST case holds on Artie
(249 of 249), and event 03 is a stop on a Postgres destination. Lag on the
Postgres destination: with a 20 s flush interval, a match 19 to 51 s after
the writer stopped; a freshly deployed transfer took 6 to 10 minutes before
its first flush, both times.

Cleanup: `pipeline_delete bc4a360d` and `connector_delete 21b175b9` at
22:41Z; Artie's sessions terminated and the `artie` slot dropped at 22:42:12Z
(`pg_replication_slots` empty); tunnel closed and `docker compose down -v` at
22:42:14Z. `connector_list` afterwards shows no terra connector of any kind.

## MCP calls that created or deleted something (UTC, 2026-10-21)

| time | tool | object |
| --- | --- | --- |
| 04:52:05 | `connector_create` | source connector `c28f50be-8e11-4dd2-9987-0690de5ba806` (bore.pub:13675) |
| 04:52:28 | `pipeline_create_from_source` | pipeline `db27235b-0401-4f6d-ad32-4e0d53910ac8` (draft) |
| 04:53:33 | `pipeline_update` | destination, tables, settings |
| 04:54:16 | `source_reader_update` | `publishViaPartitionRoot: false` |
| 04:54:28 | `pipeline_update` | `dynamicallyCreateNamespaces: true` |
| 04:54:40 | `pipeline_start` | first deploy (backfill later failed: relay) |
| 15:54:05 | `connector_create` | second source connector `9de77e08-c57a-413a-b162-cc94a6796a93` (bore.pub:50365); the call with the old uuid created a new one |
| 15:54:29 | `source_reader_update` | reader re-pointed at the second connector |
| 15:54:49 | `pipeline_start` | redeploy |
| 16:03:10 | `pipeline_cancel_backfill_tables` | the three stuck backfills |
| 16:03:22 | `pipeline_backfill_tables` | the three tables |
| 16:23:50 | `pipeline_update` | `collar_pings` added |
| 16:24:06 | `pipeline_start` | redeploy with the fourth table |
| 16:37:53 | `pipeline_delete` | pipeline `db27235b-...` |
| 16:38:04 | `connector_delete` | `9de77e08-...` and `c28f50be-...` |
| 16:40:23 | psql on the source | Artie's `artie` slot terminated and dropped; `pg_replication_slots` empty |
| 16:40:23 | shell | bore tunnel closed; 16:41 `docker compose down -v` |
| 16:57:18 | `connector_create` | destination connector `21b175b9-cb4c-4d96-96a4-d7cce91bde81` (bore.pub:50365, role `artie_dest`); the call was reported refused but had completed, found by `connector_list` at 18:39 |
| 18:43:12 | `pipeline_create_from_source` | pipeline `9205994f-bac0-4e85-a7cd-2222164d17a2` from connector `21b175b9` (draft) |
| 18:43:42 | `pipeline_update` | destination `21b175b9`, schema `artie`, three tables, auto-replicate on |
| 18:44:02 | `source_reader_update` | `publishViaPartitionRoot: false` |
| 19:59:45 | `pipeline_start` | deploy; backfill done 20:08:58 |
| 21:15:10 | `pipeline_start` | no-op (nothing undeployed) |
| 21:20:48 | `pipeline_update_status` | transfer paused; 21:21:01 running |
| 21:26:50 | `pipeline_update` | flush interval 20 s; 21:27:05 `pipeline_start` |
| 21:37:10 | `pipeline_backfill_tables` | `animals`, `observations`, `drop_table` |
| 21:54:12 | `pipeline_detect_schema_changes` | success; auto-replicate added four tables at 21:54:31 |
| 22:00:03 | `pipeline_update` | the three `artie.*` tables removed, auto-replicate off; 22:00:12 `pipeline_start` |
| 22:12:46 | `pipeline_delete` | pipeline `9205994f-...` |
| 22:12:59 | psql on the source | Artie's `artie` slot dropped; schema `artie` dropped and recreated |
| 22:13:00 | `pipeline_create_from_source` | pipeline `bc4a360d-dea4-4f73-917d-9b60cdc383f0` from connector `21b175b9` |
| 22:13:23 | `pipeline_update` | destination `21b175b9`, four tables, flush 20 s; 22:13:24 `source_reader_update`; 22:13:30 `pipeline_start` |
| 22:41:05 | `pipeline_delete` | pipeline `bc4a360d-...` |
| 22:41:05 | `connector_delete` | `21b175b9-...` |
| 22:42:12 | psql on the source | Artie's `artie` slot dropped; `pg_replication_slots` empty |
| 22:42:14 | shell | bore tunnel closed; `docker compose down -v` |

Second session of attempts, 16:53Z to 16:56Z, trying to give `verify.py` a
Postgres destination it can read (Artie writing into schema `artie` of the
source database through the same tunnel): `unsaved_connector_ping`
(destination role) succeeded; `connector_create` for the source made
`6f384500-8c3c-4935-95c3-64e9274f8b15` at 16:54:23Z;
`pipeline_create_from_source` made `fa91e8c6-f5af-4f5c-9f8b-d2972d954ea1` at
16:54:45Z; `connector_create` for the destination was reported refused by the
session's permission classifier, but the call had completed server-side
(connector `21b175b9`, 16:57:18Z, found later). The pipeline and the source
connector were deleted at 16:55Z (`pipeline_delete`, `connector_delete`),
the tunnel closed, the stack destroyed; `pg_replication_slots` was empty
throughout (no reader ran). That surviving connector is what the second run
above used as both source and destination.

Not deleted: the Snowflake schema `WILLIAM_TEST.TERRA_V01_TMP` and its eight
tables (four data, four `___ARTIE_` staging). The MCP has no tool to drop a
destination schema; it holds about 600 kB of synthetic data and can be dropped
by anyone with the Snowflake partner account.
