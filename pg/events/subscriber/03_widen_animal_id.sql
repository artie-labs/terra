-- before-publisher
-- int to bigint is text-convertible either way, so order does not matter for
-- correctness. Widening first means the 3000000001 row fits when it arrives.
BEGIN;
ALTER TABLE animals      ALTER COLUMN animal_id TYPE bigint;
ALTER TABLE observations ALTER COLUMN animal_id TYPE bigint;
COMMIT;
