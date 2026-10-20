#!/usr/bin/env bash
# Records the demo cast embedded on artie.world. Run from the repo root with
# the stack down:  docker compose -p terra down -v  &&  site/record_demo.sh
# Needs asciinema. Output: site/recordings/pg-safari.cast
set -euo pipefail
cd "$(dirname "$0")/.."
out=site/recordings/pg-safari.cast
rm -f "$out"
asciinema rec -f asciicast-v2 --window-size 100x28 --idle-time-limit 2 --title "artie.world: Safari, Postgres 16" \
  -c "bash site/demo_session.sh" "$out"
echo "wrote $out"
