# ADR-020 — Read Architecture

## Status

Accepted

## Date

2026-09-01

## Context

Applying strict Domain-Driven Design for every read query (fetching aggregates just to map them to UI DTOs) is highly inefficient and creates N+1 query problems or overly bloated aggregates.

## Decision

We use Lightweight CQRS.
Read adapters may bypass Domain/Application behavior because they contain no mutation/business rules.
Flow: Presentation → Module public server API → infrastructure read adapter → Prisma projection → DTO.

## Alternatives Considered

### QueryBus / CQRS Framework
Rejected. Adds too much boilerplate (Request objects, Handlers) for a Next.js application where simple functions suffice.

### Generic Repository for Reads
Rejected. Generic repositories abstract away the power of SQL/Prisma, making optimized projections difficult.

## Consequences

### Positive
* Highly optimized database queries for complex UI views (like a Kanban board).
* Domain aggregates stay focused on write invariants, not UI requirements.

### Negative / Trade-offs
* Developers must know when to use a Use Case (mutation) vs. a Read Adapter (query).

## Implementation Constraints

* Read adapters MUST preserve tenant isolation by applying `tenantId` constraints.
* No `QueryBus` or `GenericRepository`.

## Related Decisions
* ADR-001 — Modular Monolith
