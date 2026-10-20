-- Event 05: The naming committee
-- DDL: ALTER TABLE animals RENAME COLUMN name TO display_name
--
-- Postgres: a rename has no effect on stored data (docs/sources.md:
-- pg-altertable) and is not replicated. Logical replication matches columns by
-- name (docs/sources.md: pg-lr-subscription), so the first row sent after the
-- rename carries display_name and the subscriber's apply worker fails with
-- "missing replicated column" until the subscriber table is renamed too. The
-- worker keeps retrying the same transaction, so nothing is lost
-- (docs/sources.md: pg-lr-conflicts).
--
-- Artie (documented): the reconciliation job does not rename columns
-- (docs/sources.md: artie-schema-evolution). What the normal sync does with a
-- renamed column is not documented. The schema-change notification lists it as
-- a column removed plus a column added (docs/sources.md: artie-schema-changes).
--
-- Destination after: expect to see both name and display_name; name stops
-- receiving values and display_name is populated from the next DML on. Dropping
-- the old column requires "Enable hard deletes for columns" and a 4 hour
-- verification window (docs/sources.md: artie-schema-evolution).

ALTER TABLE animals RENAME COLUMN name TO display_name;

UPDATE animals SET updated_at = now() WHERE animal_id <= 5;
