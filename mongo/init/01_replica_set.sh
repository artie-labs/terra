#!/usr/bin/env bash
set -euo pipefail

mongo_host="${MONGO_HOST:-localhost}"
replica_host="${MONGO_REPLICA_HOST:-localhost:27017}"
mongo_uri="mongodb://${mongo_host}:27017/admin?directConnection=true"
readonly mongo_host replica_host mongo_uri

if [[ ! "${replica_host}" =~ ^[A-Za-z0-9._-]+:[0-9]+$ ]]; then
  echo "MONGO_REPLICA_HOST must be a hostname or IP address with a port" >&2
  exit 1
fi

last_error=""
for attempt in $(seq 1 60); do
  if output="$(mongosh --quiet "${mongo_uri}" --eval '
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
    echo "MongoDB did not accept connections: ${last_error}" >&2
    exit 1
  fi
  sleep 1
done

if ! mongosh --quiet "${mongo_uri}" --eval 'try { quit(rs.status().ok === 1 ? 0 : 1) } catch (error) { quit(1) }'; then
  mongosh --quiet "${mongo_uri}" --eval '
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
  if output="$(mongosh --quiet "${mongo_uri}" --eval '
    try {
      const status = rs.status();
      print(status.ok === 1 ? "ready" : "not-ready");
    } catch (error) {
      print(`error:${error}`);
      quit(1);
    }
  ' 2>&1)" && [[ "${output}" == *ready* ]]; then
    break
  fi

  last_error="${output}"
  if [[ "${attempt}" == "60" ]]; then
    echo "MongoDB replica set initialization failed: ${last_error}" >&2
    exit 1
  fi
  sleep 1
done
