# Claude Code Instructions

1. Read `/docs/ai/AI_CONTEXT.md` first.
2. Read `/docs/architecture/target_architecture.md` for architectural work.
3. Read relevant ADRs in `/docs/adr/`.
4. Read `/docs/engineering/implementation_plan.md` before planning any task.
5. Never infer target architecture from legacy folders.
6. Follow incremental migration to the target architecture.
7. Run validation commands (`pnpm validate`) before declaring completion.
8. Never silently change an Accepted ADR.
9. Do not modify migrations/auth schema casually (refer to ADR-019).
10. Respect tenant security rules (refer to ADR-003).
11. Never create a second canonical implementation plan.
12. Temporary planning artifacts must not be committed as canonical documentation.
13. Stop when the task scope is complete.
