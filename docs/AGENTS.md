# AGENTS.md (Repository Rules)

## Work rules
- **Plan-first**: write or update a short plan before coding or significant edits.
- **Small commits**: keep changes PR-sized and logically grouped.
- **Docs always updated**: update `docs/status.md` after each phase of work.
- **Do not break existing behavior**: preserve compatibility unless explicitly approved.
- **Keep a TODO list**: track follow-ups in `docs/status.md`.

## Stack constraints (LOCKED)
- Backend code must be TypeScript (Node.js). Do not introduce Python services (FastAPI/Django/etc).
- Tests must use Vitest/Jest (no pytest).
- Frontend code must be React + TypeScript (no Vue/Svelte/Angular).


## Read-before-change
- Always read `docs/requirements.md`, `docs/architecture.md`, and `docs/domains.md` before implementing changes.
- If requirements are unclear, document assumptions in `docs/status.md`.

## Testing expectations
- Add or update tests for **pricing** and **promotions** logic with every relevant change.
- Prefer fast, deterministic tests that validate business rules.

## Security expectations
- **Hash order pickup/delivery codes** at rest; do not persist plaintext codes.
- **Verify Telegram `initData`** on every request from Telegram Mini Apps.
- Enforce **RBAC** for admin/vendor/courier/client actions.
- Apply **rate limiting** for code entry attempts and sensitive endpoints.

## Autonomous mode rules
- Agents must rely on docs as the source of truth.
- If multiple docs conflict, priority:
  requirements.md > domains.md > architecture.md > PLANS.md > status.md
- Agents must stop execution after finishing current phase.


