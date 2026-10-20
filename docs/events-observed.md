# Events: what the subscriber actually did

Observed on 2026-10-20 against the Postgres 16 subscriber stand-in defined in
`pg/docker-compose.yml` (service `subscriber`, subscription `terra_sub`), with
`stream.py --rate 10` running the whole time and `verify.py --wait 120` after
each event. Two runs are reported: the supported path, where
`events/apply.sh` applies the matching DDL from `events/subscriber/` on the
subscriber, and a deliberate run with no subscriber DDL at all.

The stand-in is native logical replication, not a CDC pipeline. It copies rows,
not schema (docs/sources.md: pg-lr-restrictions). Nothing here is a claim about
what Artie does; see [events-expected.md](events-expected.md) for that.

## Run A: with events/subscriber/ applied (the path CI runs)

Every event ended with `verify: PASS`. Columns, types, row counts and a
per-table checksum matched the source after each step, and the subscriber
logged no errors at all. Each subscriber file is split into sections that
`apply.sh` runs before the source event, right after it, and after the
subscriber has caught up (see "Why the subscriber migrates in two steps").

| # | Event | Subscriber DDL | What the subscriber did | verify |
| --- | --- | --- | --- | --- |
| 01 | Weigh-in | before: add column | No errors. The column was added on the subscriber first, so the first row carrying `weight_kg` fit. | PASS on attempt 2 (about 2 s of lag) |
| 02 | A pangolin is sighted | before: add enum label | No errors. The enum label existed on the subscriber before animal 900001 arrived. | PASS on attempt 2 |
| 03 | The herd outgrows int | before: widen both columns | No errors. Both tables were widened on the subscriber first; animal 3000000001 and observation 9000000001 arrived as text and fit. The rewrite on the publisher produced no replicated changes. | PASS on attempt 1 |
| 04 | The collars come online | before: create table; after: `REFRESH PUBLICATION` | No errors. With the table already present but not yet subscribed, the apply worker skipped its rows instead of failing; the refresh then started a synchronization worker that copied the existing rows and caught up. In an earlier version that created the table only after the publisher, the worker failed twice with `relation "public.collar_pings" does not exist` and recovered 5 s later. | PASS on attempt 3 |
| 05 | The naming committee | before: add `display_name`, make `name` nullable; after catch-up: copy values, drop `name` | No errors. Rows written before the rename (carrying `name`) and after it (carrying `display_name`) both fit while the two columns coexisted. After catch-up the subscriber copied `name` into `display_name` for the untouched rows and dropped `name`. | PASS on attempt 2 |
| 06 | Rangers file structured reports | before: add column | No errors. The jsonb text form converted back to jsonb on the subscriber; the checksum, which compares `jsonb::text`, matched. | PASS on attempt 1 |
| 07 | Survey adds elevation | before: add column with default | No errors. Only the 12 UPDATEd rows were sent; the backfill of 0s was a catalog change on both sides and nothing crossed the wire for it. | PASS on attempt 1 |
| 08 | Status moves to the collars | before: make `status` nullable; after catch-up: drop it | No errors. Rows written after the drop omit `status` and land with NULL; after catch-up the column is dropped. One `stream.py` batch can fail on the publisher (`column "status" of relation "animals" does not exist`) when the drop lands inside a tick; it resyncs and continues. | PASS on attempt 1 |

Final state after run A, stream stopped: 4 tables, all matching.

```
table            src rows   dst rows  cols  status
animals               175        175     7  ok
collar_pings           49         49     7  ok
observations         1655       1655     6  ok
watering_holes         12         12     7  ok
verify: PASS (4 tables match, 1 attempt(s))
```

`queries.sql` ran on both the source and the subscriber at the end and
returned the same 12, 6 and 10 rows.

### What the subscriber did that a CDC tool would not

- It needed the DDL typed in by hand on its side for every event. That is the
  whole content of `events/subscriber/`, and it is the difference the events
  teach: a replica receives rows, a pipeline has to infer the schema from them.
- Event 04: a subscription does not notice a new table until someone runs
  `REFRESH PUBLICATION`, even though the publication is FOR ALL TABLES
  (docs/sources.md: pg-altersubscription, pg-createpublication).
- Event 08: after the drop, the subscriber's `animals` has one column fewer. A
  destination that keeps dropped columns would still show `status`, frozen
  (docs/sources.md: artie-schema-evolution describes that behavior for Artie).

### Why the subscriber migrates in two steps

Logical replication decodes each transaction with the catalog as it was when
that transaction ran, and matches columns by name (docs/sources.md:
pg-lr-subscription). So after a rename on the publisher, transactions that
committed before the rename still arrive carrying `name`, and transactions
after it carry `display_name`. A subscriber that renames at the same moment
as the publisher rejects whichever kind is still in flight, and because
conflicts stop replication until resolved (docs/sources.md:
pg-lr-conflicts), it never recovers on its own.

This was reproduced on 2026-10-20 (run C below). The fix in
`events/subscriber/05_rename_name_column.sql` and `08_drop_status_column.sql`
is the expand/contract pattern: before the publisher changes, make the
subscriber accept both shapes (add `display_name`, make `name` nullable; make
`status` nullable). After the publisher changes, `apply.sh` waits until the
subscriber has applied every transaction that committed before the event
(it records the publisher's LSN, commits a marker row, and polls
`pg_replication_origin_status.remote_lsn`), and only then contracts (copy
`name` into `display_name`, drop `name`; drop `status`).

## Run C: the stall, reproduced

Same stack, `stream.py --rate 20`. The subscription was disabled for 4 s so
about 80 transactions carrying `name` queued on the publisher. Event 05 was
then applied to the publisher, the old one-step subscriber rename was applied,
and the subscription re-enabled.

```
ERROR:  logical replication target relation "public.animals" is missing replicated column: "name"
```

The apply worker hit that on the first queued transaction, exited, restarted 5 s
later and hit it again, indefinitely. 25 s later `verify` reported `animals`
at 178 rows on the source and 152 on the subscriber, the slot was inactive and
retaining 654 kB. With the two-step files and the catch-up wait, the same
experiment (subscription re-enabled while `apply.sh` was waiting) ended with
zero errors and `verify: PASS`. `events/apply.sh all` with the writer at 40
ops/s also passed with zero subscriber errors; the catch-up waits took under a
second each because the subscriber was already current.

## Run B: no subscriber DDL at all

Same sequence with `SUB_DSN=none events/apply.sh N`, so only the publisher
changed. This is what happens if someone runs the events against a plain
replica and never touches it.

| # | Observed |
| --- | --- |
| 01 | The first row after the ALTER failed on the subscriber: `missing replicated column: "weight_kg"`. The apply worker exited and restarted every 5 seconds, failing on the same transaction each time (51 times by the end of the run). Nothing after that transaction was applied, for any table. `verify` reported `destination lacks weight_kg; checksum differs; rows 167 vs 152`. |
| 02 to 08 | Never reached the subscriber. The worker was still stuck on the event 01 transaction, so no enum error, no missing `collar_pings` error, no `display_name` error appeared in the log. `verify` showed the gap widening: by event 08 `animals` was at 280 rows on the source and 152 on the subscriber, `collar_pings` was missing, and every type and column difference was listed. |
| slot | The publisher's `terra_sub` slot was inactive and retaining 2209 kB of WAL after about four minutes at 10 writes/s. It grows without bound until the subscriber is fixed or the slot is dropped (docs/sources.md: pg-lr-conflicts; the same failure mode for a pipeline is described in artie-postgres-troubleshooting). |

Why it stalls rather than skips: logical replication applies transactions in
order and treats data that does not fit the subscriber's table as a conflict,
which "will stop the replication; it must be resolved manually by the user"
(docs/sources.md: pg-lr-conflicts). The fix is either the matching DDL
(`events/subscriber/01_add_weight_column.sql`) or skipping the transaction
with `ALTER SUBSCRIPTION ... SKIP`, which loses the rows in it.

## Things that looked wrong and are not

- `verify` needing 2 or 3 attempts: `--wait` polls every 2 s and the subscriber
  is usually a second or two behind a writer at 10 ops/s. One attempt means it
  had already caught up.
- `stream.py` printing one failed tick during event 08: it reads the schema at
  the start of each tick, and the drop landed inside one. It resynced its
  counters and the next tick succeeded. No row was lost; the failed batch was
  never committed.
- `collar_pings.ping_id` is a `bigserial` on the source and a plain `bigint` on
  the subscriber: sequences are not replicated (docs/sources.md:
  pg-lr-restrictions), so there is nothing for the subscriber to keep in sync.
  `verify` compares `information_schema.data_type`, which is `bigint` for both.
