# ADR-014 — Transaction Architecture

## Status

Accepted

## Date

2026-09-01

## Context

Complex operations (like Guest Apply) require modifying multiple aggregates atomically. However, passing Prisma transaction clients into the application layer violates ADR-013.

## Decision

The Application layer defines *WHAT* is atomic. The Infrastructure layer defines *HOW* it is atomic.
We will use a lightweight `TransactionPort` abstraction that allows cross-aggregate workflows to execute within a transaction boundary without knowing about Prisma.

## Alternatives Considered

### Passing Prisma.TransactionClient
Rejected due to strict dependency inversion rules (ADR-013).

### Unit of Work Pattern
Accepted conceptually, but implemented pragmatically via a function-based `TransactionPort.run()` rather than a heavy class-based UoW framework.

## Consequences

### Positive
* Clean application logic completely unaware of Prisma.
* Safe atomic writes.

### Negative / Trade-offs
* Requires implementing a transaction adapter that correctly manages the Prisma Interactive Transaction context.

## Implementation Constraints

* Guest Apply DB transaction includes: Candidate, Application, Initial StageHistory, DataProvenance, PrivacyAcknowledgment, and AuditLog.
* Email dispatch is POST-commit and NOT part of the database transaction.

## Related Decisions
* ADR-013 — Prisma Boundary & Dependency Inversion
