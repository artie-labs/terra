-- Event 08: Status moves to the collars
-- DDL: ALTER TABLE animals DROP COLUMN status
--
-- Postgres: DROP COLUMN makes the column invisible; space is reclaimed later
-- (docs/sources.md: pg-altertable). Not replicated. After this, rows sent to
-- the subscriber no longer include status. A subscriber that still has
-- status NOT NULL with no default rejects every INSERT with a not-null
-- violation and the apply worker stalls on it (docs/sources.md:
-- pg-lr-subscription, pg-lr-conflicts). UPDATEs still apply. Dropping the
-- subscriber column at the same moment is not safe either: rows that
-- committed before the drop still carry status. events/subscriber/08 makes
-- status nullable first and drops it after apply.sh confirms catch-up.
--
-- Artie (documented): for safety, columns are not dropped from the destination
-- automatically. With "Enable hard deletes for columns" on, the first row that
-- omits the column marks it, Artie watches CDC events for 4 hours, and only
-- then drops it (docs/sources.md: artie-schema-evolution).
--
-- Destination after: by default animals still has status, frozen at its last
-- value per row. stream.py stops writing status as soon as it sees the column
-- is gone.

ALTER TABLE animals DROP COLUMN IF EXISTS status;

UPDATE animals SET updated_at = now() WHERE animal_id <= 5;
