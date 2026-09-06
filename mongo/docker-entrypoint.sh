#!/usr/bin/env bash
set -euo pipefail

keyfile=/data/db/terra-mongo-keyfile
if [[ ! -s "${keyfile}" ]]; then
  umask 077
  head -c 756 /dev/urandom | base64 > "${keyfile}"
fi
chown mongodb:mongodb "${keyfile}"
chmod 400 "${keyfile}"

exec /usr/local/bin/docker-entrypoint.sh "$@"
