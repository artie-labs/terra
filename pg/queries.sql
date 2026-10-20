-- queries.sql: three queries over the Terra safari dataset.
-- Run against the source or any destination that has kept up:
--   psql postgresql://postgres:change-me-admin-password@localhost:5432/terra -f queries.sql
--   psql postgresql://postgres:change-me-admin-password@localhost:5433/terra -f queries.sql
-- The last two only return a story after the schema events in events/ have run.

-- 1. Baseline: observations per watering hole. Works from the first seed.
\echo '-- 1. observations per watering hole'
SELECT w.name AS watering_hole, w.region, count(o.observation_id) AS observations
  FROM watering_holes w
  LEFT JOIN observations o ON o.watering_hole_id = w.watering_hole_id
 GROUP BY w.watering_hole_id, w.name, w.region
 ORDER BY observations DESC, w.name;

-- 2. Unlocked by event 06 (observations.field_report jsonb): which rangers file
--    the most verified reports, and the weather they file them in. Before event
--    06 the column does not exist and this query errors; after it, rows written
--    by stream.py and the 25 rows the event back-filled appear here.
\echo '-- 2. verified field reports per ranger (event 06)'
SELECT field_report->>'ranger'            AS ranger,
       count(*)                            AS reports,
       count(*) FILTER (WHERE (field_report->>'verified')::boolean) AS verified,
       mode() WITHIN GROUP (ORDER BY field_report->>'weather')      AS usual_weather
  FROM observations
 WHERE field_report IS NOT NULL
 GROUP BY 1
 ORDER BY reports DESC, ranger;

-- 3. Unlocked by event 04 (collar_pings) and reads better after 05
--    (animals.display_name) and 07 (watering_holes.elevation_m): the last ping
--    per collared animal, with the hole it pinged from and its elevation.
\echo '-- 3. latest collar ping per animal (events 04, 05, 07)'
SELECT a.display_name, a.species, w.name AS near, w.elevation_m,
       p.pinged_at, p.battery_pct
  FROM collar_pings p
  JOIN animals a         ON a.animal_id = p.animal_id
  LEFT JOIN watering_holes w ON w.watering_hole_id = p.watering_hole_id
 WHERE p.ping_id = (SELECT max(ping_id) FROM collar_pings q WHERE q.animal_id = p.animal_id)
 ORDER BY p.pinged_at DESC
 LIMIT 10;
