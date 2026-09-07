# ADR-016 — Privacy and Data Provenance

## Status

Accepted

## Date

2026-09-01

## Context

We must track how we acquired a candidate's data (Data Provenance) and whether they have consented to our privacy policy (Privacy Acknowledgment). A previous legacy concept `CandidateLead` conflated lead tracking with recruitment workflows.

## Decision

`DataProvenance` != `PrivacyAcknowledgment`.

`DataProvenance` (1:N with Candidate) records acquisition/enrichment events (source, channel).
`PrivacyAcknowledgment` (1:N with Candidate) records actual acknowledgment of a `PrivacyPolicyVersion`.

The legacy concept `CandidateLead` is DELETED. `DataProvenance` is a NEW concept with different semantics.

## Alternatives Considered

### Repurposing CandidateLead
Rejected because `CandidateLead` represented a parallel recruiting workflow. `DataProvenance` is strictly a record of origin.

## Consequences

### Positive
* Clear separation between data origin tracking and legal consent tracking.
* Accurate compliance reporting.

### Negative / Trade-offs
* Requires inserting multiple records during Candidate creation.

## Implementation Constraints

* Manual recruiter capture does NOT fabricate consent; it creates a `DataProvenance` record but requires separate mechanisms to obtain `PrivacyAcknowledgment`.
* `CandidateLead` -> DELETE.
* `DataProvenance` -> NEW.

## Related Decisions
* ADR-014 — Transaction Architecture
