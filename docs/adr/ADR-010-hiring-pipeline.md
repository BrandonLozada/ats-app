# ADR-010 — Hiring Pipeline Versioning

## Status

Accepted

## Date

2026-09-01

## Context

If a recruiter edits a hiring pipeline (e.g., adds a "Technical Test" stage) while candidates are already in that pipeline, historical reporting and active applications break because their current stage might disappear or shift in order.

## Decision

Pipelines must be versioned. 
`HiringPipeline` → `PipelineVersion` → `PipelineStage`

Published PipelineVersions are strictly **immutable**.
Editing a used pipeline creates a new `PipelineVersion`. Vacancies reference a specific `PipelineVersion`.

## Alternatives Considered

### Mutable Pipelines
Rejected because it corrupts historical reporting and breaks the state of active applications.

## Consequences

### Positive
* 100% accurate historical reporting.
* Active applications are never stranded in deleted stages.

### Negative / Trade-offs
* More complex data model.
* Requires UI to handle creating new versions and optionally migrating active vacancies to the new version.

## Implementation Constraints

* Exactly one initial stage per version.
* Stage order must be unique inside a version.
* Stage categories can repeat.
* PipelineStage has NO `isFinal` flag. Terminal truth belongs to `ApplicationOutcome`.
