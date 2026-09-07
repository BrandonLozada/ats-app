# ADR-006 — Guest Application

## Status

Accepted

## Date

2026-09-01

## Context

We must define the technical delivery mechanism for the primary public-facing candidate flow: applying for a job without an account.

## Decision

Guest Apply is the default public candidate flow. There is no mandatory registration.
Public mutation delivery for Guest Apply will be implemented as a Next.js **Route Handler**.

## Alternatives Considered

### Server Actions for Guest Apply
Rejected. While Server Actions are convenient for internal authenticated state, they obfuscate the HTTP boundary, making it harder to implement strict rate limiting, bot protection, and multipart CV uploads across public boundaries.

## Consequences

### Positive
* Explicit HTTP endpoints (`POST /api/...`) are easy to protect with standard API Gateways, rate limiters, and WAFs.
* Standard `multipart/form-data` parsing for large CV uploads.
* Foundation for a future public API.

### Negative / Trade-offs
* Slightly more boilerplate than a Server Action (requires a standard `fetch` call from the client).

## Implementation Constraints

* Guest Apply must not require authentication.
* Internal authenticated mutations MUST use Server Actions.

## Related Decisions
* ADR-005 — Candidate Identity Is Separate from Authentication
* ADR-018 — Next.js Delivery Boundaries
