#!/usr/bin/env bash
# Runs once, on the subscriber's first start, after 01_schema.sql has created
# the empty tables. Creates the subscription; copy_data defaults to true, so
# this is also the "backfill": every seeded row is copied over, then changes
# stream (docs/sources.md: pg-createsubscription).
set -euo pipefail
psql -v ON_ERROR_STOP=1 -U postgres -d terra <<SQL
CREATE SUBSCRIPTION terra_sub
  CONNECTION 'host=postgres port=5432 dbname=terra user=artie password=${TERRA_ARTIE_PASSWORD}'
  PUBLICATION dbz_publication;
SQL
