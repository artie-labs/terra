-- apply: after-publisher
-- The table must exist here, then the subscription has to be told to look for
-- new tables. REFRESH PUBLICATION also copies rows that already exist
-- (docs/sources.md: pg-altersubscription, pg-createsubscription).
CREATE TABLE IF NOT EXISTS collar_pings (
    ping_id           bigint PRIMARY KEY,
    animal_id         bigint NOT NULL,
    watering_hole_id  int,
    pinged_at         timestamptz NOT NULL DEFAULT now(),
    latitude          numeric(9,6) NOT NULL,
    longitude         numeric(9,6) NOT NULL,
    battery_pct       smallint NOT NULL
);
ALTER SUBSCRIPTION terra_sub REFRESH PUBLICATION;
