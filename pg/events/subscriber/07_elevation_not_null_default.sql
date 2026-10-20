-- before-publisher
-- The default here only matters for rows inserted without the column; the
-- publisher sends explicit values after its UPDATE.
ALTER TABLE watering_holes ADD COLUMN IF NOT EXISTS elevation_m int NOT NULL DEFAULT 0;
