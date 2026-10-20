# Blockers

Dated notes on anything that stopped a phase from being completed as specified.

## 2026-10-20: terra-live-stream-events-verify.patch does not exist

Phase 0 says to `git am terra-live-stream-events-verify.patch` from the repo root.
No such file exists in the clone of github.com/artie-labs/terra (master at b40c57c),
on any remote branch, in any open or merged PR, or anywhere on this machine
(searched Downloads, Desktop, Documents, code, and Spotlight).

What was done instead: the files the patch was described as adding were written
from scratch on branch `feat/live-stream-events-verify`:

- `pg/stream.py` (continuous deterministic writer)
- `pg/events/01..08_*.sql` and `pg/events/apply.sh`
- `pg/verify.py` (source vs destination comparison, `--wait`)
- `.github/workflows/pg.yml`
- `LICENSE` (Apache-2.0)

The event list was chosen to match the comments already in `pg/init/01_schema.sql`
(animal_id widened to bigint, name renamed to display_name) and the queries the
goal asks for (`field_report`, `collar_pings`). Nothing was tested against a real
Artie destination; that remains item 1 of the hand-off checklist.

## 2026-10-20: no Docker on the build machine

Docker Desktop was not installed. `colima` (a Homebrew VM runtime) plus the
`docker` and `docker-compose` CLIs were installed with Homebrew so the
`docker compose` commands in the README could be run as written. Bench numbers
in `pg/bench.txt` were measured inside that VM (4 CPUs, 6 GB), which is slower
than Docker Desktop on the same machine. Item 2 of the hand-off checklist (a
non-author re-times the run) covers this.
