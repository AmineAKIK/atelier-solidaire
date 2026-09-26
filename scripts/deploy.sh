#!/usr/bin/env bash
set -euo pipefail

# This script must be run from the repository root.
COMPOSE_FILE="deploy/compose.prod.yml"
ENV_FILE="deploy/.env"
PROJECT_NAME="atelier-solidaire-prod"
BACKUP_DIR="deploy/backups"
CURRENT_STEP="startup"

fail() {
  printf '[FAIL] %s\n' "$CURRENT_STEP" >&2
  exit 1
}

trap fail ERR

ok() {
  printf '[OK] %s\n' "$1"
}

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Run this script from the repository root." >&2
  exit 1
fi

CURRENT_STEP="prerequisites"

command -v docker >/dev/null 2>&1
docker compose version >/dev/null
docker info >/dev/null
command -v curl >/dev/null 2>&1

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing deploy/.env. Copy deploy/.env.example and set real secrets." >&2
  exit 1
fi

set -a
# deploy/.env contains generated hexadecimal secrets and simple scalar values.
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

required_variables=(
  POSTGRES_ADMIN_PASSWORD
  POSTGRES_APP_PASSWORD
  MONGO_ADMIN_PASSWORD
  MONGO_APP_PASSWORD
  ADMIN_API_TOKEN
  FRONTEND_ORIGIN
  VITE_WORKSHOP_ID
)

for variable in "${required_variables[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Missing required variable in deploy/.env: $variable" >&2
    exit 1
  fi
done

ok "prerequisites"

COMPOSE=(
  docker compose
  --project-name "$PROJECT_NAME"
  --env-file "$ENV_FILE"
  -f "$COMPOSE_FILE"
)

wait_for_health() {
  local service="$1"
  local container_id
  local status

  container_id="$("${COMPOSE[@]}" ps -q "$service")"

  if [[ -z "$container_id" ]]; then
    echo "Container not found for service: $service" >&2
    return 1
  fi

  for _ in $(seq 1 60); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"

    if [[ "$status" == "healthy" ]]; then
      return 0
    fi

    if [[ "$status" == "unhealthy" || "$status" == "exited" || "$status" == "dead" ]]; then
      echo "Service $service entered state: $status" >&2
      "${COMPOSE[@]}" logs "$service" >&2
      return 1
    fi

    sleep 2
  done

  echo "Timed out waiting for $service healthcheck." >&2
  "${COMPOSE[@]}" logs "$service" >&2
  return 1
}

CURRENT_STEP="pre-deployment backup"
existing_postgres="$("${COMPOSE[@]}" ps -a -q postgres)"

if [[ -n "$existing_postgres" ]]; then
  "${COMPOSE[@]}" start postgres >/dev/null
  wait_for_health postgres

  mkdir -p "$BACKUP_DIR"
  timestamp="$(date +%Y%m%d-%H%M%S)"
  backup_path="$BACKUP_DIR/atelier_solidaire_${timestamp}.dump"

  "${COMPOSE[@]}" exec -T \
    -e PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" \
    postgres \
    pg_dump -U atelier_admin -d atelier_solidaire -Fc > "$backup_path"

  printf 'Backup created: %s (%s)\n' "$backup_path" "$(du -h "$backup_path" | cut -f1)"
else
  printf 'No existing PostgreSQL container; skipping pre-deployment backup.\n'
fi

ok "pre-deployment backup"

CURRENT_STEP="image build"
"${COMPOSE[@]}" build api front
ok "image build"

CURRENT_STEP="database startup"
"${COMPOSE[@]}" up -d postgres mongo
wait_for_health postgres
wait_for_health mongo
ok "database startup"

CURRENT_STEP="database migrations"
COMPOSE_FILE="$COMPOSE_FILE" \
COMPOSE_PROJECT_NAME="$PROJECT_NAME" \
COMPOSE_ENV_FILE="$ENV_FILE" \
DB_USER="atelier_admin" \
DB_NAME="atelier_solidaire" \
DB_PASSWORD="$POSTGRES_ADMIN_PASSWORD" \
./database/scripts/migrate.sh
ok "database migrations"

CURRENT_STEP="PostgreSQL application role"
COMPOSE_FILE="$COMPOSE_FILE" \
COMPOSE_PROJECT_NAME="$PROJECT_NAME" \
COMPOSE_ENV_FILE="$ENV_FILE" \
POSTGRES_ADMIN_PASSWORD="$POSTGRES_ADMIN_PASSWORD" \
POSTGRES_APP_PASSWORD="$POSTGRES_APP_PASSWORD" \
./database/scripts/create-app-role.sh
ok "PostgreSQL application role"

CURRENT_STEP="application startup"
"${COMPOSE[@]}" up -d api front
wait_for_health api
wait_for_health front
ok "application startup"

CURRENT_STEP="smoke tests"
health_body="$(curl --fail --silent --show-error http://127.0.0.1:8080/api/health)"

if ! grep -q '"postgresql":{"status":"ok"' <<<"$health_body"; then
  echo "PostgreSQL health is not ok: $health_body" >&2
  exit 1
fi

if ! grep -q '"mongodb":{"status":"ok"' <<<"$health_body"; then
  echo "MongoDB health is not ok: $health_body" >&2
  exit 1
fi

curl --fail --silent --show-error --output /dev/null http://127.0.0.1:8080/
ok "smoke tests"

printf '\nDeployment completed successfully.\n'
printf 'Front: http://127.0.0.1:8080/\n'
printf 'Health: http://127.0.0.1:8080/api/health\n'
