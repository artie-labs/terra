-- before-publisher
-- Create the table here first. Until the subscription knows about it, the
-- apply worker skips changes for it instead of failing, because the relation
-- exists locally but is not in pg_subscription_rel.
CREATE TABLE IF NOT EXISTS collar_pings (
    ping_id           bigint PRIMARY KEY,
    animal_id         bigint NOT NULL,
    watering_hole_id  int,
    pinged_at         timestamptz NOT NULL DEFAULT now(),
    latitude          numeric(9,6) NOT NULL,
    longitude         numeric(9,6) NOT NULL,
    battery_pct       smallint NOT NULL
);
-- after-publisher
-- Now that the publisher has the table, tell the subscription to look for new
-- tables. The refresh copies the rows that already exist, then streams
-- (docs/sources.md: pg-altersubscription, pg-createsubscription).
ALTER SUBSCRIPTION terra_sub REFRESH PUBLICATION;
