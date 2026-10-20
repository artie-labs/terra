-- apply: before-publisher
-- Additive change applied to the subscriber first, as the Postgres docs
-- recommend (docs/sources.md: pg-lr-restrictions).
ALTER TABLE animals ADD COLUMN IF NOT EXISTS weight_kg numeric(6,2);
