# Role-Based Access Control (RBAC)

This document defines access rules for all roles.

## Roles
- ADMIN
- CLIENT
- VENDOR (Vendorka)
- COURIER

## Global principles
- One order = one shared entity
- Visibility is role-based
- No role bypasses backend checks

## ADMIN
Permissions:
- View ALL data:
  - all orders
  - all vendors
  - all users
  - all promo codes
  - all promotions
  - all tracking history
- Cancel any order at any stage
- Create vendors and issue accounts
- Manage global promo codes
- Full audit visibility
- Admin endpoints require JWT authentication via `/admin/auth/login`

## CLIENT
Permissions:
- View and modify own profile
- Save and remove promo codes
- Create quotes and orders
- View own orders and history
- Track courier after acceptance
- Cannot see vendor or courier internals

## VENDOR (Vendorka)
Permissions:
- View own vendor profile
- Manage own menu
- Manage own promotions
- View ONLY own orders
- Update order preparation states:
  - NEW → ACCEPTED → COOKING → READY
- Cannot access other vendors
- Cannot cancel orders after acceptance

## COURIER
Permissions:
- View available orders (unassigned)
- Accept orders
- Update delivery states:
  - COURIER_ACCEPTED → PICKED_UP → DELIVERED
- Submit location updates for active orders
- View own balance, rating, history
- Cannot cancel orders
- Cannot access vendor data

## Endpoint enforcement
RBAC must be enforced:
- At API layer
- At service layer (business logic)
- Never rely on frontend-only checks

## Admin override
Admin role bypasses normal restrictions,
but actions must be logged.

## Future roles
New roles must be added here before implementation.
