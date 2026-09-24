#!/usr/bin/env bash
# Recreate a plain-PostgreSQL database with the Supabase auth shim and all migrations applied.
# Usage: scripts/db-apply-plain.sh [admin-url] [db-name]
# Used for RLS tests where the full Supabase stack isn't available (CI fast path, sandboxes).
set -euo pipefail

ADMIN_URL="${1:-${PG_ADMIN_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}}"
DB_NAME="${2:-epp_test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists \"$DB_NAME\" with (force)" -c "create database \"$DB_NAME\""
DB_URL="${ADMIN_URL%/*}/$DB_NAME"

psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/testing/auth_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "$DB_URL"
