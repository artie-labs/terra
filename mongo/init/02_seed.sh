#!/usr/bin/env bash
set -euo pipefail

mongosh --quiet "mongodb://root:change-me-admin-password@localhost:27017/admin?authSource=admin&directConnection=true" /seed/tiny.js
