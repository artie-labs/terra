-- Event 06: Rangers file structured reports
-- DDL: ALTER TABLE observations ADD COLUMN field_report jsonb
--
-- Postgres: a nullable jsonb column, catalog-only, not replicated
-- (docs/sources.md: pg-altertable, pg-lr-restrictions). Logical replication
-- sends the text form, which the subscriber parses back into jsonb.
--
-- The UPDATE below is also the TOAST case. It sets field_report on 25 rows
-- whose notes are stored out of line and leaves notes alone. With the default
-- replica identity the WAL does not carry the unchanged out-of-line value
-- (docs/sources.md: pg-toast, artie-postgres), so the consumer receives an
-- UPDATE with no notes value and must keep the one it already has. verify.py
-- checksums notes, so a destination that lost them fails.
--
-- Artie (documented): JSON objects are kept exactly as they appear in the source
-- with no flattening (docs/sources.md: artie-typing). The column appears on the
-- next DML (docs/sources.md: artie-postgres). "Our built-in process will detect
-- if an incoming CDC event has an unchanged TOAST column and will not update
-- the column value in the target database" (docs/sources.md: artie-postgres).
--
-- Destination after: observations has field_report. The 25 rows updated below
-- and every observation stream.py inserts from now on carry a JSON object with
-- ranger, weather, group_size and verified keys; the 25 rows still have their
-- full notes. Older rows have NULL field_report.

ALTER TABLE observations ADD COLUMN IF NOT EXISTS field_report jsonb;

UPDATE observations
   SET field_report = jsonb_build_object(
         'ranger', 'A.M.', 'weather', 'clear', 'group_size', 3, 'verified', true)
 WHERE observation_id IN (SELECT observation_id FROM observations
                          WHERE octet_length(notes) > 2000 ORDER BY observation_id LIMIT 25);
