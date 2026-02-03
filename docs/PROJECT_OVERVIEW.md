# Nodex Delivery Platform — Project Overview (Single Core)

## Core idea (MUST)
Nodex is a unified delivery platform with **ONE backend** and **ONE database**.
All interfaces (Admin Web, Client Mini App, Vendorka Mini App, Courier Mini App)
work with the same domain entities: Vendor, MenuItem, Promotion, PromoCode, Quote, Order, Courier, Tracking.

A created order is a single shared record:
- created by Client,
- immediately visible in Vendorka,
- visible in Admin with full details,
- becomes visible/available in Courier app when eligible,
- tracking updates are stored once and read by Client/Admin.

There is no separate backend per app. No duplicate databases. No sync jobs.

## Interfaces (clients)
1) **Admin Panel (Web)**
   - Full visibility: all vendors, all users, all orders, all promo codes, all promotions, all tracking history.
   - Can create vendors and issue Vendorka accounts (no self-registration for vendor/courier).
   - Can manage global promo codes.
   - Can cancel orders anytime (admin override).

2) **Client App (Telegram Mini App)**
   - Browse vendors and menus.
   - Build cart and request quote.
   - Create order (DELIVERY or PICKUP).
   - Save promo codes in Profile → Promo Codes page.
   - Track active order and courier location after courier acceptance.
   Profile includes Support / Become courier / Become partner actions (Telegram deep link to support chat)

3) **Vendorka (Vendor Cabinet, Telegram Mini App)**
   - Vendor sees only its own data: its profile, its menu, its promotions, its orders.
   - Order flow: NEW → ACCEPTED → COOKING → READY (+ pickup states if PICKUP).
   - Vendor can accept orders and update preparation status.
   - Vendor cannot see other vendors or global admin data.

4) **Courier App (Telegram Mini App)**
   - Courier sees:
     - available orders (not assigned),
     - active assigned order(s),
     - order history,
     - profile/rating/balance.
   - Courier workflow: COURIER_ACCEPTED → PICKED_UP → DELIVERED.
   - Courier posts location updates for active orders only.

## Single domain model (one order, multiple views)
All apps read/write the same entities but with different permissions and fields.

### Example: “Order is created by Client”
- Client sends `POST /client/orders`.
- Backend creates ONE `Order` record + `OrderItems` + snapshot pricing (fees/discounts).
- Immediately:
  - Vendorka sees the order in `/vendor/orders/active` (state NEW).
  - Admin sees the order in `/admin/orders` with full breakdown and metadata.
  - Courier app sees the order in `/courier/orders/available` only when vendor accepted (or by defined policy).

## Source of truth rules
- Database is the source of truth for orders, statuses, promotions, and tracking.
- No app maintains its own “truth” or separate state machines.
- Status changes are performed only via backend endpoints; clients do not directly mutate DB.

## Visibility & RBAC (MUST)
Role-based access controls are mandatory:
- **Admin**: access to everything.
- **Vendor/Vendorka user**: access only to vendor-owned resources (vendor_id-bound).
- **Courier**: access to assigned order(s) + available orders list; cannot access vendor internals.
- **Client**: access only to own orders and profile.

The admin panel must show full details:
- every order with item breakdown, applied discounts, fees, timeline, vendor/courier/client references,
- all vendors, promo codes, promotions, accounts, and audit trail where possible.

## Core flows (high level)

### 1) Quote → Order creation
1. Client calls `/client/cart/quote` (computes totals, applies promotions).
2. Client calls `/client/orders` to create order.
3. Order stores a snapshot:
   - item prices
   - applied promotions
   - service_fee and delivery_fee
   - total

### 2) Vendor preparation flow (Vendorka)
- NEW → ACCEPTED → COOKING → READY
- For PICKUP orders:
  - READY_FOR_PICKUP → PICKED_UP_BY_CUSTOMER

### 3) Courier delivery flow
- COURIER_ACCEPTED → PICKED_UP (requires pickup code) → DELIVERED (requires delivery code)
- Courier location updates stored in OrderTracking and are visible to Client/Admin after acceptance.

## Codes & security (MUST)
- Pickup and delivery codes exist.
- Codes are stored hashed only (never plaintext).
- Telegram Mini Apps must send initData; backend verifies initData signature on every request.
- Rate limit sensitive endpoints (auth, code attempts, tracking updates).

## Terminology (UI vs domain)
- UI may refer to vendor points as "Outlets".
- Current domain model: **Vendor = one physical point** (single outlet) with address and geo.
- Multi-outlet brands may be added later as a separate entity (Partner/Brand + Outlets).

## Non-goals (for now)
- No separate microservices unless explicitly planned.
- No external payment integration unless Phase plan says so.
- No “shadow” state machines in client apps.
