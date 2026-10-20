-- before-publisher
-- Expand: rows written before the rename carry "name", rows written after it
-- carry "display_name". Accept both until every pre-rename row is applied.
-- A column the publisher does not send is filled from the default, so "name"
-- must become nullable (docs/sources.md: pg-lr-subscription).
ALTER TABLE animals ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE animals ALTER COLUMN name DROP NOT NULL;
-- after-catchup
-- Contract: only post-rename rows can arrive from here on. Copy the old
-- values across, then drop the old column.
UPDATE animals SET display_name = name WHERE display_name IS NULL;
ALTER TABLE animals ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE animals DROP COLUMN name;
