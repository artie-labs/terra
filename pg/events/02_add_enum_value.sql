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
INSERT INTO animals (animal_id, name, species, home_watering_hole_id, status, weight_kg)
VALUES (900001, 'Kipenzi the Scaled', 'pangolin', 7, 'adult', 12.50)
ON CONFLICT (animal_id) DO NOTHING;
