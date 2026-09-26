#!/usr/bin/env bash
set -euo pipefail

# This script must be run from the repository root.
COMPOSE_FILE="database/compose.yml"
DB_USER="atelier"
DB_NAME="atelier_solidaire"
BACKUP_DIR="database/backups"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Run this script from the repository root." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%Y%m%d-%H%M)"
backup_path="$BACKUP_DIR/atelier_solidaire_${timestamp}.dump"

# pg_dump writes the custom-format archive to stdout so the dump stays on the host.
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$backup_path"

backup_size="$(du -h "$backup_path" | cut -f1)"

printf 'Backup created: %s\n' "$backup_path"
printf 'Backup size: %s\n' "$backup_size"
