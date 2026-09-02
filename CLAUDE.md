# Claude Code Instructions

1. Read `/data/AI_CONTEXT.md` first.
2. Read `/data/target_architecture.md` for architectural work.
3. Read relevant ADRs in `/data/adr/`.
4. Never infer target architecture from legacy folders.
5. Follow incremental migration to the target architecture.
6. Run validation commands (`pnpm validate`) before declaring completion.
7. Never silently change an Accepted ADR.
8. Do not modify migrations/auth schema casually (refer to ADR-019).
9. Respect tenant security rules (refer to ADR-003).
10. Stop when the task scope is complete.
