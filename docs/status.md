# Project Status

## Current status
- **Done**: Initial documentation set created.
- **Not done**: Application code, database schema, services, and UI.

## Decisions log
- Unified backend with a single Postgres database.
- Four interfaces: Admin Web, Client Mini App, Courier Mini App, Vendorka Mini App.
- One vendor equals one physical point with a single address and geo.
- Pickup allowed only for restaurants and only when `vendor.supports_pickup = true`.
- Delivery fee: `3000 + ceil(distance_km) * 1000` (haversine distance).
- Two order codes (pickup and delivery) stored as hashes only.
- Promotions apply in strict order and do not stack on the same item units.

## TODO / Next steps
- Define data schema and core services (Phase 1).
- Implement pricing and quote service with partial promotions.
- Establish testing framework for pricing/promotions rules.

