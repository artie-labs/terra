-- Event 06: Rangers file structured reports
-- DDL: ALTER TABLE observations ADD COLUMN field_report jsonb
--
-- Postgres: a nullable jsonb column, catalog-only, not replicated
-- (docs/sources.md: pg-altertable, pg-lr-restrictions). Logical replication
-- sends the text form, which the subscriber parses back into jsonb.
--
-- Artie (documented): JSON objects are kept exactly as they appear in the source
-- with no flattening (docs/sources.md: artie-typing). The column appears on the
-- next DML (docs/sources.md: artie-postgres).
--
-- Destination after: observations has field_report. The rows updated below and
-- every observation stream.py inserts from now on carry a JSON object with
-- ranger, weather, group_size and verified keys. Older rows are NULL.

ALTER TABLE observations ADD COLUMN IF NOT EXISTS field_report jsonb;

UPDATE observations
   SET field_report = jsonb_build_object(
         'ranger', 'A.M.', 'weather', 'clear', 'group_size', 3, 'verified', true)
 WHERE observation_id IN (SELECT observation_id FROM observations ORDER BY observation_id LIMIT 25);
