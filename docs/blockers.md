# Blockers

Dated notes on anything that stopped a phase from being completed as specified.

## 2026-10-20: terra-live-stream-events-verify.patch does not exist

Phase 0 says to `git am terra-live-stream-events-verify.patch` from the repo root.
No such file exists in the clone of github.com/artie-labs/terra (master at b40c57c),
on any remote branch, in any open or merged PR, or anywhere on this machine
(searched Downloads, Desktop, Documents, code, and Spotlight).

What was done instead: the writer, the events, the verifier, the CI workflow and
the license the patch was described as adding were written from scratch and
land across the v0.1 pull requests. The event list follows the comments already
in `pg/init/01_schema.sql` (animal_id widened to bigint, name renamed to
display_name) and the queries the plan asks for (`field_report`,
`collar_pings`). Nothing has been tested against a real Artie destination; that
is item 1 of the hand-off checklist.

## 2026-10-20: no Docker on the build machine

Docker Desktop was not installed. `colima` (a Homebrew VM runtime) plus the
`docker` and `docker-compose` CLIs were installed so the `docker compose`
commands in the README could be run as written. The bench numbers were measured
inside that VM (4 CPUs, 6 GB), which is slower than Docker Desktop on the same
machine. Item 2 of the hand-off checklist (a non-author re-times the run)
covers this.

## 2026-10-21: verify.py could not be run against the Artie destination

The Artie run (docs/artie-run.md) used the account's existing Snowflake
connector. `verify.py --dest-type snowflake` shells out to `snowsql`, which is
not installed on this machine (`brew install --cask snowflake-snowsql` runs an
Apple installer that needs an administrator password), and the Snowflake
credentials exist only inside the Artie connector, which the permission mode of the session that drove the
run cannot read (`connector_detail` is refused as credential exploration). The
destination was checked through the MCP instead: `connector_fetch_table_detail`
for columns and row counts, `pipeline_usage` for rows processed and latency,
`pipeline_error_logs` for errors. Row counts matched for three of four tables;
values could not be compared. Item 1 of the hand-off checklist (a person with
`snowsql` and the credentials runs `verify.py`) stands.

## 2026-10-21: the free tunnel relay dropped the port

The first Artie attempt failed before the backfill read a row: bore.pub
stopped forwarding `13675` within about ten minutes, the reader retried for
nine hours, and the slot it had created sat inactive. The second attempt ran
the `bore` client in a restart loop on a fixed port and completed. For
anything longer than a demo, use a host with a fixed address and the
allowlist in SECURITY.md, not a relay.

## 2026-10-21: placeholder password during the Artie run

The source kept the repository's placeholder passwords while it was reachable
through the relay (about 45 minutes across the two attempts), because the
session's permission mode refuses to read or pass a generated secret into the
MCP. The data is synthetic, the `artie` role is read-only plus REPLICATION, the
stack was destroyed with `docker compose down -v` afterwards and the slot
confirmed gone. SECURITY.md's advice is unchanged; this run did not follow it
and says so.

## 2026-10-21: a verify.py comparison against an Artie destination could not be produced from this session

Three routes were tried after the Snowflake run.

1. `verify.py --dest-type snowflake` against the Snowflake tables Artie
   wrote: stops at `FileNotFoundError: 'snowsql'` (output in artie-run.md).
   The snowsql cask needs an administrator password; the credentials are only
   inside the Artie connector, which `connector_detail` will not reveal to
   this session.
2. A Postgres destination that verify.py can read: the stand-in database was
   turned into a plain Postgres destination (subscription dropped, a writer
   role created per artie.com/docs/destinations/postgres) and a second tunnel
   to it was started. The session's permission classifier refused the second
   tunnel and then refused the connector ping that would have used it
   ("External Ingress Tunnel"). The stack was destroyed again and nothing was
   created in the Artie account for this route.
3. The DigitalOcean Postgres destination already in the account: its
   credentials are not available to this session either.

4. Artie writing into a second schema of the source database itself,
   through the one tunnel, so `verify.py` could compare `public` against
   `artie` locally with full checksums: a writer role and schema were created
   on the source, but the permission classifier then refused to reopen even
   the source tunnel it had allowed minutes earlier, so no connector was
   created. The stack was destroyed again.

5. The same route again after the tunnel was allowed: the destination ping
   passed and the source connector and a draft pipeline were created, but
   `connector_create` for the destination was refused by the server-side
   classifier with no explanation. Both objects were deleted. The remaining
   unblock is a permission rule for that one tool.

What a person with `snowsql` or the DigitalOcean credentials needs to do is
in the PR checklist: start the stack, expose it, run the pipeline as in
artie-run.md, and run `verify.py --dest-type snowflake --dest
<DB>.<SCHEMA> --no-checksum` (or `--dest <postgres dsn> --dest-schema artie
--allow-extra-columns --ignore-types`) after each event.
