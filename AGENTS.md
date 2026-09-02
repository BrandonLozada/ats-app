# ATS — AI Agent Engineering Instructions

This repository defines the core Applicant Tracking System (ATS) for AMA Hospital, architected as a commercial multi-tenant SaaS product.

## 1. Mandatory Architectural Context

Before writing code, generating migrations, or proposing structural changes, you MUST read the following canonical sources:

1. `/data/AI_CONTEXT.md` (Mandatory rules and limits)
2. `/data/target_architecture.md` (Target Modular Monolith structure)
3. `/data/adr/` (Accepted Architecture Decision Records)

**DO NOT infer the architecture from the legacy folder structure.** 
The legacy structure is pending migration to the Target Architecture. If existing code conflicts with `/data/target_architecture.md` or ADRs, the **Target Architecture wins**.

## 2. Validation & Commands

Run validation commands before declaring task completion:
* `pnpm typecheck`
* `pnpm lint`
* `pnpm validate` (Runs both)
* `pnpm db:validate` (If Prisma schema is modified)

## 3. Security & Boundaries

* **Tenant Isolation:** Multi-tenancy is security-critical. All persistence operations must be tenant-aware. Always use `TenantContext` and fail closed.
* **Dependency Inversion:** Domain and Application layers must NEVER import `@prisma/client` or Next.js specifics.
* **Server-Only:** Infrastructure files and Next.js mutations must enforce server boundaries (`import "server-only"`).

## 4. Documentation Precedence

If you detect a conflict, adhere to this precedence:
1. Newest Accepted ADR (`/data/adr/`)
2. `/data/target_architecture.md`
3. `/data/AI_CONTEXT.md`
4. This file

DO NOT silently change an Accepted ADR or the Target Architecture. Escalate conflicts to the human developer.
