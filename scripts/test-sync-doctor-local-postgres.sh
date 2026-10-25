#!/usr/bin/env bash
# FREE and LOCAL only. Creates a disposable database on 127.0.0.1; destroys it on exit.
# Never supplies a Supabase URL, remote PGHOST, API key, or service-role token.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
for bin in node psql createdb dropdb; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "SKIP (not passed): '$bin' is not installed; no local SQL test ran." >&2
    exit 2
  fi
done
if [[ -n "${DATABASE_URL:-}" || -n "${PGSERVICE:-}" || -n "${PGHOSTADDR:-}" ]]; then
  echo "Refusing database connection settings that could redirect to a hosted database." >&2
  exit 2
fi
if [[ -n "${PGHOST:-}" && "${PGHOST}" != "127.0.0.1" && "${PGHOST}" != "localhost" ]]; then
  echo "Refusing remote PGHOST '${PGHOST}'. Only local loopback is permitted." >&2
  exit 2
fi
PORT="${PGPORT:-5432}"
[[ "$PORT" =~ ^[0-9]{2,5}$ ]] || { echo "PGPORT must be numeric." >&2; exit 2; }
USER_NAME="${PGUSER:-$(id -un)}"
DB_NAME="sync_doctor_fixture_${RANDOM}_${RANDOM}"
TMP_SQL="$(mktemp)"
CREATED=0
cleanup() {
  rm -f "$TMP_SQL"
  if [[ "$CREATED" -eq 1 ]]; then
    dropdb --if-exists --host 127.0.0.1 --port "$PORT" --username "$USER_NAME" "$DB_NAME" \
      || echo "WARNING: failed to delete local fixture database '$DB_NAME'." >&2
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export PGCONNECT_TIMEOUT=5
echo "Local-only Sync Doctor SQL test. Host: 127.0.0.1, port: $PORT, temporary database: $DB_NAME"
SERVER_VERSION="$(psql -X -qAt --host 127.0.0.1 --port "$PORT" --username "$USER_NAME" \
  --dbname postgres --command 'show server_version_num')"
if [[ ! "$SERVER_VERSION" =~ ^[0-9]+$ ]] || (( SERVER_VERSION < 160000 )); then
  echo "PostgreSQL 16+ required to match tested features. Found: $SERVER_VERSION" >&2
  exit 2
fi
node scripts/sync-doctor-extract-local-functions.mjs > "$TMP_SQL"
createdb --host 127.0.0.1 --port "$PORT" --username "$USER_NAME" "$DB_NAME"
CREATED=1
psql -X -v ON_ERROR_STOP=1 --host 127.0.0.1 --port "$PORT" --username "$USER_NAME" \
  --dbname "$DB_NAME" --file tests/sync-doctor-local/01_bootstrap.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 --host 127.0.0.1 --port "$PORT" --username "$USER_NAME" \
  --dbname "$DB_NAME" --file "$TMP_SQL" >/dev/null
psql -X -v ON_ERROR_STOP=1 --host 127.0.0.1 --port "$PORT" --username "$USER_NAME" \
  --dbname "$DB_NAME" --file tests/sync-doctor-local/02_e2e.sql
echo "PASS isolated actual PL/pgSQL tests; disposable local database will be deleted."
