# ADR-013 — Prisma Boundary & Dependency Inversion

## Status

Accepted

## Date

2026-09-01

## Context

Leaking Prisma types (like `Prisma.TransactionClient` or specific model types) into the Domain and Application layers tightly couples business logic to the database schema, making it hard to test and evolve.

## Decision

Domain and Application layers will NEVER import Prisma.
The Application layer defines Ports (interfaces).
The Infrastructure layer implements Adapters.
Composition Roots (`composition.server.ts`) wire the implementations to the use cases.

## Alternatives Considered

### Direct Prisma Usage in Use Cases
Rejected. While fast to write, it violates dependency inversion, makes unit testing business logic impossible without a database, and spreads database concerns throughout the app.

## Consequences

### Positive
* Business logic is easily testable.
* Database schema changes do not necessarily ripple through the entire application.

### Negative / Trade-offs
* Requires defining mapping logic between Prisma models and Domain Aggregates/DTOs.
* More boilerplate.

## Implementation Constraints

* No `Prisma.TransactionClient` may cross inward to the Application layer.
* Target dependency rule: Presentation → Composition → Application → Domain. Infrastructure implements Application ports.

## Related Decisions
* ADR-001 — Modular Monolith
* ADR-014 — Transaction Architecture
