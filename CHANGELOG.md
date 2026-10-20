# Changelog

## v0.1.0 (unreleased)

First release of the Postgres dataset as a runnable demo rather than a seed.

- `pg/stream.py`: continuous, deterministic writer that adapts to the live schema.
- `pg/events/01..08`: eight schema events with per-event notes on what Postgres emits, what Artie documents, and what the destination should look like. `apply.sh` applies them to the source and the subscriber.
- `pg/docker-compose.yml`: a second Postgres 16 that subscribes to `dbz_publication`, so the demo runs with no account. The subscriber port is bound to 127.0.0.1 only. Volumes take the Compose project name as prefix; with `-p terra` that is `terra_terra_pgdata`, the same name earlier versions pinned. A volume from before this version is not usable as is: it has the old starting schema and the subscriber's initial copy cannot match it, and the subscriber reports unhealthy. Run `docker compose -p terra down -v` once before the first start.
- `pg/verify.py`: source vs destination comparison with `--wait`; Postgres destinations get a per-row checksum, Snowflake and BigQuery modes exist but are unproven.
- `pg/bench.sh` and `pg/bench.txt`: measured time from nothing to a verified replica; the README reads its number from the file.
- `pg/queries.sql`: baseline query plus two that only work after the events.
- `docs/`: primary sources with dates and quotes, expected vs observed behavior per event, the final run, blockers.
- `site/`: artie.world v0, one index page and one dataset page, built from `datasets.json` with stdlib Python.
- `.github/workflows/pg.yml` runs seed, subscribe, stream, all eight events and verify on every change to `pg/`. `site.yml` publishes the site to GitHub Pages.
- `LICENSE` (Apache-2.0), `CITATION.cff`, `SECURITY.md`.
