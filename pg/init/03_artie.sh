#!/usr/bin/env bash
# 03_artie.sh: service account + publication for Artie.
# Runs last (after schema in 01 and data in 02_seed.sql), once, on a fresh volume.
#
# The artie password comes from TERRA_ARTIE_PASSWORD, the same variable the
# subscriber service uses to connect, so it is set in one place:
#   TERRA_ARTIE_PASSWORD=... docker compose up -d --wait
# CHANGE IT before you expose this database to the internet. It is the
# password you paste into Artie's "service account" field.
set -euo pipefail
pw=${TERRA_ARTIE_PASSWORD:-change-me-to-a-long-random-string}
pw=${pw//\'/\'\'}   # SQL literal: double any single quote
psql -v ON_ERROR_STOP=1 -U postgres -d terra <<SQL
CREATE ROLE artie WITH LOGIN REPLICATION PASSWORD '${pw}';

-- Least privilege: connect + read. REPLICATION (set above) lets Artie open a
-- logical replication connection and manage its own slot.
GRANT CONNECT ON DATABASE terra TO artie;
GRANT USAGE ON SCHEMA public TO artie;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO artie;
-- New tables added later (collar_pings in event 04) are readable too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO artie;

-- Artie's happy path: one publication covering every table, including tables
-- created later. Artie provisions its own replication slot when you create
-- the pipeline, so none is created here.
CREATE PUBLICATION dbz_publication FOR ALL TABLES;

-- Optional heartbeat table (see README "Keeping the slot healthy"). Uncomment
-- if your source database sits idle for long stretches.
-- CREATE TABLE test_heartbeat_table (id text PRIMARY KEY, ts timestamp);
-- GRANT SELECT, UPDATE ON TABLE test_heartbeat_table TO artie;
-- INSERT INTO test_heartbeat_table (id, ts) VALUES ('1', now());
SQL
