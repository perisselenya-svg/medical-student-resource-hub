#!/usr/bin/env bash
# Back up PostgreSQL and uploaded files from the running Docker Compose stack.
#
#   ./scripts/backup.sh                 # writes to ./backups
#   BACKUP_DIR=/srv/backups BACKUP_RETENTION_DAYS=30 ./scripts/backup.sh
#
# Produces a matching pair per run:
#   db-<timestamp>.dump          pg_dump custom format (compressed, restorable with pg_restore)
#   uploads-<timestamp>.tar.gz   every stored file
# Run from the project directory (where docker-compose.yml and .env live).
# Schedule with cron and copy the results OFF the server (see docs/DEPLOYMENT.md).
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
COMPOSE=(docker compose ${COMPOSE_ENV_FILE:+--env-file "$COMPOSE_ENV_FILE"})

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077   # backups contain the full library and password hashes

echo "→ Dumping database"
"${COMPOSE[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
  > "$BACKUP_DIR/db-$STAMP.dump.partial"
mv "$BACKUP_DIR/db-$STAMP.dump.partial" "$BACKUP_DIR/db-$STAMP.dump"

echo "→ Archiving uploaded files"
"${COMPOSE[@]}" run --rm -T --no-deps --entrypoint tar app -czf - -C /data/uploads . \
  > "$BACKUP_DIR/uploads-$STAMP.tar.gz.partial"
mv "$BACKUP_DIR/uploads-$STAMP.tar.gz.partial" "$BACKUP_DIR/uploads-$STAMP.tar.gz"

# Sanity checks: a backup you cannot read is not a backup.
"${COMPOSE[@]}" exec -T db pg_restore --list < "$BACKUP_DIR/db-$STAMP.dump" > /dev/null
tar -tzf "$BACKUP_DIR/uploads-$STAMP.tar.gz" > /dev/null

echo "→ Removing backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime "+$RETENTION_DAYS" -delete

echo "✔ Backup complete:"
ls -lh "$BACKUP_DIR/db-$STAMP.dump" "$BACKUP_DIR/uploads-$STAMP.tar.gz"
