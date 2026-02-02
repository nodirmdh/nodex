# Implementation Plan

## Phase 0: Docs and setup
**Deliverables**
- Complete core documentation set.
- Establish repo structure and initial conventions.

**Tests**
- Doc linting / markdown checks (if configured).

## Phase 1: DB + `/client/cart/quote` (partial promotions)
**Deliverables**
- Base schema for vendors, menu, orders, and quotes.
- Quote calculation with delivery fee and pickup rules.
- Partial promotions support: FIXED_PRICE and PERCENT.

**Tests**
- Unit tests for delivery fee and partial promotion ordering.

## Phase 2: Full promotions + order create + codes
**Deliverables**
- Full promotions engine (COMBO, BUY_X_GET_Y, GIFT).
- Order creation flow with pickup/delivery codes (hashed at rest).
- Promo codes (order-level) integration.

**Tests**
- End-to-end quote tests verifying non-stacking and ordering rules.
- Code hashing and validation tests.

## Phase 3: Vendorka orders/menu + vendor issuance via admin
**Deliverables**
- Vendorka order management and menu CRUD endpoints.
- Admin endpoints to create vendors and vendorka users.

**Tests**
- API contract tests for vendor/admin flows.

## Phase 4: Courier mini app endpoints + tracking
**Deliverables**
- Courier acceptance workflow and status transitions.
- Courier location tracking for active orders.

**Tests**
- State machine transition tests and tracking updates.

## Phase 5: Admin web endpoints and UI
**Deliverables**
- Admin CRUD for promo codes and promotions.
- Admin order cancellation and reporting.

**Tests**
- RBAC and security tests for admin endpoints.

