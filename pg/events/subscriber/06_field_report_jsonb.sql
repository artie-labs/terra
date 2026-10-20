-- before-publisher
ALTER TABLE observations ADD COLUMN IF NOT EXISTS field_report jsonb;
