# Production deployment

## Overview

Atelier Solidaire is deployed as four Docker services behind a single nginx entry point:

```text
browser
  |
  v
nginx / Front (127.0.0.1:8080)
  |-- static Vue application
  |
  +-- /api/* --> API (internal network only)
                  |-- PostgreSQL (internal network only)
                  +-- MongoDB (internal network only)
```

Only nginx publishes a host port in the production Compose file. PostgreSQL,
MongoDB, and the API are reachable only through the Docker network.

The production stack is defined in `deploy/compose.prod.yml`. Runtime secrets
and deployment-specific values are loaded from `deploy/.env`, which must not
be committed.

## Pinned versions

The deployment currently uses:

- Node.js `24.19.0` for the API build/runtime image and Front build image;
- PostgreSQL `16` through `postgres:16-alpine`;
- MongoDB `8` through `mongo:8`;
- nginx `1.30.5` through `nginx:1.30.5-alpine3.24-slim`.

Node.js is fixed by both `.nvmrc` and the Dockerfiles. nginx is pinned to an
exact application and Alpine release. PostgreSQL and MongoDB intentionally
track their requested major release tags and are monitored by Dependabot.

## Service dependencies

Startup order is enforced with health checks:

1. PostgreSQL and MongoDB start first.
2. Production migrations 001 through 004 are applied to PostgreSQL.
3. The least-privilege PostgreSQL role `atelier_app` is created or reconciled.
4. The API starts only after both data stores are healthy.
5. nginx starts only after the API health check succeeds.

Migration 005 is test data and is never applied by the production migration
script.

MongoDB remains non-authoritative for reservations. The API behavior itself
still tolerates MongoDB outages after startup; PostgreSQL remains the source of
truth for bookings.

## Configuration

Copy the example file before deploying:

```sh
cp deploy/.env.example deploy/.env
```

Required values are:

- `POSTGRES_ADMIN_PASSWORD`: PostgreSQL administrator password used only for
  database initialization, migration, backup, and privilege management;
- `POSTGRES_APP_PASSWORD`: password used by the `atelier_app` API role;
- `MONGO_ADMIN_PASSWORD`: MongoDB root password used for administration and
  container health checks;
- `MONGO_APP_PASSWORD`: password used by the least-privilege `atelier_logs`
  user;
- `ADMIN_API_TOKEN`: bearer token protecting the administrative statistics
  endpoint;
- `FRONTEND_ORIGIN`: exact public origin allowed by the API CORS policy;
- `VITE_WORKSHOP_ID`: workshop identifier compiled into the Front image.

Generate every secret independently:

```sh
openssl rand -hex 32
```

The Front Docker build deliberately sets `VITE_API_URL` to an empty value
because nginx exposes the API under the same origin at `/api`. No API service
port is published by Docker Compose.

## First deployment

From the repository root:

```sh
cp deploy/.env.example deploy/.env
# Replace every placeholder secret and review FRONTEND_ORIGIN / VITE_WORKSHOP_ID.
./scripts/deploy.sh
```

The script performs these steps:

1. verifies Docker, Docker Compose, curl, and `deploy/.env`;
2. skips the backup on a first installation because no production PostgreSQL
   container exists yet;
3. builds the API and Front images;
4. starts PostgreSQL and MongoDB and waits for their health checks;
5. applies pending production migrations inside individual transactions;
6. creates or reconciles the `atelier_app` role;
7. starts the API and nginx;
8. verifies `GET /api/health` through nginx and checks the home page.

A successful local demonstration is available at:

```text
http://127.0.0.1:8080/
```

## Updating an existing deployment

Run the same script again:

```sh
./scripts/deploy.sh
```

When an existing PostgreSQL container is present, the script creates a
custom-format `pg_dump -Fc` archive before rebuilding or migrating:

```text
deploy/backups/atelier_solidaire_YYYYMMDD-HHMMSS.dump
```

The backup directory is ignored by Git. Production backups should also be
copied to protected storage outside the application server.

The migration runner records applied files in `schema_migrations`. It skips
already-applied files and wraps each newly applied migration in a transaction.
The deployment then rebuilds images, reconciles the application role, restarts
the application services, and repeats the smoke tests.

## Rollback

Application rollback and database rollback are separate operations.

For an application-only rollback:

1. check out the previously deployed Git revision;
2. keep the current `deploy/.env`;
3. run `./scripts/deploy.sh` again to rebuild and redeploy that revision.

If a database migration must also be rolled back, stop application traffic,
restore the matching pre-deployment custom dump into PostgreSQL, then redeploy
the corresponding application revision. The existing restore tooling can be
used as a reference for `pg_restore --no-owner`; validate the restore in a
separate database before replacing production data whenever possible.

Never treat a Git rollback as an automatic database downgrade.

## Security

Production deployment applies the following controls:

- secrets are stored only in `deploy/.env`, which is ignored by Git;
- the API connects to PostgreSQL as `atelier_app`, not as the administrator;
- `atelier_app` receives `CONNECT`, schema `USAGE`,
  `SELECT/INSERT/UPDATE` on business tables, and sequence `USAGE`; it does
  not receive `DELETE`, ownership, superuser, role creation, database
  creation, or DDL privileges;
- the MongoDB application user has `readWrite` only on the two logging
  databases;
- only nginx is exposed on the host;
- nginx disables version tokens, sends CSP, `X-Content-Type-Options`, and
  `Referrer-Policy` headers, caches immutable Front assets, and enables gzip;
- repeated `POST /api/reservations` requests are rate-limited by nginx and
  receive HTTP 429 once the per-client threshold is exceeded;
- the API keeps its own Helmet headers, request-size limit, strict CORS policy,
  and centralized error handling.

The local demonstration binds nginx only to `127.0.0.1:8080`. A real public
deployment should place a dedicated reverse proxy in front of this nginx
container and terminate HTTPS there with a Let's Encrypt certificate. TLS
automation is intentionally documented rather than implemented in the local
Compose stack.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to
`main`.

It verifies:

- Front dependency installation, non-mutating ESLint, type checking, unit
  tests, and production build;
- API dependency installation, lint, type checking, unit tests, and integration
  tests against PostgreSQL 16 and MongoDB 8;
- API and Front Docker image builds without publishing them.

The API integration job creates `atelier_solidaire_test` from migrations 001
through 005 and initializes the MongoDB test logging database with the same
initialization script used by Docker Compose.

## Version and security watch

Dependabot checks npm dependencies, Docker images, Compose image references,
and GitHub Actions every week.

Use the following official sources when reviewing update PRs or responding to
security notices:

- Node.js releases: https://nodejs.org/en/about/previous-releases
- Node.js security releases: https://nodejs.org/en/blog/vulnerability
- PostgreSQL versioning policy: https://www.postgresql.org/support/versioning/
- PostgreSQL security information: https://www.postgresql.org/support/security/
- MongoDB server release notes: https://www.mongodb.com/docs/manual/release-notes/
- MongoDB security alerts: https://www.mongodb.com/alerts/
- nginx release news: https://nginx.org/en/news.html
- nginx security advisories: https://nginx.org/en/security_advisories.html
- Docker Official Images: https://hub.docker.com/search?image_filter=official

When a pinned component is updated, rerun the complete CI pipeline and both
deployment passes before promoting the new version.
