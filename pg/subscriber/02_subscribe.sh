#!/usr/bin/env bash
# Runs once, on the subscriber's first start, after 01_schema.sql has created
# the empty tables. Creates the subscription; copy_data defaults to true, so
# this is also the "backfill": every seeded row is copied over, then changes
# stream (docs/sources.md: pg-createsubscription).
#
# If this fails, the container exits; the healthcheck in docker-compose.yml
# then keeps the service unhealthy, so `docker compose up --wait` fails rather
# than leaving a replica that is up but subscribed to nothing.
set -euo pipefail
# libpq quoting: inside single quotes a backslash escapes the next character,
# so escape backslashes and single quotes in the password. The SQL string is
# dollar-quoted so nothing else needs escaping.
pw=${TERRA_ARTIE_PASSWORD//\\/\\\\}
pw=${pw//\'/\\\'}
psql -v ON_ERROR_STOP=1 -U postgres -d terra <<SQL
CREATE SUBSCRIPTION terra_sub
  CONNECTION \$conn\$host=postgres port=5432 dbname=terra user=artie password='${pw}'\$conn\$
  PUBLICATION dbz_publication;
SQL
