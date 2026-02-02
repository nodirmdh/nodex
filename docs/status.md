# Project Status

## Current status
- **Done**: Initial documentation set created. Phase 1 schema, quote contract, pricing logic, and tests implemented.
- **Not done**: Application runtime/API wiring, remaining promotions, order flows, and UI.

## Phase 1 summary
- **Schema**: `vendors`, `menu_items`, `promotions`, `promotion_items`.
- **Endpoint**: `/client/cart/quote` (contract documented, pricing logic implemented).
- **Tests**: Delivery fee calculations, validations, and FIXED_PRICE/PERCENT promotions.

## Plan (Phase 1)
1. Document the `/client/cart/quote` contract and Phase 1 assumptions.
2. Add a minimal SQL schema for vendors, menu items, promotions, and promotion items.
3. Implement quote/pricing logic with delivery/service fees and partial promotions (FIXED_PRICE, PERCENT).
4. Add unit tests for fee calculation, validations, and partial promotions ordering.
5. Update status and TODOs after implementation.

## Decisions log
- Unified backend with a single Postgres database.
- Four interfaces: Admin Web, Client Mini App, Courier Mini App, Vendorka Mini App.
- One vendor equals one physical point with a single address and geo.
- Pickup allowed only for restaurants and only when `vendor.supports_pickup = true`.
- Delivery fee: `3000 + ceil(distance_km) * 1000` (haversine distance).
- Two order codes (pickup and delivery) stored as hashes only.
- Promotions apply in strict order and do not stack on the same item units.
- Service fee is fixed: `service_fee = 3000` for ALL orders (DELIVERY and PICKUP).
- Delivery fee is separate and delivery-only: `delivery_fee = 3000 + ceil(distance_km) * 1000` (minimum 3000).
- Pickup orders always have `delivery_fee = 0`.
- (ASSUMPTION) Implement Phase 1 pricing/quote logic in a Python module with pytest-based unit tests because no runtime stack is defined yet.
- (ASSUMPTION) Percent promotion discounts are rounded down to the nearest integer amount per unit.
- (ASSUMPTION) When multiple FIXED_PRICE/PERCENT promotions apply to the same item, apply only the single best per-unit discount (no stacking).
- (ASSUMPTION) `POST /client/cart/quote` requires a delivery comment for DELIVERY quotes and rejects other promotion types in Phase 1.
- (ASSUMPTION) `POST /client/cart/quote` is unauthenticated in Phase 1 until auth wiring is defined.
- (ASSUMPTION) `promo_code` is accepted in the quote request but ignored in Phase 1.


## TODO / Next steps
- Wire the `/client/cart/quote` logic into an actual API service.
- Implement full promotions engine (COMBO, BUY_X_GET_Y, GIFT) with tests.
- Add order creation flow with hashed pickup/delivery codes.
