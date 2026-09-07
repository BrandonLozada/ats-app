# ADR-007 — Candidate Deduplication

## Status

Accepted

## Date

2026-09-01

## Context

Candidates often apply multiple times using different variations of their email or phone number, or are added manually by recruiters. Enforcing a strict `UNIQUE` constraint on the database level for email/phone creates blocking errors when data is messy or when a family shares an email.

## Decision

Candidate `email` is NOT unique. Candidate `phone` is NOT unique.

We will store and index `emailNormalized` and `phoneNormalized` (tenant-scoped) to facilitate soft deduplication.
Duplicate detection will be channel-independent and tenant-scoped.
There will be NO automatic merge of Candidate records.

## Alternatives Considered

### Strict Unique Email Constraint
Rejected because it breaks when a recruiter tries to add a candidate who already applied, or when spouses share an email address, requiring complex error handling and forced manual resolution before data entry.

## Consequences

### Positive
* No blocking database errors during high-volume ingestion.
* Recruiters maintain control over merging records.

### Negative / Trade-offs
* The database will contain duplicate representations of the same physical person until a recruiter merges them.
* Application logic must group or flag these potential duplicates.

## Implementation Constraints

* Remove unique constraints on Candidate email and phone.
* Create non-unique indexes on `emailNormalized` and `phoneNormalized` scoped by `tenantId`.

## Related Decisions
* ADR-008 — Application Active Uniqueness
