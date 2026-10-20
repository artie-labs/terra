-- Event 03: The herd outgrows int
-- DDL: ALTER TABLE animals ALTER COLUMN animal_id TYPE bigint;
--      ALTER TABLE observations ALTER COLUMN animal_id TYPE bigint;
--
-- Postgres: changing a column type rewrites the table and rebuilds its indexes,
-- except that int to bigint is not binary coercible, so this one rewrites both
-- tables (docs/sources.md: pg-altertable). Both sides of the foreign key are
-- changed in one transaction; the constraint is re-parsed automatically. The
-- rewrite is not replicated. Logical replication converts values by text, so a
-- subscriber whose column is still int keeps working until a value above
-- 2147483647 arrives (docs/sources.md: pg-lr-subscription). The INSERT below
-- sends exactly such a value.
--
-- Artie (documented): the reconciliation job does not change the type of an
-- existing destination column (docs/sources.md: artie-schema-evolution). The
-- typing library says Artie uses the destination schema as the source of truth
-- and raises an error on a conversion that could lose data
-- (docs/sources.md: artie-typing). Whether a value above int range lands or
-- errors is not documented.
--
-- Destination after: animals.animal_id and observations.animal_id are 64-bit.
-- One animal with animal_id 3000000001 and one observation for it.

BEGIN;
ALTER TABLE animals      ALTER COLUMN animal_id TYPE bigint;
ALTER TABLE observations ALTER COLUMN animal_id TYPE bigint;
COMMIT;

-- Order-independent and re-runnable: uses name or display_name, and sends
-- status and weight_kg only while those columns exist, so the file works on a
-- fresh stack (before event 01) and after events 05 and 08.
DO $$
DECLARE
  name_col text := CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                                     WHERE table_name = 'animals' AND column_name = 'name')
                        THEN 'name' ELSE 'display_name' END;
  has_status boolean := EXISTS (SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'animals' AND column_name = 'status');
  has_weight boolean := EXISTS (SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'animals' AND column_name = 'weight_kg');
BEGIN
  EXECUTE format(
    'INSERT INTO animals (animal_id, %I, species, home_watering_hole_id%s%s) '
    'VALUES (%s, %L, %L, %s%s%s) ON CONFLICT (animal_id) DO NOTHING',
    name_col, CASE WHEN has_weight THEN ', weight_kg' ELSE '' END, CASE WHEN has_status THEN ', status' ELSE '' END,
    3000000001, 'Mkubwa Sana', 'elephant', 2, CASE WHEN has_weight THEN ', 5100.00' ELSE '' END, CASE WHEN has_status THEN ', ' || quote_literal('adult') ELSE '' END);
END $$;

INSERT INTO observations (observation_id, animal_id, watering_hole_id, observed_at, notes)
VALUES (9000000001, 3000000001, 2, now(),
        'First observation of an animal whose id does not fit in 32 bits.')
ON CONFLICT (observation_id) DO NOTHING;
