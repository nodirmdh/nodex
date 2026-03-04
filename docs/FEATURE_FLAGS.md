# Feature Flags

Feature flags allow gradual rollout without breaking the system.

## Principles
- Feature flags are evaluated on backend
- Frontend adapts based on backend response
- Flags can be global or vendor-specific

## Planned flags
- FEATURE_FULL_PROMOTIONS
- FEATURE_MULTI_OUTLET
- FEATURE_SCHEDULED_PICKUP
- FEATURE_PAYOUTS
- FEATURE_DYNAMIC_DELIVERY

## Usage
- Disabled by default
- Enabled per vendor or globally
- Removal only after feature is fully stable

## Rules
- Feature flags must be documented
- Flags must not alter existing behavior when disabled
