# ADR-015 — Audit vs Domain Events

## Status

Accepted

## Date

2026-09-01

## Context

We need to track what happened in the system for both compliance (Audit) and side-effects (e.g., sending emails when an application is submitted).

## Decision

`AuditLog != DomainEvent`.

Critical audit records are written transactionally to the `AuditLog` table alongside the data mutation.
Domain Events (e.g., `ApplicationSubmitted`, `CandidateHired`) are post-commit, in-process, best effort dispatches.

## Alternatives Considered

### Event Sourcing
Rejected for MVP complexity.

### Transactional Outbox for Domain Events
Rejected. While an Outbox guarantees at-least-once delivery, it requires a message broker or background worker, which is too complex for the current MVP. We accept best-effort dispatch for emails.

## Consequences

### Positive
* Rock-solid audit trail for compliance.
* Simple, synchronous architecture for the MVP.

### Negative / Trade-offs
* If the server crashes immediately after commit but before the event handler runs, the email won't be sent. This is acceptable for the MVP.

## Implementation Constraints

* Audit is NOT handled by domain events; it must be part of the DB transaction.
* No Outbox or external message broker for MVP.

## Related Decisions
* ADR-014 — Transaction Architecture
