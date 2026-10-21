#!/usr/bin/env bash
# The commands shown in the recording. Each is echoed before it runs.
set -euo pipefail
cd pg
show() { printf '\033[1;33m$ %s\033[0m\n' "$*"; }
show "docker compose -p terra up -d --wait"
docker compose -p terra up -d --wait 2>&1 | grep -E 'Healthy|Started' | sed 's/^ *//'
show "python3 verify.py --wait 120"
python3 verify.py --wait 120
show "python3 stream.py --rate 10 &"
python3 stream.py --rate 10 --quiet > /tmp/demo-stream.log 2>&1 &
pid=$!
sleep 4; tail -1 /tmp/demo-stream.log
for n in 1 2 3 4 5 6 7 8; do
  show "events/apply.sh $n"
  events/apply.sh "$n"
  show "python3 verify.py --wait 120"
  python3 verify.py --wait 120
done
kill "$pid"; sleep 1
show "tail -1 /tmp/demo-stream.log"
tail -1 /tmp/demo-stream.log
show "psql \$SUB_DSN -f queries.sql   # same three queries, on the subscriber"
# Do not pipe this into head: under pipefail the SIGPIPE would end the
# recording early. The three queries fit on screen as they are.
psql "postgresql://postgres:${TERRA_ADMIN_PASSWORD:-change-me-admin-password}@localhost:5433/terra" -X -P pager=off -f queries.sql
sleep 3
