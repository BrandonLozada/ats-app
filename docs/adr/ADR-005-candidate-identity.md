# ADR-005 — Candidate Identity Is Separate from Authentication

## Status

Accepted

## Date

2026-09-01

## Context

In many systems, every person (Candidate, Recruiter, Admin) is modeled as a "User" in the authentication system. For an ATS, requiring Candidates to create accounts before applying drastically reduces conversion rates.

## Decision

`Candidate != User`.

Better Auth `User` represents the global platform identity (Recruiters, Admins, etc.).
`Candidate` represents a tenant-scoped recruiting identity.
Guest Candidates require no `User` account.
In the future, we may optionally introduce `Candidate.authUserId` to support Account Claiming (where a Candidate registers to track their applications), but it is NOT required.

## Alternatives Considered

### Anonymous Better Auth Users
Rejected because it clutters the auth database with throwaway accounts and complicates password resets, session management, and GDPR compliance for temporary applicants.

## Consequences

### Positive
* High-conversion guest application flow.
* Clean separation of concerns between authentication (identity) and recruitment data (recruiting).

### Negative / Trade-offs
* Candidates cannot natively log in to view application status without building an Account Claiming flow later.

## Implementation Constraints

* Do not create Better Auth Users during the guest application flow.
* A Better Auth User may claim at most one Candidate profile per Tenant.

## Related Decisions
* ADR-006 — Guest Application
* ADR-019 — Better Auth Boundary
