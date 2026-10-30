#!/usr/bin/env bash
# Restore PostgreSQL and uploaded files from a backup pair made by backup.sh.
#
#   ./scripts/restore.sh backups/db-20261030T020000Z.dump backups/uploads-20261030T020000Z.tar.gz
#
# DESTRUCTIVE: replaces the current database contents and ALL uploaded files.
# Always restore the db and uploads files from the SAME timestamp so database
# rows and stored files match.
set -euo pipefail

cd "$(dirname "$0")/.."
DB_DUMP="${1:?usage: restore.sh <db-*.dump> <uploads-*.tar.gz>}"
UPLOADS_TAR="${2:?usage: restore.sh <db-*.dump> <uploads-*.tar.gz>}"
COMPOSE=(docker compose ${COMPOSE_ENV_FILE:+--env-file "$COMPOSE_ENV_FILE"})

[ -f "$DB_DUMP" ] || { echo "Not found: $DB_DUMP"; exit 1; }
[ -f "$UPLOADS_TAR" ] || { echo "Not found: $UPLOADS_TAR"; exit 1; }
tar -tzf "$UPLOADS_TAR" > /dev/null

if [ "${RESTORE_CONFIRM:-}" != "yes" ]; then
  read -r -p "This REPLACES the database and all uploaded files. Type 'restore' to continue: " answer
  [ "$answer" = "restore" ] || { echo "Aborted."; exit 1; }
fi

echo "→ Stopping the app (database stays up)"
"${COMPOSE[@]}" stop app

echo "→ Restoring database"
"${COMPOSE[@]}" exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction' < "$DB_DUMP"

echo "→ Restoring uploaded files"
"${COMPOSE[@]}" run --rm -T --no-deps --entrypoint sh app -c \
  'find /data/uploads -mindepth 1 -delete && tar -xzf - -C /data/uploads' < "$UPLOADS_TAR"

echo "→ Applying any newer migrations and starting the app"
"${COMPOSE[@]}" up -d app

echo "✔ Restore complete. Check: ${COMPOSE[*]} logs -f app"
