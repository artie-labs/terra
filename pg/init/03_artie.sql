-- 03_artie.sql — service account + publication for Artie.
-- Runs last (after schema in 01 and data in 02_seed.sql).
--
-- CHANGE THE PASSWORD BELOW before you expose this to the internet.
-- This is the password you'll paste into Artie's "service account" field.

CREATE ROLE artie WITH LOGIN REPLICATION PASSWORD 'change-me-to-a-long-random-string';

-- Least privilege: connect + read. REPLICATION (set above) lets Artie open a
-- logical replication connection and manage its own slot.
GRANT CONNECT ON DATABASE terra TO artie;
GRANT USAGE ON SCHEMA public TO artie;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO artie;
-- New tables added later (none in this demo, but harmless) are readable too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO artie;

-- Artie's happy path: one publication covering every table. On this 3-table
-- demo that's identical to naming them explicitly. Artie provisions its own
-- replication slot when you create the pipeline, so we don't create one here.
CREATE PUBLICATION dbz_publication FOR ALL TABLES;

-- Optional heartbeat table (see README "Keeping the slot healthy"). Uncomment
-- if your source database sits idle for long stretches.
-- CREATE TABLE test_heartbeat_table (id text PRIMARY KEY, ts timestamp);
-- GRANT SELECT, UPDATE ON TABLE test_heartbeat_table TO artie;
-- INSERT INTO test_heartbeat_table (id, ts) VALUES ('1', now());
