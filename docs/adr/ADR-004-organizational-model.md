# ADR-004 — Organizational Model

## Status

Accepted

## Date

2026-09-01

## Context

The system needs to model the structure of a customer's business. Previously, a generic `Organization` concept was used, which became confusing when trying to map holding companies, legal employers, and physical offices (e.g., AMA Anáhuac vs. AMA Apodaca).

## Decision

We will model the organization strictly as:
`Tenant` → `LegalEntity` → `Location`
`Tenant` → `Department`

Example for AMA:
* Tenant: AMA
* LegalEntity: AMA Anáhuac
* LegalEntity: AMA Apodaca

The generic `Organization` model will be DELETED.

## Alternatives Considered

### Generic Organization with Self-Referential Hierarchy
Rejected because it creates ambiguity. It is unclear if an "Organization" node represents a brand, a legal tax entity, or a physical building, leading to complex and brittle business rules.

## Consequences

### Positive
* Clear semantics for tax/legal boundaries (LegalEntity) vs. physical presence (Location).
* Vacancies can be accurately assigned to legal employers.

### Negative / Trade-offs
* Slightly more rigid than a generic tree, but much safer for ATS compliance.

## Implementation Constraints

* A Vacancy must belong to exactly one LegalEntity.
* A Vacancy may reference multiple Locations within that LegalEntity.

## Related Decisions
* ADR-009 — Vacancy Model
