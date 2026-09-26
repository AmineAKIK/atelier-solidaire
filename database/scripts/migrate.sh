#!/usr/bin/env bash
set -euo pipefail

# This script must be run from the repository root.
COMPOSE_FILE="${COMPOSE_FILE:-database/compose.yml}"
DB_USER="${DB_USER:-atelier}"
DB_NAME="${DB_NAME:-atelier_solidaire}"
DB_PASSWORD="${DB_PASSWORD:-atelier_dev}"

migrations=(
  database/migrations/001_schema.sql
  database/migrations/002_seed.sql
  database/migrations/003_timezone.sql
  database/migrations/004_backend_demo.sql
)

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

for migration in "${migrations[@]}"; do
  if [[ ! -f "$migration" ]]; then
    echo "Migration not found: $migration" >&2
    exit 1
  fi
done

COMPOSE=(docker compose -f "$COMPOSE_FILE")

psql_exec() {
  "${COMPOSE[@]}" exec -T \
    -e PGPASSWORD="$DB_PASSWORD" \
    postgres \
    psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" "$@"
}

# Keep production migration history separate from the business schema migrations.
psql_exec <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

for migration in "${migrations[@]}"; do
  filename="$(basename "$migration")"
  applied="$(
    psql_exec -At -v migration_name="$filename" \
      -c "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = :'migration_name');"
  )"

  if [[ "$applied" == "t" ]]; then
    printf 'Skipping %s (already applied)\n' "$filename"
    continue
  fi

  printf 'Applying %s\n' "$filename"

  {
    printf 'BEGIN;\n'
    cat "$migration"
    printf '\nINSERT INTO schema_migrations (filename) VALUES (:\x27migration_name\x27);\n'
    printf 'COMMIT;\n'
  } | psql_exec -v migration_name="$filename"
done

printf 'Production migrations are up to date.\n'
