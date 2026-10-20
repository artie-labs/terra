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
per-table checksum matched the source after each step. Two events made the
apply worker fail and retry; the rest were silent.

| # | Event | Subscriber DDL order | What the subscriber did | verify |
| --- | --- | --- | --- | --- |
| 01 | Weigh-in | before publisher | No errors. The column was added on the subscriber first, so the first row carrying `weight_kg` fit. | PASS on attempt 2 (about 2 s of lag) |
| 02 | A pangolin is sighted | before publisher | No errors. The enum label existed on the subscriber before animal 900001 arrived. | PASS on attempt 2 |
| 03 | The herd outgrows int | before publisher | No errors. Both tables were widened on the subscriber first; animal 3000000001 and observation 9000000001 arrived as text and fit. The rewrite on the publisher produced no replicated changes. | PASS on attempt 1 |
| 04 | The collars come online | after publisher | Broke, then recovered. The event's first INSERT reached the subscriber before the table existed there: `ERROR: logical replication target relation "public.collar_pings" does not exist`, twice, and the apply worker exited each time. Retained WAL on the publisher slot rose to 6080 bytes. After `CREATE TABLE` plus `ALTER SUBSCRIPTION terra_sub REFRESH PUBLICATION` a table synchronization worker started, copied the existing rows, and the apply worker caught up within 5 s (the worker restart interval). | PASS on attempt 3 |
| 05 | The naming committee | after publisher | Broke, then recovered. The event's UPDATE arrived with `display_name`: `ERROR: logical replication target relation "public.animals" is missing replicated column: "display_name"`, once. The subscriber rename ran within a second of the publisher rename, and the retried transaction applied. | PASS on attempt 2 |
| 06 | Rangers file structured reports | before publisher | No errors. The jsonb text form converted back to jsonb on the subscriber; the checksum, which compares `jsonb::text`, matched. | PASS on attempt 1 |
| 07 | Survey adds elevation | before publisher | No errors. Only the 12 UPDATEd rows were sent; the backfill of 0s was a catalog change on both sides and nothing crossed the wire for it. | PASS on attempt 1 |
| 08 | Status moves to the collars | after publisher | No subscriber errors in this run: the drop on both sides happened within the same second and no INSERT into `animals` landed in the window. One `stream.py` batch failed on the publisher instead (`column "status" of relation "animals" does not exist`) because it had read the schema a moment before the drop; it resynced and continued. | PASS on attempt 1 |

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
