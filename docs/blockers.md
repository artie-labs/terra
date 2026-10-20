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
