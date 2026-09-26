#!/usr/bin/env bash
set -euo pipefail

# This script must be run from the repository root.
COMPOSE_FILE="database/compose.yml"
DB_USER="atelier"
DUMP_FILE="${1:-}"
TARGET_DB="${2:-atelier_solidaire_restore}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Run this script from the repository root." >&2
  exit 1
fi

if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
  echo "Usage: ./database/scripts/restore.sh <file.dump> [target_database]" >&2
  exit 1
fi

if [[ ! "$TARGET_DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Target database name contains unsupported characters." >&2
  exit 1
fi

COMPOSE=(docker compose -f "$COMPOSE_FILE")

# Force-disconnect existing sessions so the test restore can be recreated deterministically.
"${COMPOSE[@]}" exec -T postgres psql \
  -v ON_ERROR_STOP=1 \
  -U "$DB_USER" \
  -d postgres <<SQL
DROP DATABASE IF EXISTS "$TARGET_DB" WITH (FORCE);
CREATE DATABASE "$TARGET_DB";
SQL

# The archive is read from the host and restored without preserving dump ownership metadata.
"${COMPOSE[@]}" exec -T postgres pg_restore \
  --no-owner \
  -U "$DB_USER" \
  -d "$TARGET_DB" < "$DUMP_FILE"

tables=(
  categories
  workshops
  arrival_slots
  slot_categories
  volunteers
  volunteer_skills
  volunteer_slot_assignments
  reservations
  prequalification_requests
)

printf 'Restored row counts in %s:\n' "$TARGET_DB"

for table in "${tables[@]}"; do
  count="$("${COMPOSE[@]}" exec -T postgres psql \
    -U "$DB_USER" \
    -d "$TARGET_DB" \
    -Atc "SELECT COUNT(*) FROM \"$table\";")"

  printf '%s: %s\n' "$table" "$count"
done
