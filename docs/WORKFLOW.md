# Development Workflow (Autonomous Mode)

This document defines how agents (including CODEX) must continue development
without human intervention.

## General flow
1. Read current project status in `docs/status.md`
2. Identify the active phase from `docs/PLANS.md`
3. Read all relevant docs before coding
4. Write/update plan (short) before implementation
5. Implement features strictly inside current phase scope
6. Add or update tests
7. Update `docs/status.md` (Done / Decisions / TODO)
8. Stop and wait for next instruction if phase boundary is reached

## Phase boundaries
- Agents MUST NOT start a new phase unless:
  - Current phase is marked as DONE in `docs/status.md`
  - Or explicitly instructed by human

## Assumptions rule
- If any rule is unclear:
  - Document it as `(ASSUMPTION)` in `docs/status.md`
  - Implement strictly according to that assumption
  - Never silently assume behavior

## Forbidden actions
- Do not refactor unrelated code
- Do not introduce new technologies
- Do not change business rules without documentation update
