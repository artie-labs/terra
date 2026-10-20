#!/usr/bin/env bash
# Apply one or more schema events to the source database and, unless told not
# to, the matching DDL to the subscriber stand-in.
#
#   events/apply.sh 1            # event 01 only
#   events/apply.sh 1 2 3        # several
#   events/apply.sh all          # 01 through 08 in order
#
# Environment:
#   SOURCE_DSN  publisher (default postgresql://postgres:change-me-admin-password@localhost:5432/terra)
#   SUB_DSN     subscriber (default postgresql://postgres:change-me-admin-password@localhost:5433/terra)
#               Set SUB_DSN=none when the consumer is something else, for
#               example an Artie pipeline. If SUB_DSN is set to anything else
#               and the subscriber cannot be reached, this script stops.
#
# Each file in events/subscriber/ is split into up to three sections:
#   -- before-publisher   runs before the source event (additive changes)
#   -- after-publisher    runs right after the source event
#   -- after-catchup      runs once the subscriber has applied every change
#                         that committed on the source before the event
# The third section is what makes renames and drops safe under a live write
# stream: rows written before the event still carry the old column, and the
# subscriber must keep accepting them until they have all been applied. See
# docs/events-observed.md "Why the subscriber migrates in two steps".
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DSN="${SOURCE_DSN:-postgresql://postgres:change-me-admin-password@localhost:5432/terra}"
SUB_DSN="${SUB_DSN:-postgresql://postgres:change-me-admin-password@localhost:5433/terra}"
CATCHUP_TIMEOUT="${CATCHUP_TIMEOUT:-180}"

if [ "$#" -eq 0 ]; then
  sed -n '2,22p' "$0"; exit 2
fi

run_section() { # dsn file section
  local sql
  sql=$(awk -v want="-- $3" '
    /^-- (before-publisher|after-publisher|after-catchup)$/ { on = ($0 == want); next }
    on { print }' "$2")
  [ -n "$(printf '%s' "$sql" | grep -v '^\s*--' | grep -v '^\s*$')" ] || return 0
  echo "== subscriber ($3): $(basename "$2")"
  printf '%s\n' "$sql" | psql "$1" -X -q -v ON_ERROR_STOP=1
}

wait_caught_up() {
  # Everything that committed on the source before this point must be applied
  # on the subscriber before we continue. Take the source's current LSN, then
  # commit a marker row so there is always a transaction at or beyond it to
  # apply, even when stream.py is not running. pg_replication_origin_status
  # reports the last applied commit, and commits are applied in order.
  local mark applied deadline
  mark=$(psql "$SOURCE_DSN" -X -Atc "SELECT pg_current_wal_lsn()")
  psql "$SOURCE_DSN" -X -q -c "UPDATE watering_holes SET created_at = created_at WHERE watering_hole_id = 1"
  deadline=$((SECONDS + CATCHUP_TIMEOUT))
  while :; do
    # Only the subscription's own origin (pg_<suboid>). Table synchronization
    # workers use separate origins whose LSN can run ahead of the apply worker.
    applied=$(psql "$SUB_DSN" -X -Atc "SELECT coalesce(s.remote_lsn, '0/0') FROM pg_subscription sub LEFT JOIN pg_replication_origin_status s ON s.external_id = 'pg_' || sub.oid WHERE sub.subname = 'terra_sub'")
    if [ "$(psql "$SUB_DSN" -X -Atc "SELECT '$applied'::pg_lsn >= '$mark'::pg_lsn")" = "t" ]; then
      echo "== subscriber caught up to $mark"; return 0
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "subscriber did not catch up to $mark within ${CATCHUP_TIMEOUT}s (applied $applied)" >&2; return 1
    fi
    sleep 1
  done
}

if [ "$1" = "all" ]; then set -- 1 2 3 4 5 6 7 8; fi

have_sub=0
if [ "$SUB_DSN" = "none" ]; then
  echo "SUB_DSN=none: applying to the source only"
elif psql "$SUB_DSN" -X -q -At -c "SELECT 1" >/dev/null 2>&1; then
  have_sub=1
else
  echo "subscriber not reachable at ${SUB_DSN##*@}; set SUB_DSN=none to apply to the source only" >&2
  exit 1
fi

for n in "$@"; do
  nn=$(printf "%02d" "$n")
  src=$(ls "$here"/"${nn}"_*.sql 2>/dev/null | head -1)
  [ -n "$src" ] || { echo "no event ${nn}" >&2; exit 1; }
  sub=$(ls "$here"/subscriber/"${nn}"_*.sql 2>/dev/null | head -1)
  echo "### event ${nn}: $(sed -n '1s/^-- //p' "$src")"
  [ "$have_sub" = 1 ] && [ -n "$sub" ] && run_section "$SUB_DSN" "$sub" before-publisher
  echo "== source: $(basename "$src")"
  psql "$SOURCE_DSN" -X -q -v ON_ERROR_STOP=1 -f "$src"
  if [ "$have_sub" = 1 ] && [ -n "$sub" ]; then
    run_section "$SUB_DSN" "$sub" after-publisher
    if grep -q '^-- after-catchup$' "$sub"; then
      wait_caught_up
      run_section "$SUB_DSN" "$sub" after-catchup
    fi
  fi
done
