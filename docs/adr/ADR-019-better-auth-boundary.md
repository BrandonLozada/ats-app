# ADR-019 — Better Auth Boundary

## Status

Accepted

## Date

2026-09-01

## Context

We use Better Auth for authentication. Its models (`User`, `Session`, `Account`, `Verification`) are tightly integrated with its framework. Attempting to completely decouple from or redesign these models leads to constant friction and broken library updates.

## Decision

Better Auth core models are framework/infrastructure-owned.
The ATS Application layer consumes `CurrentActor`, not Better Auth `Session` objects directly.

Verified ID behavior:
* `User.id`: `String @db.Uuid`, DB-generated.
* `Session/Account/Verification` IDs: `String` (Text), Better Auth generated (`crypto.randomUUID()`).

Foreign keys pointing to `User` (e.g., `TenantMembership.userId`, `Candidate.authUserId`) MUST use `String @db.Uuid`.

## Alternatives Considered

### Abstracting Authentication Behind a Generic Port
Considered, but pragmatically, the database schema provided by Better Auth is pervasive. We abstract the *current user state* via `CurrentActor` but accept the Better Auth tables in the Prisma schema as-is.

## Consequences

### Positive
* We can use Better Auth plugins and updates without schema conflicts.
* `User` IDs are clean UUIDs compatible with PostgreSQL native functions.

### Negative / Trade-offs
* `Session` and `Account` tables use text UUIDs, but since we don't query them in the ATS business logic, this is acceptable.

## Implementation Constraints

* Do not casually redesign framework-owned models.
* Foreign keys to `User` must match `String @db.Uuid`.

## Related Decisions
* ADR-001 — Modular Monolith
* ADR-005 — Candidate Identity Is Separate from Authentication
