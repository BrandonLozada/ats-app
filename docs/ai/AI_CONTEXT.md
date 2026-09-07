# ATS — Persistent AI Engineering Context

This file is mandatory context for any AI agent modifying the ATS repository.

Before making architectural or domain changes, read:

1. `/docs/ai/AI_CONTEXT.md`
2. `/docs/architecture/target_architecture.md`
3. Relevant ADRs under `/docs/adr/`

Do not infer architecture from legacy folder structure.

## Product Identity
*   **Product:** Commercial multi-tenant ATS SaaS.
*   **First Tenant:** AMA. AMA is NOT a special code path.
*   **Current stack:** Next.js 16, React 19, Prisma 7.6, PostgreSQL, Better Auth 1.5, Zod 4, Tailwind 4.

## Non-Negotiable Domain Decisions
*   Tenant != LegalEntity != Location.
*   Department belongs to Tenant.
*   Candidate != User.
*   Guest Apply requires no account.
*   CandidateLead does not exist in Target Architecture.
*   DataProvenance is a new provenance concept.
*   Candidate email/phone are not unique identity keys.
*   Vacancy is the MVP job-opening model.
*   Published PipelineVersions are immutable.
*   ApplicationOutcome is the terminal authority.
*   HIRED does not create Employee inside ATS.

## Module Ownership
*   Modules: `identity`, `organization`, `recruiting`.
*   `identity` manages authentication. `organization` manages tenancy. `recruiting` manages core ATS functions.
*   **Explicitly prohibited:** `identity` → `organization`/`recruiting`. `organization` → `recruiting` (except according to approved public API dependency direction).

## Dependency Rules
*   Domain/Application never import Prisma.
*   Domain never imports Better Auth or Next.js.
*   App never imports module infrastructure directly.
*   Ports are defined inward. Adapters implement outward.
*   Composition roots perform wiring.
*   No Prisma-specific transaction type crosses inward.
*   No circular module dependencies.

## Multi-Tenant Security Rules (SECURITY-CRITICAL)
*   All tenant-owned persistence operations require `TenantContext`.
*   Tenant isolation fails closed.
*   Every tenant-owned model has explicit `tenantId` unless documented otherwise.
*   Cross-tenant resources appear `NotFound`.
*   Same-tenant permission failure is `Forbidden`.
*   Compound tenant FKs protect critical relations.
*   Client Extension is defense-in-depth only. Do not trust nested Prisma writes automatically.
*   Raw SQL against tenant data requires explicit tenant scope and review.
*   Tenant isolation integration tests are mandatory.

## Candidate Rules
*   Candidate is tenant-scoped.
*   `emailNormalized` and `phoneNormalized` are indexed, NOT unique.
*   Do not automatically merge Candidates.
*   `Candidate.authUserId` is optional. One Better Auth User may claim at most one Candidate per Tenant.
*   Candidate can exist forever without User.

## Application Rules
*   One active Application per Tenant+Candidate+Vacancy.
*   Friendly pre-check + DB partial unique constraint.
*   Terminal historical Applications remain.
*   Stage must belong to Vacancy PipelineVersion.
*   Terminal Application cannot move stage.
*   StageHistory tracks stage movement, not outcomes.

## Pipeline Rules
*   PipelineVersion is immutable once published.
*   Exactly one initial stage.
*   Stage order unique inside version.
*   StageCategory can repeat.
*   Do not add `isFinal`. Outcome controls terminal state.

## Authorization Rules
*   Permissions are global product capabilities.
*   Roles are tenant-scoped.
*   HiringTeamMember is contextual to Vacancy.
*   DOCTOR/NURSE/etc. are NOT authorization roles.
*   Authorization occurs at use case entry using policy functions.

## Delivery Rules
*   **Public Careers:** Server Components for reads.
*   **Guest Apply:** Route Handler.
*   **Internal authenticated mutations:** Server Actions.
*   Server Actions / Route Handlers contain no business logic. They validate → resolve context → invoke composition/application → map result.

## Transactions and Side Effects
*   Application determines transaction scope. Infrastructure executes transactions.
*   Critical AuditLog is written transactionally.
*   Email is post-commit.
*   Domain events are post-commit best effort. No Outbox/message broker in MVP.

## Prisma Rules
*   Prisma 7.6. `partialIndexes` is Preview.
*   Application active uniqueness should use `partialIndexes` if validation passes.
*   Better Auth User.id is `String @db.Uuid` and DB-generated.
*   Better Auth framework-owned models must not be casually redesigned.
*   No Prisma types in Domain/Application.

## File Rules
*   CVs are private. Store `storageKey`, not public URL.
*   Use `FileStoragePort`.
*   Guest upload occurs before DB transaction.
*   Compensate/delete file on transaction failure. Use secondary orphan cleanup.
*   Do not hardcode an object-storage vendor in domain/application.

## Things Agents Must NOT Do
DO NOT:
*   reintroduce CandidateLead
*   reintroduce generic Organization
*   make Candidate.email unique
*   require login to apply
*   create anonymous Better Auth users for candidates
*   add tenant-specific AMA conditionals
*   import Prisma in domain/application
*   access another module's infrastructure directly
*   add microservices
*   add event sourcing
*   add a message broker
*   add a generic repository framework
*   add a DI container
*   add a workflow engine
*   create Employee/onboarding/payroll inside ATS
*   silently change architecture because legacy folders look different

## Legacy Repository Rule
The current/legacy repository structure originated from an experimental learning project and does NOT define the target architecture.
If existing code conflicts with `target_architecture.md`, ADRs, or `AI_CONTEXT.md`, the Target Architecture wins.
Do NOT preserve an old structure merely to minimize file movement. Migration must nevertheless be incremental.

## Decision Escalation Rule
Before changing a settled architecture decision:
1. identify the affected ADR;
2. explain why the accepted decision no longer works;
3. create/suggest a superseding ADR;
4. do NOT silently implement a contradictory design.

## Implementation Discipline
Migration happens through vertical slices. Do not perform repository-wide rewrite unless specifically authorized. New code should target the approved architecture.
When migrating a slice: implement target version -> verify tests -> switch callers -> delete superseded path.

## Documentation Precedence
1. Newest Accepted ADR
2. `target_architecture.md`
3. `AI_CONTEXT.md`
4. `domain_and_product_redesign_1_1_1.md`
5. `architecture_decision_review.md`
6. `discovery_report.md`
7. legacy implementation
