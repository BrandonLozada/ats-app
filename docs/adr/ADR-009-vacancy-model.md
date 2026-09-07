# ADR-009 — Vacancy Model

## Status

Accepted

## Date

2026-09-01

## Context

Enterprise ATS systems often separate the concepts of a Position (budget/headcount), a Requisition (approval to hire), and a Job Posting (the public advertisement). For the MVP, this level of granularity is over-engineered.

## Decision

We will NOT introduce Position, Requisition, and Job Posting as separate concepts.
We will use a single model: `Vacancy`.

A Vacancy has:
* Exactly one LegalEntity.
* One or more Locations within that LegalEntity.
* One PipelineVersion.
* An `openings` count.
* Lifecycle status (`DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`).

## Alternatives Considered

### Full Requisition / Posting Separation
Rejected. This drastically complicates the UI and domain logic for a product that currently only requires posting jobs and tracking candidates against them.

## Consequences

### Positive
* Simple, understandable mental model for recruiters.
* Faster MVP delivery.

### Negative / Trade-offs
* If AMA later requires strict budget/headcount tracking (Position Control), the model will need to be refactored.

## Implementation Constraints

* `positionsFilled` is a derived metric, not a stored column.
* Vacancies do not auto-close in the MVP when openings are filled.

## Related Decisions
* ADR-004 — Organizational Model
