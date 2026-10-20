#!/usr/bin/env bash
# Apply one or more schema events to the source database, and to the
# subscriber stand-in when one is reachable.
#
#   events/apply.sh 1            # event 01 only
#   events/apply.sh 1 2 3        # several
#   events/apply.sh all          # 01 through 08 in order
#
# Environment:
#   SOURCE_DSN  publisher (default postgresql://postgres:change-me-admin-password@localhost:5432/terra)
#   SUB_DSN     subscriber; default postgresql://postgres:change-me-admin-password@localhost:5433/terra
#               Set SUB_DSN=none to skip the subscriber side, for example when
#               the consumer is an Artie pipeline instead.
#
# Each file in events/subscriber/ declares "-- apply: before-publisher" or
# "-- apply: after-publisher". Additive changes go to the subscriber first; the
# rest go right after the publisher. See the comment at the top of each file.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DSN="${SOURCE_DSN:-postgresql://postgres:change-me-admin-password@localhost:5432/terra}"
SUB_DSN="${SUB_DSN:-postgresql://postgres:change-me-admin-password@localhost:5433/terra}"

if [ "$#" -eq 0 ]; then
  sed -n '2,16p' "$0"; exit 2
fi

sub_available() {
  [ "$SUB_DSN" != "none" ] && psql "$SUB_DSN" -X -q -At -c "SELECT 1" >/dev/null 2>&1
}

run_sql() { # dsn file label
  echo "== $3: $(basename "$2")"
  psql "$1" -X -q -v ON_ERROR_STOP=1 -f "$2"
}

if [ "$1" = "all" ]; then set -- 1 2 3 4 5 6 7 8; fi

have_sub=0
if sub_available; then have_sub=1; else echo "subscriber not reachable at ${SUB_DSN%%@*}@...; applying to source only"; fi

for n in "$@"; do
  nn=$(printf "%02d" "$n")
  src=$(ls "$here"/"${nn}"_*.sql 2>/dev/null | head -1)
  [ -n "$src" ] || { echo "no event ${nn}" >&2; exit 1; }
  sub=$(ls "$here"/subscriber/"${nn}"_*.sql 2>/dev/null | head -1)
  order="after-publisher"
  if [ -n "$sub" ]; then order=$(grep -m1 -o 'apply: [a-z-]*' "$sub" | cut -d' ' -f2); fi
  echo "### event ${nn}: $(sed -n '1s/^-- //p' "$src")"
  if [ "$have_sub" = 1 ] && [ -n "$sub" ] && [ "$order" = "before-publisher" ]; then run_sql "$SUB_DSN" "$sub" subscriber; fi
  run_sql "$SOURCE_DSN" "$src" source
  if [ "$have_sub" = 1 ] && [ -n "$sub" ] && [ "$order" = "after-publisher" ]; then run_sql "$SUB_DSN" "$sub" subscriber; fi
done
