-- before-publisher
-- Expand: rows written after the drop omit "status". With NOT NULL and no
-- default they would be rejected, so relax the constraint first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'animals' AND column_name = 'status') THEN
    ALTER TABLE animals ALTER COLUMN status DROP NOT NULL;
  END IF;
END $$;
-- after-catchup
-- Contract: every row that still carried "status" has been applied; drop it.
ALTER TABLE animals DROP COLUMN IF EXISTS status;
