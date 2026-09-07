# ADR-008 — Application Active Uniqueness

## Status

Accepted

## Date

2026-09-01

## Context

A candidate should not be actively applying for the exact same job multiple times simultaneously, as this corrupts the pipeline metrics and clutters the Kanban board. However, they should be able to reapply in the future if they were previously rejected or withdrew.

## Decision

We enforce **Application Active Uniqueness**: At most one active Application (where `outcome=NONE`) per `tenantId` + `candidateId` + `vacancyId`.

Protection consists of:
1. Application-level friendly pre-check (returns `ApplicationDuplicateError`).
2. Database-level partial unique index.

Target strategy is to use Prisma 7.6 `previewFeatures = ["partialIndexes"]`.
Fallback: Manual PostgreSQL SQL migration if the preview feature fails validation.

## Alternatives Considered

### Full Unique Constraint on (Candidate, Vacancy)
Rejected because it prevents a candidate from ever reapplying for a role, even years later.

### No Database Constraint
Rejected because concurrent submissions or race conditions could create duplicate active applications, violating core business rules.

## Consequences

### Positive
* Guarantees data integrity for the pipeline.
* Allows legitimate future reapplications.

### Negative / Trade-offs
* Relies on a Prisma Preview feature or requires manual SQL migrations that bypass standard Prisma PSL introspection.

## Implementation Constraints

* Historical terminal Applications (`HIRED`, `REJECTED`, `WITHDRAWN`, `CANCELLED`) remain and do not conflict.
* Use partial unique index where `outcome = 'NONE'`.
