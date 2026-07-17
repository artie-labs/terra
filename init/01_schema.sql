-- 01_schema.sql — initial (pre-migration) schema for the terra CDC demo.
-- Runs first. Every table has a primary key so UPDATEs and DELETEs carry
-- old-row values over logical replication (default replica identity = PK).

CREATE TYPE turtle_species AS ENUM
    ('green', 'loggerhead', 'hawksbill', 'leatherback', 'kemps_ridley');

CREATE TABLE beaches (
    beach_id    int PRIMARY KEY,
    name        text NOT NULL,
    region      text NOT NULL,
    latitude    numeric(9,6) NOT NULL,
    longitude   numeric(9,6) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE turtles (
    turtle_id         int PRIMARY KEY,          -- widened to bigint in migration step 3
    name              text NOT NULL,            -- renamed to display_name in step 5
    species           turtle_species NOT NULL,
    nesting_beach_id  int NOT NULL REFERENCES beaches(beach_id),
    status            text NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sightings (
    sighting_id  bigint PRIMARY KEY,
    turtle_id    int NOT NULL REFERENCES turtles(turtle_id),
    beach_id     int NOT NULL REFERENCES beaches(beach_id),
    observed_at  timestamptz NOT NULL,
    notes        text
);
