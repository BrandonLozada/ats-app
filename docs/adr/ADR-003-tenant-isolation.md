# ADR-003 — Tenant Isolation Defense-in-Depth

## Status

Accepted

## Date

2026-09-01

## Context

Using a shared schema for multi-tenancy (ADR-002) creates the risk of accidental cross-tenant data exposure or mutation if a query omits the `tenantId` filter. We need a robust strategy to prevent this.

## Decision

We will implement a Defense-in-Depth strategy for tenant isolation consisting of:
1. `TenantContext` passed through the Application layer.
2. Tenant-aware persistence APIs (Repositories).
3. Compound tenant Foreign Keys at the database level.
4. Prisma Client Extensions act as a fail-closed defense-in-depth validation/enforcement safety net for supported operations.
5. Raw SQL restrictions.
6. Mandatory integration/security tests.

The system must ALWAYS FAIL CLOSED.

## Alternatives Considered

### Row-Level Security (RLS)
Considered but deferred. While PostgreSQL RLS is powerful, managing the current context via session variables in a connection-pooled serverless environment (Next.js) introduces significant complexity. May be evaluated later.

### Relying Solely on Prisma Extensions
Rejected. Prisma Extensions cannot safely guarantee isolation across deeply nested writes or complex raw SQL. They are a fallback, not the primary mechanism.

## Consequences

### Positive
* Multi-layered security reduces the likelihood of catastrophic data leaks.
* Fail-closed design ensures bugs result in errors, not exposed data.

### Negative / Trade-offs
* Increased schema verbosity (compound FKs).
* Developers must be hyper-aware of context passing.

## Implementation Constraints

* The Prisma Client Extension is NOT the sole isolation guarantee.
* Nested Prisma writes must be explicitly modeled for safety.
* Raw SQL against tenant data requires explicit `tenantId` binding and manual review.

## Related Decisions
* ADR-002 — Multi-Tenancy Strategy
