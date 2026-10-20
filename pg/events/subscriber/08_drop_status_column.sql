-- before-publisher
-- Expand: rows written after the drop omit "status". With NOT NULL and no
-- default they would be rejected, so relax the constraint first.
ALTER TABLE animals ALTER COLUMN status DROP NOT NULL;
-- after-catchup
-- Contract: every row that still carried "status" has been applied; drop it.
ALTER TABLE animals DROP COLUMN IF EXISTS status;
