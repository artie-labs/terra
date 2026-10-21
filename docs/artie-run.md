# Artie run

Proof of v0.1 against a real Artie pipeline, driven through the Artie MCP
server from this machine. Every MCP call that created or deleted something in
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

Second session of attempts, 16:53Z to 16:56Z, trying to give `verify.py` a
Postgres destination it can read (Artie writing into schema `artie` of the
source database through the same tunnel): `unsaved_connector_ping`
(destination role) succeeded; `connector_create` for the source made
`6f384500-8c3c-4935-95c3-64e9274f8b15` at 16:54:23Z;
`pipeline_create_from_source` made `fa91e8c6-f5af-4f5c-9f8b-d2972d954ea1` at
16:54:45Z; `connector_create` for the destination was refused by the
session's permission classifier. Both objects were deleted at 16:55Z
(`pipeline_delete`, `connector_delete`), the tunnel closed, the stack
destroyed; `pg_replication_slots` was empty throughout (no reader ran).

Not deleted: the Snowflake schema `WILLIAM_TEST.TERRA_V01_TMP` and its eight
tables (four data, four `___ARTIE_` staging). The MCP has no tool to drop a
destination schema; it holds about 600 kB of synthetic data and can be dropped
by anyone with the Snowflake partner account.
