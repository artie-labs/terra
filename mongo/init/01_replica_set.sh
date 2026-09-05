#!/usr/bin/env bash
set -euo pipefail

mongo_host="${MONGO_HOST:-mongo}"
replica_host="${MONGO_REPLICA_HOST:-localhost:27017}"
: "${MONGO_ROOT_USERNAME:?MONGO_ROOT_USERNAME is required}"
: "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD is required}"
readonly mongo_host replica_host

if [[ ! "${replica_host}" =~ ^[A-Za-z0-9._-]+:[0-9]+$ ]]; then
  echo "MONGO_REPLICA_HOST must be a hostname or IP address with a port" >&2
  exit 1
fi

mongo_args=(
  --quiet
  --host "${mongo_host}"
  -u "${MONGO_ROOT_USERNAME}"
  -p "${MONGO_ROOT_PASSWORD}"
  --authenticationDatabase admin
)

last_error=""
for attempt in $(seq 1 60); do
  if output="$(mongosh "${mongo_args[@]}" --eval '
    try {
      db.adminCommand({ ping: 1 });
      print("ready");
    } catch (error) {
      print(`error:${error}`);
      quit(1);
    }
  ' 2>&1)" && [[ "${output}" == *ready* ]]; then
    break
  fi

  last_error="${output}"
  if [[ "${attempt}" == "60" ]]; then
    echo "MongoDB did not accept authenticated connections: ${last_error}" >&2
    exit 1
  fi
  sleep 1
done

if ! mongosh "${mongo_args[@]}" --eval 'try { quit(rs.status().ok === 1 ? 0 : 1) } catch (error) { quit(1) }'; then
  mongosh "${mongo_args[@]}" --eval '
    try {
      rs.initiate({_id: "rs0", members: [{_id: 0, host: "'"${replica_host}"'"}]});
    } catch (error) {
      if (!String(error).includes("already initialized")) {
        throw error;
      }
    }
  '
fi

last_error=""
for attempt in $(seq 1 60); do
  if output="$(mongosh "${mongo_args[@]}" --eval '
    try {
      const status = rs.status();
      print(status.ok === 1 ? "ready" : "not-ready");
    } catch (error) {
      print(`error:${error}`);
      quit(1);
    }
  ' 2>&1)" && [[ "${output}" == *ready* ]]; then
    exit 0
  fi

  last_error="${output}"
  if [[ "${attempt}" == "60" ]]; then
    echo "MongoDB replica set initialization failed: ${last_error}" >&2
    exit 1
  fi
  sleep 1
done
