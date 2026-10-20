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
# If only the subscriber's volume was recreated, the source still has an
# inactive slot named terra_sub and CREATE SUBSCRIPTION would refuse to
# create it again. The artie role owns that slot and may drop it.
PGPASSWORD="$TERRA_ARTIE_PASSWORD" psql -v ON_ERROR_STOP=1 -h postgres -U artie -d terra -Atc \
  "SELECT pg_drop_replication_slot('terra_sub') FROM pg_replication_slots WHERE slot_name = 'terra_sub' AND NOT active"
psql -v ON_ERROR_STOP=1 -U postgres -d terra <<SQL
CREATE SUBSCRIPTION terra_sub
  CONNECTION \$conn\$host=postgres port=5432 dbname=terra user=artie password='${pw}'\$conn\$
  PUBLICATION dbz_publication;
SQL
