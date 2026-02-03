# Order State Transitions

This document defines the ONLY allowed order state transitions.
Any transition outside this table is forbidden.

## Vendor preparation states
| From | To | Actor |
|-----|----|-------|
| NEW | ACCEPTED | VENDOR |
| ACCEPTED | COOKING | VENDOR |
| COOKING | READY | VENDOR |

## Pickup flow (PICKUP orders only)
| From | To | Actor |
|-----|----|-------|
| READY | READY_FOR_PICKUP | SYSTEM |
| READY_FOR_PICKUP | PICKED_UP_BY_CUSTOMER | CLIENT |

Conditions:
- Vendor category must be RESTAURANTS
- vendor.supports_pickup = true

## Courier delivery states (DELIVERY orders only)
| From | To | Actor |
|-----|----|-------|
| READY | COURIER_ACCEPTED | COURIER |
| COURIER_ACCEPTED | PICKED_UP | COURIER (pickup code required) |
| PICKED_UP | DELIVERED | COURIER (delivery code required) |

## Cancellation
| State | Who | Notes |
|-----|-----|------|
| ANY | ADMIN | Admin override |
| NEW | VENDOR | Before ACCEPTED only |

Courier cancellation is NOT allowed.

## Forbidden transitions
- Skipping states
- Reverting states
- Client updating vendor or courier states
- Courier updating vendor states

## Enforcement
- Transitions must be validated at service layer
- Invalid transitions must return 400/409 errors
- All transitions must be logged
