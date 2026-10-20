-- Event 07: Survey adds elevation
-- DDL: ALTER TABLE watering_holes ADD COLUMN elevation_m int NOT NULL DEFAULT 0
--
-- Postgres: a non-volatile default is stored in the catalog and applied to
-- existing rows without a rewrite (docs/sources.md: pg-altertable). Because it
-- is a catalog change, no row images are emitted for the backfill of 0s. The
-- subscriber can have the column with its own default; an extra subscriber
-- column is filled from its default (docs/sources.md: pg-lr-subscription). The
-- UPDATE below emits real values for all 12 rows.
--
-- Artie (documented): columns added automatically; the schema-change report
-- includes default value and not-null changes (docs/sources.md:
-- artie-schema-evolution, artie-schema-changes). Whether the destination
-- column gets the NOT NULL constraint or the default is not documented.
--
-- Destination after: watering_holes has elevation_m with the surveyed values.

ALTER TABLE watering_holes ADD COLUMN IF NOT EXISTS elevation_m int NOT NULL DEFAULT 0;

UPDATE watering_holes SET elevation_m = v.elevation_m
  FROM (VALUES (1, 1600), (2, 1150), (3, 1500), (4, 1700), (5, 950), (6, 930),
               (7, 300), (8, 1100), (9, 1000), (10, 550), (11, 1050), (12, 90)) AS v(id, elevation_m)
 WHERE watering_holes.watering_hole_id = v.id;
