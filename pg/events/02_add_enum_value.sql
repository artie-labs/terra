-- Event 02: A pangolin is sighted
-- DDL: ALTER TYPE animal_species ADD VALUE 'pangolin'
--
-- Postgres: ADD VALUE may run inside a transaction block, but the new value
-- cannot be used until that transaction commits (docs/sources.md: pg-altertype).
-- This file is run by psql in autocommit mode, so the INSERT below is a separate
-- transaction. The enum change itself is not replicated; the subscriber's enum
-- must gain the label before a row using it arrives, or the apply worker errors
-- on "invalid input value for enum" and retries until it is fixed
-- (docs/sources.md: pg-lr-restrictions, pg-lr-conflicts).
--
-- Artie (documented): not documented for enum values. The typing library page
-- says the source numeric type is preserved and JSON is kept as-is; it does not
-- mention enums (docs/sources.md: artie-typing).
--
-- Destination after: one new animal whose species is 'pangolin'. A destination
-- that stores the enum as text needs nothing else.

ALTER TYPE animal_species ADD VALUE IF NOT EXISTS 'pangolin';

-- Fixed id, well above anything the seed or stream.py hands out, so the two
-- writers never collide.
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
    900001, 'Kipenzi the Scaled', 'pangolin', 7, CASE WHEN has_weight THEN ', 12.50' ELSE '' END, CASE WHEN has_status THEN ', ' || quote_literal('adult') ELSE '' END);
END $$;
