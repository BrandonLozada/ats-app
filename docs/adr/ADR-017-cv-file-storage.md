# ADR-017 — CV/File Storage

## Status

Accepted

## Date

2026-09-01

## Context

Candidates upload CVs and other documents. We need a strategy that guarantees data consistency between the database and the file storage system, especially when a transaction fails (e.g., CV uploads successfully but the database commit fails).

## Decision

We will use a vendor-neutral `FileStoragePort` owned by the Recruiting module.
The database stores a stable `storageKey`, not a permanent public URL.
CV access uses authorization + signed/private access.

Upload strategy for Guest Apply:
1. Validate payload.
2. Temporary upload to object storage via port.
3. Database transaction executes.
4. Compensate/delete file on transaction failure (best-effort).
5. Orphan cleanup as a secondary defense (e.g., object storage lifecycle rules).

## Alternatives Considered

### Direct Public S3 URLs in DB
Rejected because CVs contain PII and must be strictly authorized via tenant policies before access is granted.

### DB Transaction First, Then Upload
Rejected because if the upload fails after the DB commits, we have an application pointing to a missing CV, which is a worse state than an orphaned file.

## Consequences

### Positive
* Robust against partial failures.
* Decouples the application from a specific cloud vendor (S3 vs Azure vs GCS).

### Negative / Trade-offs
* Requires implementing compensating transactions for file deletions.

## Implementation Constraints

* Use `FileStoragePort`.
* Guest upload occurs before DB transaction.
* Do not hardcode an object-storage vendor in domain/application logic.

## Related Decisions
* ADR-006 — Guest Application
* ADR-014 — Transaction Architecture
