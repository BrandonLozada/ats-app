# Architecture Decision Records (ADR)

ADRs describe architectural decisions.
`target_architecture.md` describes the current accepted target.
`AI_CONTEXT.md` tells coding agents how to operate.

If an ADR conflicts with a newer ADR marked Accepted/Superseding, the newer ADR wins.

| ADR | Title | Status | Summary |
| --- | ----- | ------ | ------- |
| [ADR-001](ADR-001-modular-monolith.md) | Modular Monolith | Accepted | Use Modular Monolith, Selective DDD, Lightweight CQRS |
| [ADR-002](ADR-002-multi-tenancy.md) | Multi-Tenancy Strategy | Accepted | Shared DB, Shared Schema, Explicit tenantId |
| [ADR-003](ADR-003-tenant-isolation.md) | Tenant Isolation Defense-in-Depth | Accepted | TenantContext + Compound FKs + Prisma Extension (fail-closed) |
| [ADR-004](ADR-004-organizational-model.md) | Organizational Model | Accepted | Tenant → LegalEntity → Location; Tenant → Department |
| [ADR-005](ADR-005-candidate-identity.md) | Candidate Identity | Accepted | Candidate != User; Guest Apply requires no User |
| [ADR-006](ADR-006-guest-application.md) | Guest Application | Accepted | Guest Apply via Route Handler |
| [ADR-007](ADR-007-candidate-deduplication.md) | Candidate Deduplication | Accepted | Email/Phone are not unique; Use soft dedup |
| [ADR-008](ADR-008-application-uniqueness.md) | Application Active Uniqueness | Accepted | 1 active Application per tenant/candidate/vacancy |
| [ADR-009](ADR-009-vacancy-model.md) | Vacancy Model | Accepted | Single Vacancy concept (no Position/Requisition distinction for MVP) |
| [ADR-010](ADR-010-hiring-pipeline.md) | Hiring Pipeline Versioning | Accepted | Published versions are immutable |
| [ADR-011](ADR-011-application-aggregate.md) | Application Aggregate & Outcome | Accepted | Outcome (HIRED/REJECTED/etc.) is decoupled from stages |
| [ADR-012](ADR-012-authorization-model.md) | Authorization Model | Accepted | Role-based; DO NOT use professional titles as roles |
| [ADR-013](ADR-013-prisma-boundary.md) | Prisma Boundary & Dependency Inversion | Accepted | Domain/Application never imports Prisma |
| [ADR-014](ADR-014-transaction-architecture.md) | Transaction Architecture | Accepted | App defines atomic scope, Infrastructure implements it |
| [ADR-015](ADR-015-audit-vs-domain-events.md) | Audit vs Domain Events | Accepted | Audit is transactional; Domain Events are post-commit best-effort |
| [ADR-016](ADR-016-privacy-and-data-provenance.md) | Privacy and Data Provenance | Accepted | DataProvenance != PrivacyAcknowledgment; CandidateLead deleted |
| [ADR-017](ADR-017-cv-file-storage.md) | CV/File Storage | Accepted | FileStoragePort; Temporary upload -> DB Tx -> Compensate on fail |
| [ADR-018](ADR-018-nextjs-delivery-boundaries.md) | Next.js Delivery Boundaries | Accepted | App Router is delivery layer; Mutations via Server Actions/Route Handlers |
| [ADR-019](ADR-019-better-auth-boundary.md) | Better Auth Boundary | Accepted | Framework-owned models; User.id is String @db.Uuid |
| [ADR-020](ADR-020-read-architecture.md) | Read Architecture | Accepted | Lightweight CQRS; Read adapters bypass domain for DTOs |
