# ADR-011 — Application Aggregate and Outcome Model

## Status

Accepted

## Date

2026-09-01

## Context

We need a consistent way to track the progression of a candidate through a hiring pipeline, including terminal states like Hired or Rejected. Relying solely on a `isFinal` flag on a pipeline stage is fragile and couples pipeline configuration to business outcomes.

## Decision

The `Application` is a rich Aggregate.
Outcomes are explicitly modeled independently of the pipeline stages:
`NONE`, `HIRED`, `REJECTED`, `WITHDRAWN`, `CANCELLED`.

The `ApplicationStageHistory` tracks movement between stages only. The `AuditLog` tracks changes to the `outcome`.

## Alternatives Considered

### Relying on isFinal Pipeline Stages
Rejected because it requires hardcoding which stages represent a hire vs a rejection, making it difficult to query outcomes consistently across different pipeline versions.

## Consequences

### Positive
* Clear separation between process (stages) and result (outcome).
* Easy to query all "HIRED" applications across all vacancies regardless of pipeline.

### Negative / Trade-offs
* Requires careful state machine logic to ensure stages cannot be changed once an outcome is reached.

## Implementation Constraints

* `currentStage` must belong to the Vacancy's `PipelineVersion`.
* A terminal Application (outcome != `NONE`) CANNOT move to a different stage.
* Stage change + stage history insertion MUST be atomic.

## Related Decisions
* ADR-010 — Hiring Pipeline Versioning
