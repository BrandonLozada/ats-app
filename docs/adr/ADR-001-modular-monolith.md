# ADR-001 — Modular Monolith

## Status

Accepted

## Date

2026-09-01

## Context

The experimental repository contains overlapping concepts such as `core`, `domain`, `application`, `infrastructure`, `interfaces`, and `shared` layers scattered across the project. This has resulted in competing implementations and unclear boundaries. We need a clear architectural pattern that enforces boundaries while remaining pragmatic for a Next.js App Router application.

## Decision

We will use a pragmatic Modular Monolith architecture, supported by Selective Domain-Driven Design (DDD) and Lightweight CQRS.
The system is divided into three principal modules: `identity`, `organization`, and `recruiting`.
DDD patterns (Aggregates, Policies) will be used selectively for core business logic with real invariants.
Writes will pass through application use cases (Commands).
Reads may bypass the domain and use optimized infrastructure read adapters returning simple DTOs (Queries).

## Alternatives Considered

### Traditional Layered Monolith
Rejected because it allows cross-domain coupling (e.g., Recruiting logic directly querying User tables), making tenant isolation harder to enforce.

### Microservices
Rejected due to high operational complexity and transaction management overhead not justified for the MVP.

### Full Clean Architecture Ceremony
Rejected as overly verbose for Next.js, requiring excessive mapping between layers even for trivial CRUD.

### Event Sourcing
Rejected due to complexity; current requirements do not demand event-sourced aggregates.

## Consequences

### Positive
* Clear boundaries prevent domain bleed.
* Lightweight CQRS prevents read patterns from forcing compromises on write-model aggregates.
* Fits well within Next.js Server Actions and Route Handlers.

### Negative / Trade-offs
* Requires strict discipline to not bypass the Composition Roots.
* Developers must understand the distinction between a Use Case and a Read Adapter.

## Implementation Constraints

* Modules must not circularly depend on each other.
* Domain and Application layers must never import Prisma or Next.js specifics.
* Read adapters live in `infrastructure/queries/` and return DTOs.

## Related Decisions
* ADR-013 — Prisma Boundary / Dependency Inversion
* ADR-020 — Read Architecture
