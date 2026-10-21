#!/usr/bin/env bash
# first_run.sh: the stranger test. Runs exactly the commands pg/README.md gives
# a newcomer under "Run it", with no extra flags and no environment variables
# the README does not mention, times each one, and prints one line:
#
#   first run: N seconds, verify PASS
#
# The second README command (python3 stream.py) runs until interrupted, so it
# is started in the background for the duration of the third and stopped
# afterwards, which is what the README tells the reader to do with a second
# terminal. Everything else is verbatim. If this script ever needs something
# the README does not say, that is a README bug.
set -uo pipefail
cd "$(dirname "$0")"

t0=$(date +%s)
docker compose -p terra up -d --wait
t1=$(date +%s)

python3 stream.py > /tmp/first_run_stream.log 2>&1 &
stream_pid=$!
sleep 3

events/apply.sh all && python3 verify.py --wait 120
status=$?
t2=$(date +%s)

kill "$stream_pid" 2>/dev/null; wait "$stream_pid" 2>/dev/null
tail -1 /tmp/first_run_stream.log

verdict=PASS; [ "$status" -eq 0 ] || verdict=FAIL
echo "first run: $((t2 - t0)) seconds (compose up $((t1 - t0)) s, events and verify $((t2 - t1)) s), verify $verdict"
exit "$status"
