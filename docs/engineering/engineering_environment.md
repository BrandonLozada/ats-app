# ATS Engineering Environment

**Iteración 5 — Skills & Engineering Environment**
**Date:** 2026-09-01
**Status:** Defined

This document defines the engineering environment, quality gates, guardrails, and conventions to enforce the Target Architecture defined in Iteration 3/4. 

---

## 1. Current Environment Audit

*   **Package Manager:** pnpm (workspace configured).
*   **TypeScript:** Enabled, strict mode. Missing `typecheck` script explicitly. No extreme strict flags beyond `strict: true`.
*   **Linting:** ESLint 9 (Flat Config via `eslint.config.mjs`) extending Next.js rules. No architectural import restriction rules configured yet.
*   **Formatting:** Relies on ESLint. Prettier is NOT installed.
*   **Tests:** No testing framework (Vitest/Jest) or E2E framework (Playwright) installed yet.
*   **CI:** No `.github/workflows/` exist.
*   **AI Instructions:** `AGENTS.md` and `CLAUDE.md` correctly point to Target Architecture and `/docs/ai/AI_CONTEXT.md`.
*   **Prisma Tooling:** Native adapter `@prisma/adapter-pg` installed. Schema at `prisma/schema.prisma`. 
*   **Scripts:** Missing `validate` and `typecheck` scripts (added dynamically in Iteration 5).

## 2. AI Agent Strategy

*   **Canonical Source:** `/docs/ai/AI_CONTEXT.md` is the single source of truth for AI instructions.
*   **Generic Agents:** Point to `AGENTS.md`.
*   **Claude:** Point to `CLAUDE.md`.
*   AI instruction files refer to ADRs and Architecture rather than duplicating rules. If an instruction file conflicts with an ADR, the ADR wins.

## 3. Instruction File Strategy

*   `AGENTS.md`: Focuses on validation commands, security/boundaries, and pointing to canonical sources.
*   `CLAUDE.md`: Claude Code-specific 10-point checklist.
*   We DO NOT use `.cursorrules` yet to avoid fragmentation unless Cursor is explicitly adopted by the team later.

## 4. Recommended Skills

If the local agent tooling supports it, create the following review skills. Do NOT create an "implement-any-feature" skill.

1.  **Skill A — ATS Architecture Guard:** Reviews proposed changes against `AI_CONTEXT`, Target Architecture, and ADRs. Output: `PASS`, `PASS WITH ISSUES`, `BLOCKED`.
2.  **Skill B — Tenant Security Review:** Audits a vertical slice for cross-tenant leakage (`TenantContext`, filters, compound FKs, nested writes, raw SQL).
3.  **Skill C — Prisma Migration Review:** Validates schema changes (Better Auth integrity, `partialIndexes` preview, compound FKs, destructive drops).

## 5. TypeScript Rules

*   **Status:** `strict: true` and `noEmit: true` are enabled.
*   **Decision:** Maintain current strict mode. DEFER adopting ultra-strict rules (e.g., `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) to avoid massive unrelated migration noise.
*   **Action:** Added `pnpm typecheck` to package scripts.

## 6. Import/Architecture Guards

*   **Decision:** We will rely on ESLint `no-restricted-imports`.
*   **Status:** RECOMMENDED FOR ITERATION 6. 
*   **Target Rules:**
    *   `modules/*/domain/**` cannot import `@prisma/*`, `next/*`, `better-auth/*`, `infrastructure/*`.
    *   `modules/*/application/**` cannot import `infrastructure/*`, `@prisma/*`.
    *   `src/app/**` cannot import `modules/*/infrastructure/*`.

## 7. Server-Only Rules

*   **Decision:** Protect secure backend code from leaking to the browser.
*   **Target Files:** `infrastructure/*`, `platform/infrastructure/*`, `composition.server.ts`, `public.server.ts`.
*   **Convention:** Must include `import "server-only";` at the top.
*   **Status:** IMPLEMENTED (via convention). RECOMMENDED FOR ITERATION 6 (via lint rule).

## 8. Environment Variables

*   **Decision:** Fail fast on missing server secrets. Never expose secrets via `NEXT_PUBLIC_`. Centralize server env access.
*   **Status:** `.env.example` tracks names. Secrets are not committed. 
*   **Recommendation:** Use Zod in `src/config/env.ts` to validate process.env on startup.

## 9. Prisma Command Discipline

*   **Rule:** Migrations must remain version-controlled. `db:reset` is explicitly omitted from standard scripts to prevent accidental data loss.
*   **Commands Added:** `db:generate`, `db:validate`, `db:migrate:dev`, `db:migrate:status`, `db:studio`.

## 10. Testing Strategy

*   **Domain/Application:** Unit tests (fast, database-free). Testing transitions, policies, normalization logic.
*   **Integration:** Database-backed. Tests tenant isolation, compound FKs, partial unique constraints, and adapters.
*   **E2E:** Playwright (deferred). Testing guest apply, recruiter login, pipeline movement.
*   **Test Data:** Use focused builders/factories (e.g., `createCandidateFixture`), not giant global fixtures.

## 11. Tenant Security Testing

*   **Decision:** Mandatory security test matrix.
*   **Matrix:** 
    *   Tenant A cannot read Tenant B Candidate.
    *   Tenant A cannot update Tenant B Candidate.
    *   Tenant A cannot link Application to Tenant B Vacancy.
    *   Cross-tenant resource lookup returns `NotFound`.
    *   Raw persistence adapter without `TenantContext` fails closed.
*   **Status:** RECOMMENDED FOR ITERATION 6 / implementation.

## 12. Validation / Quality Gates

*   **Canonical Command:** `pnpm validate`
*   **Executes:** `typecheck` and `lint` sequentially.
*   **Future (Iteration 6+):** Will expand to include unit tests (`vitest run`).

## 13. Logging / Audit Separation

*   **Technical Logging:** Diagnostics, operations. Do NOT log CV contents, passwords, tokens, full PII.
*   **AuditLog (ADR-015):** Business/compliance history. Append-only, transactional.
*   **Rule:** Do not use `AuditLog` as an application logger, and do not use console logs as an audit trail.

## 14. Git / CI Strategy

*   **Git Hooks:** Husky/lint-staged are DEFERRED. `pnpm validate` is sufficient for MVP.
*   **CI:** DEFERRED. When implemented in Iteration 6+, minimum pipeline is: install → Prisma validate → typecheck → lint → tests → build.

## 15. Naming Conventions

*   **Files:** `kebab-case.ts` (e.g., `create-application.use-case.ts`, `candidate.repo.ts`, `application.schema.ts`).
*   **Errors:** Domain errors should be typed classes. Target: `TenantIsolationError`, `ApplicationDuplicateError`.
*   **Result Type:** Adopt a single `Result<T,E>` pattern during structural migration. Do not proliferate competing Result classes.
*   **Zod:** Input validation schemas belong in `modules/*/application/schemas/`. Do not duplicate every domain aggregate as a Zod schema.
*   **Prisma Mapping:** Map Prisma records to domain aggregates only when required. Read adapters may project directly to DTOs. Avoid ceremonial `Mapper` proliferation.

## 16. Dependency Policy

*   **Rule:** Avoid package cleanup detached from vertical migration. Do NOT remove unused packages until the corresponding vertical slice is fully migrated and old code deleted.

## 17. Better Auth Guard

*   **Rule:** Before modifying `auth.ts`, plugins, or `User`/`Session`/`Account`/`Verification` models, read **ADR-019**. Framework-owned models must not be casually redesigned.

## 18. Prisma Preview Guard

*   **Rule:** The architecture relies on the `partialIndexes` preview feature for Application uniqueness.
*   **Protocol:** Before implementation: validate Prisma version -> enable preview -> `prisma validate` -> create migration -> inspect SQL -> test concurrency. If it fails, fallback to raw SQL.

## 19. Canonical Commands

| Purpose | Command |
| :--- | :--- |
| Install | `pnpm install` |
| Dev | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Validate All | `pnpm validate` |
| Prisma Generate | `pnpm db:generate` |
| Prisma Validate | `pnpm db:validate` |

## 20. Decisions for Iteration 6

1.  **ESLint Architecture Rules:** Implement the `no-restricted-imports` rules for Domain/Application/Infrastructure.
2.  **Testing Framework:** Install and configure Vitest for unit/integration tests.
3.  **Result Class Consolidation:** Select and enforce a single `Result` class implementation.
4.  **Test Database Setup:** Define environment scripts for integration testing against a dedicated test database.
