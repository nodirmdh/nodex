# Project Status

## Current status
- **Done**: Restored admin web visual shell (left sidebar + sectioned pages/tabs + tables + map block) on top of Cloudflare Worker API. Replaced scaffold forms with operational pages for restaurants list/edit, orders list/detail, menu CRUD by restaurant, plus finance/promos/reviews sections and improved JWT login screen with localStorage persistence.
- **Done**: Added launch automation and checklist for Cloudflare-first MVP: `docs/LAUNCH.md`, root scripts (`typecheck:all`, `test:worker`, `dev:*`, `build:*`, `build:all`, `seed:d1`), setup scripts (`tools/setup-d1.ps1`, `tools/setup-d1.sh`), and API smoke script (`tools/smoke-test.ps1`).
- **Done**: Added D1 seed tooling: `worker/scripts/seed.ts` (inserts 2 restaurants + 10 menu items via `wrangler d1 execute`) and `worker/scripts/seed.sql` alternative. Added worker npm script `seed` and updated README with migration/seed commands.
- **Done**: Added Worker secret-based admin role assignment via `ADMIN_TG_IDS` (comma-separated Telegram IDs). `/auth/telegram` now resolves role from this secret (admin override) and persists role updates in `users` table.
- **Done**: Telegram initData verification refactored into `worker/src/telegram/verifyInitData.ts` and `worker/src/telegram/types.ts`; `worker/src/index.ts` now uses the module and maps verification errors to 401. Added `worker/test/verifyInitData.test.ts` (valid, tampered field, wrong bot token, expired auth_date) with Vitest.
- **Done**: Cloudflare MVP scaffold for Restaurants created. Added `worker/` (Hono + D1 + JWT + RBAC), secure Telegram `initData` signature verification by app-specific bot token, D1 migration `db/migrations/0001_init.sql`, shared domain types package `packages/domain`, and minimal dark-theme frontends for `client-miniapp`, `vendor-miniapp`, `admin-web` wired to Worker API.
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
- **Done**: UI refresh foundation: Tailwind + shared UI kit + icons + toasts across admin/vendor/client/courier apps.
- **Done**: UI refresh applied to Vendor Promotions/Account, Client Cart/Checkout/Orders, and Courier Balance/Rating/Profile with skeletons + empty states.
- **Done**: i18n integrated across admin/vendor/client/courier with i18next, language switchers, and Intl-based formatting.
- **Done**: PR-A auth/controls: shared JWT auth helpers, vendor login, client phone registration/login, DEV_MODE fallbacks, upload endpoint, block/unblock fields, and courier full-name exposure in order responses. Admin/vendor/client/courier UIs updated for auth + blocking.
- **Done**: PR-A test stabilization: unified AuthError handling, quote-route test uses repository (no Prisma), Prisma client mocks expanded to avoid 500s in unit tests.
- **Done**: PR-B order lifecycle updates: unified state machine (HANDOFF_CONFIRMED, COMPLETED), handoff/delivery codes, pickup/self-delivery flows, and courier/vendor endpoints aligned across apps.
- **Done**: PR-C vendor schedule + geo: VendorSchedule model, timezone, map pickers in vendor/admin, open/closed badges in client, and closed guardrails for quote/order.
- **Done**: PR-D media uploads + UI polish: vendor/menu images via `/files/upload`, image previews across admin/vendor/client, modal scroll lock, and i18n key readiness (values default to keys).
- **Done**: PR-E i18n production: ru/uz/kaa/en translations generated, language detection via Telegram/browser, and persisted language switchers.
- **Done**: Courier login endpoint + miniapp login/logout with JWT; vendor READY handler fixed; asset URL resolver added for images across apps; fulfillment translations wired; vendor READY test added.
- **Done**: i18n label fixes (ru/uz/kaa/en), language selector labels set to RU/UZ/QA/EN, courier avatar upload (file-based), vendor schedule UI cleaned up (opening hours hidden), and courier order DTO code fields guarded with test coverage.
- **Done**: Courier JWT-only scoping enforced (no header courierId), courier isolation test added, and courier code UI guarded to avoid handoff_code crashes. Page header duplication reduced in client/courier/vendor views.
- **Done**: Courier pickup step labels corrected to mean courier pickup from vendor (not self-pickup).
- **Done**: Courier pickup/handoff/deliver handlers now guard missing JSON body to avoid `handoff_code` undefined crashes.
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
- (ASSUMPTION) `POST /client/orders` and some endpoints use temporary header-based RBAC (`x-role`, `x-client-id`) until auth/initData verification is implemented; courier endpoints require JWT.
- (ASSUMPTION) COMBO promotions use `value_numeric` as the combo total price; discount applies only if combo price is lower than full sum.
- (ASSUMPTION) BUY_X_GET_Y promotions use `discount_percent` on the "get" items and apply only to full sets.
- (ASSUMPTION) GIFT promotions apply when `items_subtotal` meets `min_order_amount`, and gift items are added at price 0.
- (ASSUMPTION) Courier available orders are DELIVERY orders with status `READY` and no `courier_id` assigned.
- (ASSUMPTION) Tracking endpoint returns the latest courier location only after READY/HANDOFF_CONFIRMED/PICKED_UP; otherwise it returns `null` location.
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
- (ASSUMPTION) Ratings are allowed only after DELIVERED or COMPLETED.
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
- Add a dedicated admin login/token mint endpoint for Cloudflare Worker flow (instead of manual role promotion + token reuse).
- Add Worker endpoint tests (auth verification, RBAC guards, order creation totals) and CI for `worker`.
- Add seed migration/scripts for demo restaurant, menu, and vendor/client users in D1.
- Configure Cloudflare Pages projects and Worker routes/domains in production environments.
- Add auth + Telegram `initData` verification and RBAC.
- Implement PR-D (media uploads, client UI polish).
- Audit remaining screens for UI kit consistency (vendor dashboard/menu/order details, client home/vendor/details, courier home/history).
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
- Complete remaining translations across all locale keys (ru/uz/kaa/en) for full UI coverage.
- Review translations for tone/terminology consistency (optional refinement).

## Active phase
- Phase: 4
- Name: Telegram Mini Apps MVP (Client + Courier) + minimal Vendor Web readiness
- Status: IN PROGRESS

## Agent instructions
- Allowed to work only inside the active phase scope.
- Must stop after completing all deliverables of the active phase.

## 2026-03-05 Cloudflare Restaurants MVP (no courier)
- Done: Worker expanded with compatibility endpoints for restored UI modules: `/vendor/dashboard`, `/vendor/promotions`, `/vendor/reviews`, `/admin/menu-items`, `/admin/promotions`, `/admin/finance`, `/admin/reviews`.
- Done: Vendor mini app restored to old-style tab structure (Overview/Orders/Menu/Promos/Finance/Reviews) with Telegram auto-auth and Worker API adapter.
- Done: Admin login now supports `/auth/admin` (username/password from Worker secrets) in addition to JWT paste mode.
- Done: Client/Vendor API adapter files standardized under `apps/*/src/api/*` for Worker mapping.
- Done: Launch docs updated to state no-courier MVP and simplified order statuses.

### Assumptions (current phase)
- MVP scope is Restaurants-only with vendor-direct delivery; courier roles/screens/flows are deprecated and out of launch path.
- Promos/Reviews/Finance endpoints are placeholders where business logic is not yet migrated; UI must stay navigable and not crash.
- `requirements.md`/`domains.md` still contain legacy courier requirements and need full docs cleanup in a dedicated docs pass.

### TODO (follow-ups)
- Remove legacy courier docs/pages/types completely from `docs/*`, `apps/admin-web/src/pages/*`, and old adapters.
- Align `docs/requirements.md`, `docs/domains.md`, `docs/architecture.md` to Cloudflare Restaurants MVP without courier.
- Finish 1:1 visual parity for old client/admin/vendor components where current adapters still use simplified data.
- Add endpoint tests for new compatibility routes and status transitions (`NEW -> ACCEPTED -> COOKING -> ONWAY -> DELIVERED/CANCELLED`).
