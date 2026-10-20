-- Event 01: Weigh-in
-- DDL: ALTER TABLE animals ADD COLUMN weight_kg numeric(6,2)
--
-- Postgres logical replication: DDL is not replicated, only row changes are
-- (docs/sources.md: pg-lr-restrictions). A nullable column with no default is a
-- catalog-only change and needs no table rewrite (docs/sources.md: pg-altertable).
-- The subscriber only sees the new column once a row that carries it arrives, and
-- then only if the subscriber table already has a column of that name.
--
-- Artie (documented): DDL does not appear as a discrete WAL event; the new column
-- reaches the destination lazily, on the next DML for the table
-- (docs/sources.md: artie-postgres). Columns are added to the destination
-- automatically (docs/sources.md: artie-schema-evolution).
--
-- Destination after: animals has weight_kg. Rows updated below carry a weight;
-- every other row has NULL.

ALTER TABLE animals ADD COLUMN IF NOT EXISTS weight_kg numeric(6,2);

UPDATE animals
   SET weight_kg = CASE species
                     WHEN 'elephant' THEN 4800.00
                     WHEN 'hippopotamus' THEN 1500.00
                     WHEN 'giraffe' THEN 1100.00
                     WHEN 'african_buffalo' THEN 700.00
                     WHEN 'black_rhinoceros' THEN 1100.00
                     ELSE 120.00
                   END,
       updated_at = now()
 WHERE animal_id <= 20;
