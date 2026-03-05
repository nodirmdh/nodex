# Requirements

## Glossary (short)
- **Vendorka**: Vendor cabinet (Telegram Mini App) for a single physical vendor point.
- **Vendor**: A single physical point with one address and geo coordinates.
- **Promo code**: Admin-managed, global discount code saved by clients.
- **Promotion**: Item-level or order-level discount rule (non-stackable per item).

## Functional requirements by role

### Client (Telegram Mini App)
- Browse categories: **RESTAURANTS**, **PRODUCTS**, **PHARMACY**, **MARKET**.
- View vendor menu and item availability.
- Build cart and request a quote with promotions applied.
- Select delivery address from map (required) and provide a **required delivery comment** (landmark/instructions).
- Apply saved promo codes (optional) at order level.
- Track active order status and courier location after courier acceptance.
- View order history and ratings.
- Provide an optional **vendor_comment** (special instructions) for the order:
  - e.g., "no onions", "no spicy", "allergy notes", "sauce separately"
  - Visible to the vendor (Vendorka) and admin.
  - Separate from delivery_comment (landmark/instructions).


### Courier (Telegram Mini App)
- Accept available orders.
- Progress workflow: **Accept → Picked Up → Delivered**.
- Enter pickup code (from vendor) and delivery code (from client); only hashed codes stored server-side.
- Manage profile (editable), rating, balance.
- Set delivery mode: **WALK**, **SCOOTER**, **CAR**.

### Vendorka (Vendor Cabinet, Telegram Mini App)
- View active orders and history.
- Accept orders and update preparation status.
- Manage menu (CRUD).
- Create and manage promotions (Акции).
- View finance: orders, average check, revenue.
- View statistics: reviews, rating.
- Manage vendor profile.

### Admin (Web)
- Create vendors and issue Vendorka accounts (no self-registration).
- Manage global promo codes.
- Manage promotions and catalog oversight.
- Cancel orders (admin-only cancellation supported at any time).

## Business rules
- **Single backend + single database** for all interfaces.
- **One vendor = one physical point** with `address_text` and geo coordinates (lat/lng).
- **Pickup (self-pickup)** is allowed **only for RESTAURANTS** and only if `vendor.supports_pickup = true`.

## Fees (service fee + delivery fee)

- **Service fee** applies to **all orders** (DELIVERY and PICKUP):
  - `service_fee = 3000`
- **Delivery fee** applies only to DELIVERY orders:
  - `delivery_fee = 3000 + ceil(distance_km) * 1000`
  - This implies a **minimum delivery fee of 3000** even for very short distances.
  - `distance_km` is haversine distance from vendor geo to client delivery geo.
- **Pickup orders**:
  - `delivery_fee = 0`
  - `service_fee = 3000`
- **Delivery comment is required** for every delivery order.

## Promotions requirements
- Supported promotion types:
  - `FIXED_PRICE`
  - `PERCENT`
  - `COMBO`
  - `BUY_X_GET_Y`
  - `GIFT`
- Promotions do **not stack** on the same item units.
- Apply promotions in order:
  1. `COMBO`
  2. `BUY_X_GET_Y`
  3. `FIXED_PRICE` / `PERCENT`
  4. `GIFT`
  5. Promo code (optional, order-level)
- Client must see counters:
  - `promo_items_count`
  - `combo_count`
  - `buyxgety_count`
  - `gift_count`

## Client saved promo codes
- Clients can store promo codes in Profile → “Promo Codes”.
- Promo codes are **global** and managed in Admin.

## Courier tracking
- Once a courier accepts an order, the client can see courier location on a map.

## Order state machine (summary)
| Track | States | Notes |
| --- | --- | --- |
| Vendor | NEW → ACCEPTED → COOKING → READY | Vendor-driven preparation flow. |
| Delivery | READY → HANDOFF_CONFIRMED → PICKED_UP → DELIVERED → COMPLETED | Courier confirms handoff, then delivery code completes delivery. |
| Pickup | READY → HANDOFF_CONFIRMED → COMPLETED | Vendor confirms pickup code; no courier assigned. |
| Cancel | CANCELLED | Admin can cancel anytime. Vendor can cancel only **before acceptance** (ASSUMPTION). |

