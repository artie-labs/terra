#!/usr/bin/env bash
# bench.sh: measure, from nothing, how long it takes to get a verified replica.
#
#   pg/bench.sh                  # one run, prints phase seconds, writes pg/bench.txt
#   pg/bench.sh --runs 3         # three runs, writes the per-phase MEDIAN to pg/bench.txt
#   pg/bench.sh --runs 3 --cold  # also remove the postgres:16 image first, so
#                                # image_pull is what a first-time user waits for
#
# Phases (wall clock, seconds):
#   image_pull        docker compose pull (about a second when the image is cached)
#   seed_loaded       docker compose up until the source is healthy, which on
#                     a fresh volume means 01_schema, 02_seed and 03_artie ran
#   subscriber_synced subscriber healthy and every table in state 'r' (ready)
#   verify_pass       verify.py reports PASS
#   total             sum of the above
#
# Each run starts with `docker compose down -v`, so it destroys local data.
set -euo pipefail
cd "$(dirname "$0")"

runs=1
cold=0
while [ $# -gt 0 ]; do
  case "$1" in
    --runs) runs="$2"; shift 2 ;;
    --cold) cold=1; shift ;;
    *) echo "usage: bench.sh [--runs N] [--cold]" >&2; exit 2 ;;
  esac
done
SOURCE_DSN="${SOURCE_DSN:-postgresql://postgres:change-me-admin-password@localhost:5432/terra}"
SUB_DSN="${SUB_DSN:-postgresql://postgres:change-me-admin-password@localhost:5433/terra}"
# Honours Docker's own variable, so COMPOSE_PROJECT_NAME=terra-ci bench.sh
# keeps its volumes apart from a local `-p terra` stack.
project="${COMPOSE_PROJECT_NAME:-terra}"

now() { date +%s; }

one_run() {
  docker compose -p "$project" down -v --remove-orphans >/dev/null 2>&1 || true
  if [ "$cold" = 1 ]; then docker image rm -f postgres:16 >/dev/null 2>&1 || true; fi
  local t0 t1 t2 t3 t4
  t0=$(now)
  docker compose -p "$project" pull -q >/dev/null 2>&1 || return 1
  t1=$(now)
  docker compose -p "$project" up -d --wait --wait-timeout 600 postgres >/dev/null 2>&1 || return 1
  t2=$(now)
  docker compose -p "$project" up -d --wait --wait-timeout 600 subscriber >/dev/null 2>&1 || return 1
  local waited=0
  until [ "$(psql "$SUB_DSN" -X -At -c "SELECT count(*) FILTER (WHERE srsubstate <> 'r') FROM pg_subscription_rel" 2>/dev/null)" = "0" ] \
     && [ "$(psql "$SUB_DSN" -X -At -c "SELECT count(*) FROM pg_subscription_rel" 2>/dev/null)" != "0" ]; do
    sleep 1; waited=$((waited + 1))
    [ "$waited" -lt 600 ] || { echo "subscriber did not sync within 600s" >&2; return 1; }
  done
  t3=$(now)
  python3 verify.py --source "$SOURCE_DSN" --dest "$SUB_DSN" --wait 300 >/dev/null || return 1
  t4=$(now)
  echo "$((t1-t0)) $((t2-t1)) $((t3-t2)) $((t4-t3)) $((t4-t0))"
}

results=()
tmp=$(mktemp)
for i in $(seq 1 "$runs"); do
  # Every step in one_run returns 1 on failure, and the subshell is not part
  # of an || or if, so bash does not suspend errexit inside it. Check the
  # status explicitly so a failed run is never recorded as a timing.
  set +e
  ( set -euo pipefail; one_run ) > "$tmp"
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then echo "run $i failed (exit $status); no bench.txt written" >&2; rm -f "$tmp"; exit 1; fi
  r=$(tail -1 "$tmp")
  case "$r" in *[!0-9\ ]*|"") echo "run $i produced no timing; no bench.txt written" >&2; rm -f "$tmp"; exit 1 ;; esac
  echo "run $i: image_pull=$(cut -d' ' -f1 <<<"$r") seed_loaded=$(cut -d' ' -f2 <<<"$r") subscriber_synced=$(cut -d' ' -f3 <<<"$r") verify_pass=$(cut -d' ' -f4 <<<"$r") total=$(cut -d' ' -f5 <<<"$r")"
  results+=("$r")
done

median() { # column index
  printf '%s\n' "${results[@]}" | cut -d' ' -f"$1" | sort -n | awk '{a[NR]=$1} END {print a[int((NR+1)/2)]}'
}

{
  echo "# pg/bench.txt is written by pg/bench.sh; do not edit by hand."
  echo "# median of $runs run(s) on $(date -u +%Y-%m-%dT%H:%M:%SZ), $(uname -sm), docker $(docker version --format '{{.Server.Version}}' 2>/dev/null), image $([ "$cold" = 1 ] && echo pulled || echo cached)"
  for r in "${results[@]}"; do echo "# run: $r"; done
  echo "image_pull $(median 1)"
  echo "seed_loaded $(median 2)"
  echo "subscriber_synced $(median 3)"
  echo "verify_pass $(median 4)"
  echo "total $(median 5)"
} > bench.txt
rm -f "$tmp"
echo "wrote bench.txt:"; cat bench.txt
