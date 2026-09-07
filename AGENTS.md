# ATS — AI Agent Engineering Instructions

This repository defines the core Applicant Tracking System (ATS) for AMA Hospital, architected as a commercial multi-tenant SaaS product.

## 1. Mandatory Architectural Context

Before writing code, generating migrations, or proposing structural changes, you MUST read the following canonical sources:

1. `/docs/ai/AI_CONTEXT.md` (Mandatory rules and limits)
2. `/docs/architecture/target_architecture.md` (Target Modular Monolith structure)
3. `/docs/adr/` (Accepted Architecture Decision Records)
4. `/docs/engineering/implementation_plan.md` (Canonical implementation plan)

**DO NOT infer the architecture from the legacy folder structure.** 
The legacy structure is pending migration to the Target Architecture. If existing code conflicts with `/docs/architecture/target_architecture.md` or ADRs, the **Target Architecture wins**.

## 2. Canonical Implementation Plan

There is exactly one canonical implementation plan:

```
/docs/engineering/implementation_plan.md
```

**Rules:**
- Before planning any Task ID, read `docs/engineering/implementation_plan.md` first.
- Update the existing Task ID section when needed.
- **Never create a second canonical implementation plan.**
- Temporary planning artifacts must not be committed as canonical documentation.

## 3. Validation & Commands

Run validation commands before declaring task completion:
* `pnpm typecheck`
* `pnpm lint`
* `pnpm validate` (Runs both)
* `pnpm db:validate` (If Prisma schema is modified)

## 4. Security & Boundaries

* **Tenant Isolation:** Multi-tenancy is security-critical. All persistence operations must be tenant-aware. Always use `TenantContext` and fail closed.
* **Dependency Inversion:** Domain and Application layers must NEVER import `@prisma/client` or Next.js specifics.
* **Server-Only:** Infrastructure files and Next.js mutations must enforce server boundaries (`import "server-only"`).

## 5. Documentation Precedence

If you detect a conflict, adhere to this precedence:
1. Newest Accepted ADR (`/docs/adr/`)
2. `/docs/architecture/target_architecture.md`
3. `/docs/ai/AI_CONTEXT.md`
4. This file

DO NOT silently change an Accepted ADR or the Target Architecture. Escalate conflicts to the human developer.

## 6. Documentation Map

| Category | Path |
|---|---|
| AI Context | `docs/ai/AI_CONTEXT.md` |
| Target Architecture | `docs/architecture/target_architecture.md` |
| Architecture Decisions | `docs/adr/` |
| Implementation Plan | `docs/engineering/implementation_plan.md` |
| Engineering Environment | `docs/engineering/engineering_environment.md` |
| Product / Domain Design | `docs/product/` |
| Architecture Reviews | `docs/architecture/` |
