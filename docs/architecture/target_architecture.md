# ATS Target Architecture

**Iteración 4 — ADRs + Persistent AI Documentation**
**Fecha:** 2026-09-01
**Estado:** Target Architecture Frozen. ADRs formalized. Ready for Iteration 5 — Skills & Engineering Environment.

---

## 1. Executive Summary

This document defines the finalized, comprehensive Target Architecture for the AMA Hospital ATS. It translates the domain and architecture decisions from Iterations 1-3.1.1 into a concrete, implementable technical design. It defines the exact source tree, module boundaries, Prisma schema, tenant isolation strategy, and Next.js delivery patterns. The target is a **Modular Monolith** using Next.js App Router, Prisma, and Better Auth, with strict dependency inversion to protect domain rules and ensure multi-tenant security.

---

## 2. Verified Technology Versions

Based on repository inspection:
*   **Next.js:** `16.1.6` (App Router, Server Actions, Route Handlers)
*   **Prisma:** `7.6.0` (`@prisma/client`, `prisma`, `@prisma/adapter-pg`)
*   **Database Driver:** `pg` (`8.20.0`)
*   **Better Auth:** `1.5.6`
*   **Zod:** `4.3.6`

**Prisma 7.6 Compatibility Verified:**
*   **Client Extensions:** Supported natively via `$extends`. Used for defense-in-depth isolation.
*   **Interactive Transactions:** Supported natively. Used for application-controlled Unit of Work.
*   **Driver Adapters:** Supported natively (`@prisma/adapter-pg`).
*   **Compound Foreign Keys:** Supported natively via `@@relation(fields: [tenantId, ...], references: [tenantId, ...])`.
*   **Partial Unique Indexes:** Prisma 7.4+ introduced support for partial indexes via `previewFeatures = ["partialIndexes"]`. We will utilize this preview feature to enforce application concurrency uniqueness directly in the PSL if validation succeeds.

---

## 3. Better Auth Native ID Behavior

Better Auth core persistence models are **infrastructure/framework-owned**. The ATS architecture references them but must not casually redesign them. Every future modification must be checked against Better Auth requirements. 

Based on exact inspection of the current `schema.prisma` and `src/lib/auth.ts`:

| Model / FK | Prisma DB Type | Generation Strategy |
| :--- | :--- | :--- |
| `User.id` | `String @db.Uuid` | DB-generated (`gen_random_uuid()`), Better Auth `generateId: false` |
| `Session.id` | `String` (Text) | Better Auth / Node `crypto.randomUUID()` |
| `Account.id` | `String` (Text) | Better Auth / Node `crypto.randomUUID()` |
| `Verification.id` | `String` (Text) | Better Auth / Node `crypto.randomUUID()` |
| **`TenantMembership.userId`** | **`String @db.Uuid`** | Foreign Key to `User.id` |
| **`Candidate.authUserId`** | **`String? @db.Uuid`** | Nullable Foreign Key to `User.id` |
| **`AuditLog.actorUserId`** | **`String? @db.Uuid`** | Nullable Foreign Key to `User.id` |

**Rule:** Better Auth-owned IDs retain the exact type required by the framework integration. Foreign keys pointing to `User` MUST use `String @db.Uuid`. 
**ATS-owned IDs** (e.g., `Tenant.id`, `Candidate.id`, `Vacancy.id`) independently use `UUID` via Prisma `@db.Uuid` and database generation.

---

## 4. Architecture Overview

```text
Next.js App Router (Delivery)
          ↓
Composition Roots (DI Wiring)
          ↓
Application Use Cases (Commands) & Query Adapters (Reads)
          ↓
Domain (Policies, Invariants) & Infrastructure (Prisma, Storage, Email)
```

**Key Pillars:**
1.  **Strict Modular Monolith:** 3 modules (`identity`, `organization`, `recruiting`).
2.  **Explicit Tenancy:** URL-driven tenant routing (`/(protected)/[tenantSlug]/...`).
3.  **Fail-Closed Isolation:** TenantContext + Database Composite FKs + Prisma Extension defense.
4.  **Lightweight CQRS:** Application layer for writes; optimized read adapters for queries.
5.  **Dependency Inversion:** Inner application layers define ports (e.g., `FileStoragePort`); outer infrastructure implements them.

---

## 5. Module Boundaries

1.  **`identity`**: Owns `User`, `Session`, `Account`. Handles Better Auth integration. Exposes `CurrentActor`.
2.  **`organization`**: Owns `Tenant`, `LegalEntity`, `Location`, `Department`, `Role` (tenant-scoped), `Permission` (global), `TenantMembership`. Exposes `TenantContext`, `AuthenticatedContext`, and Role/Permission resolution.
3.  **`recruiting`**: Owns ATS core (`Candidate`, `Vacancy`, `Application`, `HiringPipeline`, `DataProvenance`, `PrivacyAcknowledgment`). Depends on `organization` (for Context).

---

## 6. Final Source Tree

```text
src/
  app/
    (auth)/                   # Public login/register
    (public)/
      api/[tenantSlug]/jobs/  # Route Handlers for Guest Apply (Uploads)
    (protected)/
      [tenantSlug]/           # Internal ATS portal
  
  components/                 # React UI (shadcn, forms, layout)
    ui/
    recruiting/
    organization/

  modules/
    identity/
      infrastructure/         # Better Auth adapter
      public.server.ts        # resolveCurrentActor, API
    
    organization/
      application/            # Tenancy use cases
      domain/                 # Org policies
      infrastructure/         # Prisma repos
      composition.server.ts   # Wiring
      public.server.ts        # API (resolveTenant, resolveAuthContext)
      public.ts               # Types (TenantContext)

    recruiting/
      application/
        use-cases/
        schemas/              # Zod
        ports/                # IApplicationRepo, FileStoragePort
      domain/
        vacancy/              # Policies, enums
        application/          # Aggregate
        pipeline/             # Aggregate
      infrastructure/
        repositories/         # Prisma implementations
        storage/              # FileStoragePort implementation
        queries/              # Read adapters
      composition.server.ts   # Wiring (DI)
      public.server.ts        # Exported Use Cases & Queries
      public.ts               # Exported Types

  platform/                   # Cross-cutting concerns
    application/
      ports/                  # transaction.port.ts, audit.port.ts
    infrastructure/
      database/               # prisma.client.ts, tenant-prisma.extension.ts, transaction.adapter.ts
      audit/                  # prisma-audit.adapter.ts
      email/                  # email port implementations
    shared/                   # Result, Pagination, DomainEvents types
```

---

## 7. Dependency Rules

1. `app/` imports **only** from `components/`, `modules/*/public.server.ts`, and `modules/*/public.ts`.
2. `modules/*/application/` imports **only** from its own `domain/`, `platform/shared/`, and other modules' `public.ts`. NEVER from `infrastructure/`. It defines ports.
3. `modules/*/composition.server.ts` imports from `application/`, `infrastructure/`, and `platform/`. This is the ONLY place infrastructure meets application.

---

## 8. Public APIs

**Example: `modules/recruiting/public.server.ts`**
```typescript
import "server-only";
import { submitGuestApplication } from "./composition.server";
import { findVacancyDetails } from "./composition.server";

export {
  submitGuestApplication,
  findVacancyDetails,
};
```
Everything else in `recruiting` remains private. No barrel exports of infrastructure or aggregates.

---

## 9. Server-Only Boundaries

To prevent secure backend code from leaking to the browser:
*   Every file in `infrastructure/` and `platform/infrastructure/` MUST start with `import "server-only";`.
*   Every `composition.server.ts` and `public.server.ts` MUST start with `import "server-only";`.
*   Application layer use cases do not inherently need `server-only` if they are pure, but composition roots enforce the boundary.

---

## 10. Composition Roots

**Module-Local Server Composition** (`modules/*/composition.server.ts`):
```typescript
import "server-only";
import { prisma } from "@/platform/infrastructure/database/prisma";
import { PrismaCandidateRepository } from "./infrastructure/repositories/prisma-candidate.repo";
import { _submitGuestApplication } from "./application/use-cases/submit-guest-application";

export function getRecruitingDeps() {
  return {
    candidates: new PrismaCandidateRepository(prisma),
    // ...other ports
  };
}

export async function submitGuestApplication(ctx, input) {
  return _submitGuestApplication(ctx, input, getRecruitingDeps());
}
```

---

## 11. TenantContext & Tenant Resolution

**Internal Flow:** URL `/[tenantSlug]/` → Route Layout intercepts slug → calls `resolveAuthenticatedContext(actor, slug)` in `organization`.
**Public Flow:** URL `/[tenantSlug]/jobs` → Route Handler / Server Component calls `resolvePublicTenantContext(slug)` in `organization`.

---

## 12. Authentication & Authorization Flows

```text
Request (Server Action / Route Handler)
  → requireCurrentActor() [identity]
  → requireAuthenticatedContext(actor, tenantSlug) [organization]
  → moveApplicationStage(ctx, input) [recruiting]
    → canManageApplication(ctx) [policy check in domain]
      → Executes logic or returns Result.err(Forbidden)
```

Cross-tenant lookups return `NotFound`.
Same-tenant operations with insufficient permissions return `Forbidden`.

---

## 13. Multi-Tenant Persistence & Prisma Safety

1.  **Explicit `tenantId`:** Required on all tenant-owned models.
2.  **Composite Foreign Keys:** Prevent cross-tenant relations at the database level.
3.  **Prisma Client Extension (Defense-in-Depth):** Intercepts queries to enforce `tenantId`. **Note:** This is an *additional* fail-closed safety mechanism, NOT the authoritative isolation mechanism. Nested writes (e.g., Application → Candidate → Vacancy) MUST be independently validated by persistence logic because extensions cannot guarantee safety across deeply nested relational operations.

---

## 14. Compound Tenant FK Matrix

| Relation | Tenant-aware compound FK? | Reason |
| :--- | :---: | :--- |
| `Application` → `Candidate` | YES | Prevent cross-tenant candidate linkage |
| `Application` → `Vacancy` | YES | Prevent cross-tenant vacancy linkage |
| `Vacancy` → `LegalEntity` | YES | Legal employer isolation |
| `VacancyLocation` → `Vacancy`, `Location` | YES | Coherence inside the same tenant |
| `Vacancy` → `PipelineVersion` | YES | Pipeline isolation |
| `ApplicationStageHistory` → `Application` | YES | Consistency |
| `ApplicationStageHistory` → `PipelineStage`| YES | Ensure stage history matches the tenant pipeline |
| `PrivacyAcknowledgment` → `Candidate` | YES | PII isolation |
| `DataProvenance` → `Candidate` | YES | PII isolation |
| `HiringTeamMember` → `Vacancy` | YES | Authorization boundary |
| `HiringTeamMember` → `TenantMembership` | YES | Match Vacancy tenant context |

---

## 15. Tenant Index Strategy

*   Indexes must prioritize `tenantId` as the leading column.
*   **Candidate:** `@@index([tenantId, emailNormalized])`, `@@index([tenantId, phoneNormalized])`
*   **Vacancy:** `@@index([tenantId, status])`, `@@index([tenantId, slug])`
*   **Application:** `@@index([tenantId, vacancyId])`, `@@index([tenantId, currentStageId])`, `@@index([tenantId, outcome])`
*   **ApplicationStageHistory:** `@@index([tenantId, applicationId, changedAt])`

---

## 16. Target Prisma Model

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["partialIndexes"]
}

// -- IDENTITY (Framework Owned) --
model User { ... } // id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
model Session { ... }
model Account { ... }
model Verification { ... }

// -- ORGANIZATION --
model Tenant {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  slug      String   @unique
  name      String
  logoUrl   String?  // Public branding asset
  faviconUrl String? // Public branding asset
  memberships TenantMembership[]
  legalEntities LegalEntity[]
  departments Department[]
  roles       Role[]
}

model TenantMembership {
  id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String @db.Uuid
  userId    String @db.Uuid // Exact match to User.id
  status    String 
  tenant    Tenant @relation(fields: [tenantId], references: [id])
  user      User   @relation(fields: [userId], references: [id])
  teamRoles HiringTeamMember[]
  roles     MembershipRole[]
  @@unique([tenantId, userId])
  @@unique([tenantId, id])
}

model LegalEntity {
  id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String @db.Uuid
  name      String
  tenant    Tenant @relation(fields: [tenantId], references: [id])
  vacancies Vacancy[]
  locations Location[]
  @@unique([tenantId, id]) 
}

model Location { ... }
model Department { ... }
model Role { ... }
model Permission { ... }
model MembershipRole { ... }
model RolePermission { ... }

// -- RECRUITING --
model Candidate {
  id              String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String  @db.Uuid
  authUserId      String? @db.Uuid // Future account claiming
  
  // PII is normalized and indexed, but NOT unique. Candidate Identity != Email.
  email           String
  emailNormalized String
  phone           String?
  phoneNormalized String?
  firstName       String
  lastName        String
  
  // CV Metadata
  cvStorageKey    String?
  cvFileName      String?
  cvMimeType      String?
  cvSize          Int?
  cvUploadedAt    DateTime? @db.Timestamptz(6)

  applications    Application[]
  provenance      DataProvenance[]
  privacyAcks     PrivacyAcknowledgment[]
  
  @@unique([tenantId, id])
  @@unique([tenantId, authUserId]) // A Better Auth User claims at most one candidate profile per Tenant
  @@index([tenantId, emailNormalized])
  @@index([tenantId, phoneNormalized])
}

model DataProvenance {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @db.Uuid
  candidateId String   @db.Uuid
  source      String
  channel     String
  collectedAt DateTime @db.Timestamptz(6)
  candidate   Candidate @relation(fields: [tenantId, candidateId], references: [tenantId, id])
}

model PrivacyPolicyVersion { ... }
model PrivacyAcknowledgment { ... }

model HiringPipeline { ... }
model PipelineVersion { ... }
model PipelineStage { ... }

model Vacancy {
  id                String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String @db.Uuid
  legalEntityId     String @db.Uuid
  pipelineVersionId String @db.Uuid
  title             String
  slug              String
  status            String // DRAFT, PUBLISHED, PAUSED, CLOSED
  openings          Int    @default(1)
  
  legalEntity       LegalEntity @relation(fields: [tenantId, legalEntityId], references: [tenantId, id])
  pipelineVersion   PipelineVersion @relation(fields: [tenantId, pipelineVersionId], references: [tenantId, id])
  applications      Application[]
  locations         VacancyLocation[]
  team              HiringTeamMember[]
  
  @@unique([tenantId, id])
  @@unique([tenantId, slug])
}

model VacancyLocation { ... }
model HiringTeamMember { ... }

model Application {
  id             String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId       String @db.Uuid
  candidateId    String @db.Uuid
  vacancyId      String @db.Uuid
  currentStageId String @db.Uuid
  outcome        String // NONE, HIRED, REJECTED, WITHDRAWN, CANCELLED
  sourceId       String? @db.Uuid
  rejectionReasonId String? @db.Uuid
  rejectionNotes String?
  appliedAt      DateTime @db.Timestamptz(6)
  
  candidate      Candidate @relation(fields: [tenantId, candidateId], references: [tenantId, id])
  vacancy        Vacancy   @relation(fields: [tenantId, vacancyId], references: [tenantId, id])
  history        ApplicationStageHistory[]
  
  @@unique([tenantId, id])
  
  // Application Duplicate Prevention via Prisma 7.6 Preview Feature (partialIndexes)
  @@unique([tenantId, candidateId, vacancyId], where: { outcome: "NONE" })
}

model ApplicationStageHistory { ... }
model ApplicationSource { ... }
model RejectionReason { ... }

// -- PLATFORM --
model AuditLog { ... }
```

---

## 17. Model Ownership Matrix

| Model | Scope | tenantId | Owner |
| ----- | ----- | -------: | ----- |
| `User`, `Session`, `Account` | BETTER_AUTH_MANAGED | No | `identity` |
| `Tenant`, `TenantMembership` | TENANT_SCOPED | Yes | `organization` |
| `LegalEntity`, `Location`, `Department` | TENANT_SCOPED | Yes | `organization` |
| `Role` | TENANT_SCOPED | Yes | `organization` |
| `Permission` | GLOBAL | No | `organization` |
| `Candidate`, `DataProvenance`, `Privacy*` | TENANT_SCOPED | Yes | `recruiting` |
| `Vacancy`, `VacancyLocation` | TENANT_SCOPED | Yes | `recruiting` |
| `HiringPipeline`, `PipelineVersion`, `PipelineStage` | TENANT_SCOPED | Yes | `recruiting` |
| `Application`, `ApplicationStageHistory` | TENANT_SCOPED | Yes | `recruiting` |
| `AuditLog` | TENANT_SCOPED | Yes | `platform` |

---

## 18. Candidate Persistence

Final Candidate rules:
*   Candidate != User.
*   Tenant-scoped.
*   `email` NOT unique. `phone` NOT unique.
*   `emailNormalized` and `phoneNormalized` are indexed.
*   `authUserId` nullable (future optional Account Claiming). Within a Tenant: one User may claim at most one Candidate.
*   CV metadata (`cvStorageKey`, `cvFileName`, `cvMimeType`, `cvSize`, `cvUploadedAt`) stored consistently directly on Candidate (MVP).

---

## 19. Vacancy Architecture

*   Status: `DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`.
*   A Vacancy belongs to exactly one `LegalEntity`.
*   A Vacancy may reference multiple `Locations` within the same `LegalEntity`.
*   `positionsFilled` is derived dynamically, NOT stored.
*   Vacancy does NOT auto-close.

---

## 20. Pipeline Architecture

`HiringPipeline` (name) → `PipelineVersion` (snapshot) → `PipelineStage`
*   `PipelineVersion` is immutable when PUBLISHED.
*   Exactly one initial `PipelineStage`.
*   `PipelineStage.order` is unique within `PipelineVersion`.
*   `StageCategory` may repeat.
*   `PipelineStage` has NO `isFinal`. `ApplicationOutcome` is the terminal authority.

---

## 21. Application Architecture & Concurrency

**Application Concurrency Invariant:** At most one Application where `outcome=NONE` per `tenantId` + `candidateId` + `vacancyId`. Historical Applications (HIRED, REJECTED, WITHDRAWN, CANCELLED) do not conflict and allow future reapplications.

**Implementation Strategy:**
1.  **Application Layer:** Friendly duplicate pre-check returning `ApplicationDuplicateError`.
2.  **Database Layer:** Partial unique concurrency protection. 
    *   *Primary:* Prisma 7.6 `partialIndexes` Preview feature (`@@unique(..., where: { outcome: "NONE" })`). The index remains declarative and participates in migrations.
    *   *Fallback:* If preview feature validation fails, explicit manual PostgreSQL partial unique SQL migration.

---

## 22. Privacy & DataProvenance

*   `DataProvenance`: NEW model, 1:N with Candidate. Records acquisition history (`source`, `channel`, `collectedAt`).
*   `PrivacyAcknowledgment`: 1:N with Candidate. Records consent to a specific `PrivacyPolicyVersion`.

---

## 23. Roles, HiringTeam & Audit

*   `AuditLog`: Append-only, tenant-scoped, transactional for critical mutations, cross-cutting. Includes actorType, actorUserId, action, entityType, metadata, ip, userAgent.

---

## 24. Transaction Architecture

**Target Pattern:** Application defines WHAT is atomic. Infrastructure defines HOW. No `Prisma.TransactionClient` crosses inward.
```typescript
type TransactionPort = {
  run<T>(work: (deps: RecruitingTxDeps) => Promise<T>): Promise<T>;
};
```
Guest Apply atomic DB unit includes: Candidate resolution/create, Application create, Initial StageHistory, DataProvenance, PrivacyAcknowledgment, and Transactional AuditLog.

---

## 25. Guest Application Flow & File/CV Architecture

**Delivery:** Guest Apply uses a **Route Handler** (`POST /api/[tenantSlug]/jobs/[vacancySlug]/applications`). This provides explicit public endpoints, centralized rate limiting, multipart FormData handling, and bot protection boundary.

**Upload Strategy (Vendor-Neutral `FileStoragePort`):**
Upload *before* DB transaction.
1. Route Handler validates request, rate limits, parses multipart.
2. CV uploaded to object storage via `FileStoragePort` to a temporary namespace (`tmp/{tenantId}/{uploadId}`). Generates `storageKey`.
3. Database transaction executes.
4. If DB transaction fails, best-effort `FileStoragePort.delete(storageKey)` executes. Secondary protection via object storage TTL/periodic orphan cleanup.
5. If DB succeeds, CV is tracked on Candidate. No physical move is strictly necessary.
6. Post-commit ApplicationSubmitted event triggers best-effort confirmation email.

---

## 26. Domain Event Architecture

MVP Events: `ApplicationSubmitted`, `ApplicationStageMoved`, `ApplicationRejected`, `CandidateHired`, `VacancyPublished`, `VacancyClosed`.
Mechanism: Post-commit, in-process, best effort dispatch. Audit is NOT handled by these events for critical facts. No Outbox in MVP.

---

## 27. Read Adapter Surface

Query operations bypass Domain aggregates, live in `infrastructure/queries/`, receive tenant scope, use Prisma directly, and return simple DTOs. Exposed through `public.server.ts`.
Examples: `findPublishedVacancies`, `getPublicVacancyDetails`, `findRecruiterVacancies`, `findApplicationsForKanban`, `searchCandidates`, `getCandidateDetails`, `getApplicationDetails`.

---

## 28. Command / Use Case Surface

Principal MVP operations mapped to use cases:
*   `createLegalEntity`, `updateLegalEntity`, `createLocation`, `updateLocation`, `createDepartment`, `updateDepartment`
*   `assignRole`, `removeRole`
*   `createCandidateByRecruiter`, `updateCandidate`
*   `createVacancy`, `updateVacancy`, `publishVacancy`, `pauseVacancy`, `resumeVacancy`, `closeVacancy`
*   `createPipeline`, `createPipelineVersion`, `publishPipelineVersion`
*   `submitGuestApplication`, `createApplicationByRecruiter`, `moveApplicationStage`, `rejectApplication`, `hireCandidate`
*   `addHiringTeamMember`, `removeHiringTeamMember`

---

## 29. Public Delivery & Internal Routing

*   **Public Delivery:** Next.js Route Handlers for mutations (Guest Apply). Server Components for rendering public job boards (`/(public)/[tenantSlug]/jobs`).
*   **Internal Routing:** Explicit tenant context in URL (`/(protected)/[tenantSlug]/...`). Explicit URL tenant selection provides deep linking, clear context, safe tenant switching, and less hidden state compared to cookie-only tenant sessions.

---

## 30. Error & Validation Strategy

*   **Boundary:** Zod schemas in `modules/*/application/schemas/`. Reusable without importing Next.js.
*   **Application:** Preconditions / policies. Expected failures use `Result` (e.g., `Unauthenticated`, `Forbidden`, `NotFound`, `ApplicationDuplicate`, `InvalidStageTransition`).
*   **Domain:** Business invariants.
*   **Database:** Structural constraints / indexes / FK.
Cross-tenant resource access = `NotFound`. Same-tenant unauthorized = `Forbidden`.

---

## 31. Current → Target Mapping

| Current | Target | Action |
| :--- | :--- | :--- |
| `src/core/` | `modules/*/application/ports` | REWRITE/MOVE |
| `src/domain/` | `modules/*/domain/` | REWRITE (Align to MVP aggregates) |
| `src/application/` | `modules/*/application/use-cases` | REWRITE (Functions, no classes) |
| `src/infrastructure/` | `platform/` & `modules/*/infrastructure/` | REWRITE (Strict boundaries) |
| `CandidateLead` | - | DELETE |
| - | `DataProvenance` | NEW |
| `Organization` | `Tenant` & `LegalEntity` | Inspect useful data, map, and DELETE old abstraction |

---

## 32. Prisma Current → Target Mapping

*   `User`, `Session`, `Account`, `Verification` → KEEP (Better Auth).
*   `Organization` → Split into `Tenant` and `LegalEntity`.
*   `JobPosting` → `Vacancy`.
*   `CandidateLead` → DELETE.
*   `DataProvenance` → NEW.
*   `PipelineStage` → Link to immutable `PipelineVersion`. Remove `isFinal`.
*   `Candidate` → Remove unique constraint on email. Shift to soft dedup.

---

## 33. Risks & Deferred Decisions

1.  **Preview Feature Dependency:** Prisma `partialIndexes` is a Preview API. If validation fails, explicit SQL migration is required.
2.  **UI Component Organization:** Exact physical structure for components is left to implementation.
3.  **Deployment Target:** Next.js deployment platform deferred to Iteration 6.
4.  **Email Templates:** Implementation deferred to later phases.

---

## 34. Roadmap & Readiness

*   `ITERATION 0` — Discovery
*   `ITERATION 1` — Domain & Product Redesign
*   `ITERATION 1.1` — Decision Closure
*   `ITERATION 2` — Architecture Decision Review
*   `ITERATION 2.1` — Technical Architecture Corrections
*   `ITERATION 2.2` — Dependency Inversion Closure
*   `ITERATION 3` — Target Architecture
*   `ITERATION 3.1` — Target Architecture Consistency Fix
*   `ITERATION 3.1.1` — Target Architecture Restoration
*   `ITERATION 4` — ADRs + Persistent AI Documentation ✓
*   `ITERATION 5` — Skills & Engineering Environment (CURRENT)
*   `ITERATION 6` — Implementation Plan
*   `ITERATION 7+` — Incremental Implementation

The Target Architecture provides comprehensive, self-contained, concrete directives for the structural design. The project is ready to move into **Iteration 5 (Skills & Engineering Environment)**.
