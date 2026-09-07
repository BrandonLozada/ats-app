# ADR-012 — Authorization Model

## Status

Accepted

## Date

2026-09-01

## Context

The ATS needs to control who can do what. Previous legacy models might confuse job titles (e.g., Doctor, Nurse) with security roles. We need a strict Role-Based/Attribute-Based Access Control model.

## Decision

Authorization is strictly hierarchical:
`User` → `TenantMembership` → `Role` → `Permission`

`Permission`: Global product capability (e.g., "vacancies:create").
`Role`: Tenant-scoped grouping of permissions (e.g., "Admin", "Recruiter").

For contextual authorization, we use:
`Vacancy` → `HiringTeamMember`

## Alternatives Considered

### Professional Titles as Roles
Rejected. "Doctor" or "Nurse" are job titles, not security clearances. A Doctor might be a Hiring Manager for one vacancy but have no access to others.

## Consequences

### Positive
* Highly flexible permissions system.
* Contextual authorization allows delegating access to specific vacancies without granting global permissions.

### Negative / Trade-offs
* Authorization logic is more complex than simple `isAdmin` flags.

## Implementation Constraints

* DO NOT use professional titles as ATS security roles.
* Authorization occurs at the entry point of use cases using policy functions (e.g., `canManageApplication(ctx)`).

## Related Decisions
* ADR-004 — Organizational Model
