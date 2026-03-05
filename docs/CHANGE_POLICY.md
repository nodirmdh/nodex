# Change & Evolution Policy

This document defines how the Nodex platform must evolve over time
without breaking existing functionality.

## Core principle
The platform is designed as a **stable core with extensible features**.
New functionality must be added in a backward-compatible way.

## What is considered BREAKING (forbidden without versioning)
- Removing existing API fields
- Changing meaning of existing fields
- Changing fee formulas, promotion order, or state machine logic
- Changing visibility rules without RBAC update
- Changing order lifecycle semantics

Breaking changes require:
- New API version (v2)
- OR feature flag
- OR explicit human approval

## Safe changes (allowed)
- Adding new optional fields to API responses
- Adding new database columns (nullable or with default)
- Adding new endpoints
- Adding new promotion types via shared interface
- Adding new admin-only views or reports
- Adding new states that do not invalidate existing transitions

## Feature flags (recommended)
New features should be guarded by feature flags:
- FEATURE_MULTI_OUTLET
- FEATURE_NEW_PROMOTIONS
- FEATURE_PAYOUTS
- FEATURE_SCHEDULED_PICKUP

Flags allow gradual rollout without system-wide risk.

## Database migrations rules
- Always forward-compatible
- New columns must be nullable or have defaults
- Never rewrite history data destructively
- Removal of columns only after long deprecation period

## Tests as safety net
Any change affecting:
- pricing
- promotions
- order states
- visibility (RBAC)

MUST include tests.
If tests fail, the change is invalid.

## Documentation-first rule
Any non-trivial change requires:
1. Documentation update
2. Implementation
3. Tests
4. status.md update

Never implement first and document later.
