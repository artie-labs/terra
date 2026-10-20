-- apply: after-publisher
-- Dropping here first would make the subscriber reject rows that still carry
-- status. Dropping right after the publisher means at most a few INSERTs hit
-- the not-null violation and are retried.
ALTER TABLE animals DROP COLUMN IF EXISTS status;
