# ADR-002 — Multi-Tenancy Strategy

## Status

Accepted

## Date

2026-09-01

## Context

The ATS is built for AMA Hospital as the first customer, but it is architected as a commercial SaaS product. We must ensure that the architecture natively supports multiple tenants without intermingling data. 

## Decision

The ATS will employ a Shared PostgreSQL Database with a Shared Schema approach for multi-tenancy.
Isolation will be enforced via an explicit `tenantId` on all tenant-owned models.
AMA will be the first Tenant.

## Alternatives Considered

### Single-Tenant First
Rejected because retrofitting multi-tenancy later is error-prone, expensive, and risks major security vulnerabilities.

### Database-Per-Tenant or Schema-Per-Tenant
Rejected for the MVP due to the high operational cost of managing migrations and connections for many small tenants.

## Consequences

### Positive
* Easy to onboard new tenants.
* Unified schema simplifies database migrations.
* Resource pooling reduces database hosting costs.

### Negative / Trade-offs
* Requires rigorous application-level and database-level rules to prevent cross-tenant data leaks.
* Backups and restores for a single tenant require logical extraction rather than a simple database dump.

## Implementation Constraints

* Every tenant-owned persistence operation REQUIRES a `TenantContext`.
* All tenant-owned tables MUST have an explicit `tenantId` column.
* Indexes must be tenant-aware (leading with `tenantId`).
* Tenant isolation tests are mandatory.

## Related Decisions
* ADR-003 — Tenant Isolation Defense-in-Depth
* ADR-004 — Organizational Model
