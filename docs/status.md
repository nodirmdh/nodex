# Project Status

## Current status
- **Done**: Monorepo setup with npm workspaces. Phase 0 tooling added (Node/TypeScript/Vitest). Phase 1 quote contract and pricing logic implemented in TypeScript with Vitest tests. `/client/cart/quote` wired to a minimal Fastify server with Prisma-backed repository and Postgres setup. Admin Web UI implemented (vendors, orders, promo codes, promotions) with API integration and JWT auth. Cleanup pass completed (removed Python artifacts and empty directories). Repo hygiene applied (.gitignore, integration test script, Prisma run steps documented). Phase 2 complete: orders + full promotions + codes + state transitions + domain events + client/vendor/courier endpoints (tracking, availability, location). Docs updated for `vendor_comment` and Profile support buttons.
- **Done**: Enabled CORS for admin web to call API from `http://localhost:5173`.
- **Done**: `/client/cart/quote` now applies promo codes when provided; quote route test updated to send `promo_code`.
- **Done**: Integration test runner uses `vitest.int.config.ts` so `npm run test:int` discovers `*.int.test.ts` on Windows.
- **Done**: Phase 3.2 promo codes backend (DB + admin/client endpoints + pricing) implemented.
- **Done**: Client Mini App and Courier Mini App MVPs added with API wiring, cart persistence, and location updates.
- **Done**: Added client vendor/category endpoints and courier order detail endpoint for mini apps.
- **Done**: Added minimal Telegram initData parsing with DEV_MODE bypass for client/courier endpoints.
- **Done**: Extended Vendor model with name/phone/inn/isActive/openingHours/payoutDetails and added admin create/edit UI.
- **Done**: Added menu item CRUD (schema + admin/vendor endpoints) and admin vendor menu tab.
- **Done**: Added Vendor Web app with DEV_MODE vendor selection, active orders, order status updates, and menu management.
- **Done**: Improved courier miniapp UX with vendor info, stepper, and tracking toggle + status.
- **Done**: Added Admin Web pages for Clients, Couriers, and Settings with supporting admin endpoints.
- **Done**: Vendor active orders now include courier-accepted states; READY returns pickup code to share with courier.
- **Done**: Pickup code is generated only when vendor marks READY (no pre-generation); pickup/delivery code input normalizes leading zeros.
- **Done**: Phase 4.1 stabilization: aligned Prisma schema with API usage, added Client model, and reduced 500s on admin/client/menu endpoints.
- **Done**: Added Prisma seed for demo vendors, menu items, promotions, and promo codes.
- **Done**: Client mini app flow v1: categories filter, vendor details with promotions, menu item details with weight, cart utensils/napkins, address map picker, checkout payment fields.
- **Done**: Client flow fixes: merged utensils/napkins input, Qonirat map default, +998 receiver phone normalization, promo codes single-use per client with status display.
- **Done**: Client orders history + order details screen with ratings submission, profile tabs (account/addresses/promo/support/about), and rating aggregates for vendors/couriers.
- **Done**: Vendor Web v1 pages (dashboard, orders, promotions, stats, menu, account, support) with backend endpoints and reviews.
- **Done**: Promotions v2 builder (all types) + active promotion visibility in client/vendor/admin, with priority/date window support.
- **Done**: Vendor account/profile extended with owner full name, phones, email, INN across admin/vendor.
- **Done**: Courier v1 pages (home slots, history NDA, balance, rating, profile) with new courier endpoints and aggregates.
- **Done**: Shared in-app navigation module (maps + route + ETA) used by client and courier miniapps.
- **Done**: Client delivery map picker now sets location on click (and via geolocation), default center Qonirat, and distance guardrails with backend `DELIVERY_TOO_FAR` validation.
- **Done**: Admin panel upgrades: vendor stats/finance/promotions visibility, order admin actions, courier/client management, and service finance summary.
- **In progress**: Phase 4 mini apps (Client + Courier) and minimal Telegram auth wiring.

## Phase 1 summary
- **Schema**: `vendors`, `menu_items`, `promotions`, `promotion_items`.
- **Endpoint**: `/client/cart/quote` (contract documented, pricing logic implemented in TypeScript).
- **Tests**: Vitest unit coverage for delivery fees, validations, and FIXED_PRICE/PERCENT promotions.

## How to run (local)
1. `npm install`
2. Create `.env` (see `.env.example` for keys)
3. `npm test`
4. `npm run test:integration` (optional, requires Postgres + migrations)
5. `npm run dev:api`
6. `npm run dev:admin`

## Plan (Phase 1)
1. Document the `/client/cart/quote` contract and Phase 1 assumptions.
2. Add a minimal SQL schema for vendors, menu items, promotions, and promotion items.
3. Implement quote/pricing logic with delivery/service fees and partial promotions (FIXED_PRICE, PERCENT).
4. Add unit tests for fee calculation, validations, and partial promotions ordering.
5. Update status and TODOs after implementation.

## Decisions log
- Tech stack locked: TypeScript (Node.js) backend, Postgres, tests via Vitest/Jest. Python/pytest not used.
- Frontend stack locked: React + TypeScript (Vite) for Admin Web and Telegram Mini Apps.
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
- (CORRECTION) Phase 1 pricing/quote logic implemented in TypeScript with Vitest tests. Python/pytest artifacts removed.
- (ASSUMPTION) Percent promotion discounts are rounded down to the nearest integer amount per unit.
- (ASSUMPTION) When multiple FIXED_PRICE/PERCENT promotions apply to the same item, apply only the single best per-unit discount (no stacking).
- (ASSUMPTION) `POST /client/cart/quote` requires a delivery comment for DELIVERY quotes and rejects other promotion types in Phase 1.
- (ASSUMPTION) `POST /client/cart/quote` is unauthenticated in Phase 1 until auth wiring is defined.
- (ASSUMPTION) `POST /client/orders` and courier endpoints use temporary header-based RBAC (`x-role`, `x-client-id`, `x-courier-id`) until auth/initData verification is implemented.
- (ASSUMPTION) COMBO promotions use `value_numeric` as the combo total price; discount applies only if combo price is lower than full sum.
- (ASSUMPTION) BUY_X_GET_Y promotions use `discount_percent` on the "get" items and apply only to full sets.
- (ASSUMPTION) GIFT promotions apply when `items_subtotal` meets `min_order_amount`, and gift items are added at price 0.
- (ASSUMPTION) Courier available orders are DELIVERY orders with status `READY` and no `courier_id` assigned.
- (ASSUMPTION) Tracking endpoint returns the latest courier location only after `COURIER_ACCEPTED`; otherwise it returns `null` location.
- (ASSUMPTION) Rate limiting for code attempts is in-memory per order+courier (or order+role) with short rolling windows; exceeded attempts return 429.
- (ASSUMPTION) Admin promo codes UI stores data locally in the browser until promo code backend is implemented.
- (ASSUMPTION) Promo code matching is case-sensitive and validated against active date range, usage limit, and min order sum (based on items_subtotal).
- (CORRECTION) Promo codes are case-insensitive and normalized to uppercase; inactive or expired codes are rejected.
- (ASSUMPTION) Usage count increments only on successful order creation (quotes do not consume usage).
- (ASSUMPTION) Telegram `initData` validation is stubbed (parses user id only); DEV_MODE allows `x-dev-user: client|courier` to bypass initData checks for local use.
- (ASSUMPTION) Client vendor/menu UI uses placeholder names derived from IDs because vendor/menu names are not yet stored in DB.
- (ASSUMPTION) Client order history is not available until a `GET /client/orders` endpoint is added.
- (ASSUMPTION) Vendor Web UI is not implemented yet; vendor order responses already include `delivery_comment` and `vendor_comment`.
- (ASSUMPTION) Client address is stored locally for MVP; server stores `address_text` and structured fields when provided.
- (ASSUMPTION) Promo codes are single-use per client; reuse returns `PROMO_ALREADY_USED`.
- (ASSUMPTION) Ratings are allowed only after DELIVERED or PICKED_UP_BY_CUSTOMER.
- (ASSUMPTION) Vendor Web DEV_MODE requires `x-dev-user: vendor` and `x-vendor-id` headers.

## Manual QA checklist (Phase 4 client flow)
1. Home: categories filter vendors and search respects selected category.
2. Vendor: menu items show title, description, weight, price; promotions badges render.
3. Vendor: add items shows sticky bar with count/subtotal, переход to Cart works.
4. Cart: quantities update, utensils/napkins counters, vendor comment, totals block shows.
5. Address: map picker sets lat/lng, address fields persist locally, saved address can be reused.
6. Checkout: delivery comment + receiver phone validation, promo code add/select, payment method toggles, quote refresh works.
7. Submit order: order created, Active screen shows status and delivery code when provided.

## Manual QA checklist (Phase 4.2 fixes)
1. Client checkout phone input enforces `+998` prefix and blocks invalid input.
2. Quote/order with reused promo code returns 400 with `PROMO_ALREADY_USED`.
3. Vendor/Courier/Admin order details show utensils, address, receiver phone, and payment/change fields.
4. Client profile shows promo code status (ACTIVE/USED/EXPIRED/INACTIVE).
5. Client Orders page lists active + history and opens order details.
6. Completed order allows rating vendor/courier once; aggregates update.
7. Address picker: click map sets marker, and delivery too far (>30 km) blocks checkout with warning.


## TODO / Next steps
- Add auth + Telegram `initData` verification and RBAC.
- Consider admin CSV export for finance if needed.
- Unskip `tests/quote-repository.int.test.ts` once the test DB is wired in CI/local env.
- Add real vendor/menu item names and categories for client UI.
- Add validation rules for vendor phone/INN formats if required.
- Add tests for menu item validation rules if needed.
- Add vendor auth (Telegram initData verification) for vendor web.
- Consider caching vendor geo to avoid repeated geolocation prompts in courier app.
- Document DEV headers in public docs once auth is finalized.
- Add optional courier model + seed when courier accounts are formalized.
- Remove `napkins_count` from API after deprecation window.

## Active phase
- Phase: 4
- Name: Telegram Mini Apps MVP (Client + Courier) + minimal Vendor Web readiness
- Status: IN PROGRESS

## Agent instructions
- Allowed to work only inside the active phase scope.
- Must stop after completing all deliverables of the active phase.
