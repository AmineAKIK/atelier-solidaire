# ADR 0002 — Layered API architecture

## Status

Accepted.

## Context

The initial API implemented HTTP validation, PostgreSQL queries, booking rules,
transactions, and error responses directly inside Express route handlers.
That structure kept the first backend small, but it coupled business rules to
Express and made the T-24 booking rule and concurrency behavior difficult to
test without real infrastructure.

The existing Front already depends on the current HTTP routes, status codes,
error codes, and JSON response shapes, so the refactor must preserve that
contract.

## Decision

The API is split into explicit layers:

- `src/http/` owns Express routing, request validation, authentication, and
  HTTP error translation;
- `src/services/` owns business rules and has no Express dependency;
- `src/repositories/` owns PostgreSQL and MongoDB access;
- `src/domain/` contains business errors and shared domain types;
- `src/config/` validates runtime configuration at process startup;
- `createApp(dependencies)` constructs the Express application from injected
  services;
- `server.ts` creates the production PostgreSQL pool, MongoDB client,
  repositories, services, and system clock.

`ReservationService` receives an injected clock so closing-time behavior is
deterministic in unit tests. `ReservationRepository` owns the PostgreSQL
transaction and always releases its client in `finally`. The
`FOR UPDATE OF sc` lock remains part of the repository query so concurrent
requests for the same slot/category are serialized before capacity is read.

Routes translate `BookingError` values through centralized error middleware.
Unexpected failures return only `{ "code": "internal_error" }`, without SQL
messages or stack traces.

HTTP hardening includes Helmet, a 10 KiB JSON body limit, strict CORS origin
comparison, and an explicit `invalid_json` response for malformed JSON.

## Consequences

### Positive

- Business rules are unit-testable without Express or databases.
- HTTP handlers are small and focused on transport concerns.
- Data-access code is centralized and parameterized.
- The concurrency lock is covered by an integration regression test.
- Production wiring and test wiring use the same application factory.
- The existing Front contract remains stable.

### Trade-offs

- More files and dependency interfaces are required than in the original
  route-only implementation.
- Transaction boundaries must remain in the repository layer and cannot be
  bypassed by services.
- Changes to response shapes require explicit contract review because the Front
  depends on them.
