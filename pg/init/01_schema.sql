-- 01_schema.sql: initial (pre-migration) schema for the Terra CDC demo.
-- Every table has a primary key so UPDATEs and DELETEs retain row identity over
-- logical replication (default replica identity = primary key).

CREATE TYPE animal_species AS ENUM (
    'lion', 'leopard', 'elephant',
    'black_rhinoceros', 'african_buffalo',
    'cheetah', 'giraffe', 'plains_zebra', 'hippopotamus',
    'blue_wildebeest', 'spotted_hyena', 'common_warthog',
    'ostrich', 'impala', 'african_wild_dog'
);

CREATE TABLE watering_holes (
    watering_hole_id  int PRIMARY KEY,
    name              text NOT NULL,
    region            text NOT NULL,
    latitude          numeric(9,6) NOT NULL,
    longitude         numeric(9,6) NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE animals (
    animal_id              int PRIMARY KEY, -- widened to bigint in migration step 3
    name                   text NOT NULL,   -- renamed to display_name in migration step 5
    species                animal_species NOT NULL,
    home_watering_hole_id  int NOT NULL REFERENCES watering_holes(watering_hole_id),
    status                 text NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE observations (
    observation_id    bigint PRIMARY KEY,
    animal_id         int NOT NULL REFERENCES animals(animal_id),
    watering_hole_id  int NOT NULL REFERENCES watering_holes(watering_hole_id),
    observed_at       timestamptz NOT NULL,
    notes             text
);

-- Long notes are stored out of line, uncompressed, so about one observation in
-- ten has a TOASTed column. With the default EXTENDED strategy the notes
-- compress to about 1.3 kB and stay inline, and a CDC consumer would never see
-- an unchanged-TOAST placeholder in the WAL. EXTERNAL makes that case real.
ALTER TABLE observations ALTER COLUMN notes SET STORAGE EXTERNAL;
