# AGENTS.md — ATS App (AMA Hospital)

## Project Overview

**ATS App** is a full-stack Applicant Tracking System (ATS) built for AMA Hospital. It manages job postings, candidate applications, hiring pipelines, interviews, and user roles/permissions.

- **Framework**: Next.js 16 (App Router, full-stack)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM (`@prisma/adapter-pg`)
- **Auth**: `better-auth` (email/password, magic link, Google OAuth)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui, Radix UI
- **Validation**: Zod v4
- **Forms**: React Hook Form + `@hookform/resolvers/zod`
- **Toasts**: Sonner
- **Package manager**: pnpm

---

## Architecture

The project follows a layered, DDD-inspired architecture. Every layer has a specific responsibility — do **not** mix concerns across layers.

```
src/
├── app/                  # Next.js App Router: pages, layouts, API routes, Server Actions
│   ├── (auth)/           # Login, Register pages (unauthenticated)
│   ├── (protected)/      # Authenticated routes (admin, recruiter, candidate, dashboard)
│   ├── (public)/         # Public-facing pages (job board, job detail)
│   ├── (fallbacks)/      # Error/unauthorized pages
│   ├── api/              # Route Handlers (REST endpoints)
│   └── actions/          # Next.js Server Actions
│
├── domain/               # Core business logic — entities, types, errors, permissions
│   ├── application/      # Application aggregate, entity, errors, types
│   ├── auth/             # ABAC permissions
│   └── pipeline/         # Pipeline engine (stage transitions)
│
├── application/          # Use cases, application services, validation schemas
│   ├── use-cases/
│   ├── services/
│   ├── schemas/
│   └── auth/             # Authorization service, route guards
│
├── core/                 # Core service interfaces and repository contracts
│   ├── application/
│   ├── candidate/
│   └── pipeline/
│
├── infrastructure/       # External adapters: DB, auth, audit
│   ├── database/         # Prisma singleton client
│   ├── auth/             # better-auth server/client wrappers
│   ├── audit/            # Audit log service
│   └── prisma/           # Prisma repository implementations
│
├── modules/              # Feature modules (self-contained slices)
│   ├── application/
│   └── candidate/
│
├── interfaces/           # HTTP action wrappers and middleware
│   ├── http/
│   └── ui/types/
│
├── presentation/         # Client-side hooks
├── components/           # React UI components
│   ├── ui/               # shadcn/ui primitives
│   ├── auth/             # Auth forms
│   ├── candidates/
│   ├── jobs/
│   └── sections/
│
├── config/               # Public env vars (`env.ts`)
├── lib/                  # Auth setup (`auth.ts`, `auth-client.ts`), shared utils
├── shared/               # Cross-cutting utils and types
├── utils/                # General helpers (salary formatting, etc.)
├── styles/               # globals.css (Tailwind entry)
└── generated/prisma/     # Auto-generated Prisma client — DO NOT edit manually
```

---

## Path Aliases

The `@/*` alias resolves to `./src/*`.

```ts
import { prisma } from "@/infrastructure/database/prisma.client";
import { auth } from "@/lib/auth";
```

Always use `@/` imports, never relative paths that go more than one level up.

---

## Key Files

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | Server-side `better-auth` config (providers, session, plugins) |
| `src/lib/auth-client.ts` | Client-side auth helpers |
| `src/infrastructure/database/prisma.client.ts` | Prisma singleton (uses `PrismaPg` adapter) |
| `prisma/schema.prisma` | Database schema — source of truth |
| `prisma.config.ts` | Prisma CLI config (schema path, migrations, seed) |
| `src/domain/auth/permissions.ts` | PERMISSIONS constants for RBAC |
| `src/config/env.ts` | Typed public env vars |
| `next.config.ts` | Next.js config (image domains, experimental flags) |

---

## Database & Prisma

- **Provider**: PostgreSQL
- **Adapter**: `PrismaPg` (driver-adapters mode, **not** the classic Prisma engine)
- **Generated client output**: `src/generated/prisma/`
- **Schema**: `prisma/schema.prisma`
- **Migrations directory**: `prisma/migrations/`
- **Seed script**: `tsx prisma/seed.ts` (run via `prisma migrate dev --name <name>`)

### Commands

```bash
# Generate client after schema changes
pnpm prisma generate

# Create and apply a new migration
pnpm prisma migrate dev --name <migration-name>

# Apply migrations in production
pnpm prisma migrate deploy

# Open Prisma Studio
pnpm prisma studio
```

**Never** edit files in `src/generated/prisma/` by hand.

---

## Authentication (better-auth)

- Auth instance: `src/lib/auth.ts` (server)
- Client helpers: `src/lib/auth-client.ts`
- API catch-all route: `src/app/api/auth/[...all]/route.ts`
- Supported methods: email/password, magic link, Google OAuth
- Session duration: 7 days
- IDs: UUIDs auto-generated by the database (`gen_random_uuid()`) for `User`; `crypto.randomUUID()` for other models

### Authorization (ABAC)

Permissions are defined as constants in `src/domain/auth/permissions.ts`. Always use the `PERMISSIONS` object rather than raw strings.

---

## API Routes

Route Handlers live in `src/app/api/`. Current endpoints:

- `GET/POST /api/applications`
- `GET /api/jobs` / `GET /api/jobs/[id]`
- `GET /api/jobs/[id]/pipeline`
- `GET /api/jobs/[id]/funnel`
- `GET /api/jobs/[id]/durations`
- `GET/POST /api/auth/[...all]` — handled by better-auth

Prefer **Server Actions** (`src/app/actions/`) for mutations triggered from the UI. Use Route Handlers only for REST-style endpoints consumed externally or via client-side `fetch`.

---

## Page Route Groups

| Group | Path | Access |
|---|---|---|
| `(auth)` | `/login`, `/register` | Public (unauthenticated) |
| `(public)` | `/`, `/jobs`, `/explore` | Public |
| `(protected)` | `/dashboard`, `/recruiter`, `/candidate`, `/admin`, `/onboarding` | Auth required |
| `(fallbacks)` | `/unauthorized` | Error states |

---

## Coding Conventions

### TypeScript
- Strict mode is enabled. Never use `any` — use `unknown` and narrow types explicitly.
- Use `as const` for constant objects (e.g., permission maps, enum-like values).
- Prefer `type` over `interface` unless declaration merging is needed.

### React / Next.js
- Use **Server Components** by default. Add `"use client"` only when needed (interactivity, browser APIs, hooks).
- Use **Server Actions** for mutations (form submissions, data writes).
- Co-locate page-specific components inside the route folder when they're not reused elsewhere.
- Follow the `kebab-case.tsx` naming convention for component files.

### Naming
- Files: `kebab-case` (e.g., `create-application.use-case.ts`)
- Components: PascalCase export
- Variables/functions: camelCase
- DB models/Prisma: PascalCase
- Environment variables: SCREAMING_SNAKE_CASE

### Validation
- All input validation uses **Zod** schemas.
- Define schemas in `src/application/schemas/` or co-located `*.schema.ts` files inside modules.
- Pair with React Hook Form using `zodResolver`.

### Styling
- Tailwind CSS v4 utility classes only — no custom CSS except in `src/styles/globals.css`.
- Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional class merging.
- Use shadcn/ui components from `src/components/ui/` before creating new primitives.

### Error handling
- Domain errors should be typed classes defined in `src/domain/*/errors.ts`.
- Use `sonner` toasts for user-facing feedback.

---

## Dev Workflow

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev          # runs on http://localhost:3000

# Lint
pnpm lint

# Type check
pnpm tsc --noEmit

# Build
pnpm build
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_URL` | Full base URL of the app (e.g. `http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | Random secret for session signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_APP_NAME` | App display name |
| `NEXT_PUBLIC_SITE_URL` | Public base URL |
| `NEXT_PUBLIC_COMPANY_NAME` | Company name for display |
| `NEXT_PUBLIC_COMPANY_DOMAIN` | Company domain |
| `NEXT_PUBLIC_EMAIL_SERVER_DOMAIN` | Email server domain |

**Never commit secrets to version control.**
