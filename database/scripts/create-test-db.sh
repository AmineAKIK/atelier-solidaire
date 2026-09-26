#!/usr/bin/env bash
set -euo pipefail

# This script must be run from the repository root.
COMPOSE_FILE="database/compose.yml"
DB_USER="atelier"
TEST_DB="atelier_solidaire_test"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Run this script from the repository root." >&2
  exit 1
fi

migrations=(
  database/migrations/001_schema.sql
  database/migrations/002_seed.sql
  database/migrations/003_timezone.sql
  database/migrations/004_backend_demo.sql
  database/migrations/005_test_scenarios.sql
)

for migration in "${migrations[@]}"; do
  if [[ ! -f "$migration" ]]; then
    echo "Missing migration: $migration" >&2
    exit 1
  fi
done

COMPOSE=(docker compose -f "$COMPOSE_FILE")

# Recreate the test database so every run starts from a known empty state.
"${COMPOSE[@]}" exec -T postgres psql \
  -v ON_ERROR_STOP=1 \
  -U "$DB_USER" \
  -d postgres <<SQL
DROP DATABASE IF EXISTS "$TEST_DB" WITH (FORCE);
CREATE DATABASE "$TEST_DB";
SQL

for migration in "${migrations[@]}"; do
  printf 'Applying %s\n' "$migration"

  "${COMPOSE[@]}" exec -T postgres psql \
    -v ON_ERROR_STOP=1 \
    -U "$DB_USER" \
    -d "$TEST_DB" < "$migration"
done

printf 'Tables in %s:\n' "$TEST_DB"
printf '\\dt\n' | "${COMPOSE[@]}" exec -T postgres psql \
  -v ON_ERROR_STOP=1 \
  -U "$DB_USER" \
  -d "$TEST_DB"
