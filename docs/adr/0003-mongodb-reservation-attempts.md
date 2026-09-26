# ADR 0003 — MongoDB reservation-attempt journal

## Status

Accepted.

## Context

The association needs to understand how often reservation requests are refused
and why, especially when capacity is insufficient for a workshop category.
The relational reservation database should remain the source of truth for
booking rules and confirmed reservations.

Operational statistics do not require participant identity. Storing names,
email addresses, IP addresses, user agents, or free text in an analytics log
would create unnecessary privacy risk.

The reservation flow must also continue to work when the analytics store is
temporarily unavailable.

## Decision

A MongoDB 8 component stores one `reservation_attempts` document for every
`POST /api/reservations` request that reaches the reservation route.

Each document contains only:

- `workshopId`, `slotId`, and `categoryId` as numbers or `null`;
- `outcome`: `accepted` or `refused`;
- a controlled `reason` value;
- `createdAt`.

No participant name, email address, IP address, user agent, or free-text
problem description is stored.

MongoDB enforces a strict `$jsonSchema` validator. The collection has:

- an index on `{ workshopId: 1, outcome: 1, reason: 1 }` for statistics;
- a TTL index on `createdAt` with a retention period of 180 days.

The application MongoDB user has `readWrite` only on
`atelier_solidaire_logs` and `atelier_solidaire_logs_test`.

Reservation-attempt writes are fire-and-forget from the booking path. Failures
are caught and logged with `console.warn`; they never roll back or delay the
PostgreSQL reservation. A short MongoDB server-selection timeout bounds failed
connection attempts.

The admin statistics endpoint uses a validated positive integer
`workshopId` and an aggregation pipeline
`$match -> $group -> $sort`. Raw request objects are never forwarded to
MongoDB. Access requires a bearer token compared with
`crypto.timingSafeEqual`.

## GDPR and privacy consequences

The journal follows data-minimization principles by excluding direct
participant identifiers and free text. The 180-day TTL limits retention, and
the least-privilege application user limits database access.

The journal is still operational telemetry and should be protected with the
same infrastructure access controls and backup policy appropriate to the
deployment. If future analytics require personal data, that change requires a
separate privacy and retention review rather than extending this document
implicitly.

## Other consequences

- PostgreSQL remains authoritative for reservation creation and capacity.
- MongoDB can be unavailable without preventing API startup or PostgreSQL
  reservations.
- Health checks report PostgreSQL and MongoDB status separately.
- Statistics may temporarily miss events if MongoDB is unavailable, by design,
  because booking availability takes priority over analytics completeness.
