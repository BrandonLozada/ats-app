# ADR-018 — Next.js Delivery Boundaries

## Status

Accepted

## Date

2026-09-01

## Context

Next.js 16 provides multiple ways to handle requests: Server Actions, Route Handlers, and Server Components. We need to standardize their usage to maintain security and consistency.

## Decision

App Router is strictly a delivery layer.
* **Public Careers Reads:** Server Components (e.g., `/[tenantSlug]/jobs`).
* **Guest Apply Mutation:** Route Handler (`POST /api/[tenantSlug]/jobs/[vacancySlug]/applications`).
* **Internal Authenticated Mutations:** Server Actions.
* **Internal Authenticated Reads:** Server Components.

There will be no internal REST API merely for architectural purity.

## Alternatives Considered

### Full REST API for Internal Operations
Rejected. It introduces unnecessary latency, serialization overhead, and redundant type mapping compared to Next.js Server Actions, which integrate seamlessly with React 19 forms.

## Consequences

### Positive
* High performance and excellent developer experience.
* Clear boundaries for public API security (Route Handlers).

### Negative / Trade-offs
* Tight coupling to Next.js in the delivery layer (mitigated by keeping business logic in the application layer).

## Implementation Constraints

* Server Actions / Route Handlers must contain NO business logic. They must only: validate → resolve context → invoke composition/application → map result.
* Protected internal routes must include `tenantSlug` explicitly.

## Related Decisions
* ADR-006 — Guest Application
