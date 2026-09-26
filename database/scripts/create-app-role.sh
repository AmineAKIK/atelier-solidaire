#!/usr/bin/env bash
set -euo pipefail

# This script must be run from the repository root.
COMPOSE_FILE="${COMPOSE_FILE:-deploy/compose.prod.yml}"
DB_ADMIN_USER="${DB_ADMIN_USER:-atelier_admin}"
DB_NAME="${DB_NAME:-atelier_solidaire}"
DB_ADMIN_PASSWORD="${POSTGRES_ADMIN_PASSWORD:-}"
APP_PASSWORD="${POSTGRES_APP_PASSWORD:-}"

if [[ -z "$DB_ADMIN_PASSWORD" || -z "$APP_PASSWORD" ]]; then
  echo "POSTGRES_ADMIN_PASSWORD and POSTGRES_APP_PASSWORD are required." >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

COMPOSE=(docker compose -f "$COMPOSE_FILE")

# Reconcile the application role on every deployment without granting ownership or DDL rights.
"${COMPOSE[@]}" exec -T \
  -e PGPASSWORD="$DB_ADMIN_PASSWORD" \
  postgres \
  psql -v ON_ERROR_STOP=1 \
  -v app_password="$APP_PASSWORD" \
  -U "$DB_ADMIN_USER" \
  -d "$DB_NAME" <<'SQL'
SELECT format('CREATE ROLE atelier_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'atelier_app'
)
\gexec

ALTER ROLE atelier_app
    WITH LOGIN
    PASSWORD :'app_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    NOBYPASSRLS;

REVOKE ALL PRIVILEGES ON DATABASE atelier_solidaire FROM atelier_app;
GRANT CONNECT ON DATABASE atelier_solidaire TO atelier_app;

REVOKE ALL ON SCHEMA public FROM atelier_app;
GRANT USAGE ON SCHEMA public TO atelier_app;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM atelier_app;
GRANT SELECT, INSERT, UPDATE
ON TABLE
    categories,
    workshops,
    arrival_slots,
    slot_categories,
    volunteers,
    volunteer_skills,
    volunteer_slot_assignments,
    reservations,
    prequalification_requests
TO atelier_app;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM atelier_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO atelier_app;

ALTER DEFAULT PRIVILEGES FOR ROLE atelier_admin IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE ON TABLES TO atelier_app;

ALTER DEFAULT PRIVILEGES FOR ROLE atelier_admin IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO atelier_app;
SQL

printf 'PostgreSQL application role atelier_app is ready.\n'
