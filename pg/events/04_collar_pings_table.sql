-- Event 04: The collars come online
-- DDL: CREATE TABLE collar_pings (...)
--
-- Postgres: dbz_publication is FOR ALL TABLES, which includes tables created in
-- the future (docs/sources.md: pg-createpublication). The CREATE TABLE itself is
-- not replicated. A subscriber only starts receiving the table after it exists
-- there and ALTER SUBSCRIPTION ... REFRESH PUBLICATION has been run
-- (docs/sources.md: pg-altersubscription). The refresh copies the rows that
-- already exist because copy_data defaults to true (docs/sources.md:
-- pg-createsubscription). The bigserial sequence is not replicated; only the
-- values are (docs/sources.md: pg-lr-restrictions).
--
-- Artie (documented): new destination tables are created automatically if they
-- do not exist (docs/sources.md: artie-schema-evolution). New source tables are
-- discovered on a schedule, every weekday at 6am PT when auto-replicate is on
-- (docs/sources.md: artie-tables). Until then the table is not in the pipeline.
--
-- Destination after: a collar_pings table with the rows below plus whatever
-- stream.py has inserted since; stream.py starts writing pings as soon as it
-- sees the table.

CREATE TABLE IF NOT EXISTS collar_pings (
    ping_id           bigserial PRIMARY KEY,
    animal_id         bigint NOT NULL REFERENCES animals(animal_id),
    watering_hole_id  int REFERENCES watering_holes(watering_hole_id),
    pinged_at         timestamptz NOT NULL DEFAULT now(),
    latitude          numeric(9,6) NOT NULL,
    longitude         numeric(9,6) NOT NULL,
    battery_pct       smallint NOT NULL
);

INSERT INTO collar_pings (animal_id, watering_hole_id, pinged_at, latitude, longitude, battery_pct)
SELECT a.animal_id, a.home_watering_hole_id, now(), w.latitude, w.longitude, 98
  FROM animals a JOIN watering_holes w ON w.watering_hole_id = a.home_watering_hole_id
 WHERE a.animal_id <= 12
   AND NOT EXISTS (SELECT 1 FROM collar_pings);
