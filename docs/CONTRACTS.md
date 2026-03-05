# API Contracts & Compatibility Rules

This document defines how API contracts must evolve safely.

## Contract stability
API contracts are considered **public contracts** between:
- Backend and frontend apps
- Backend and future integrations

Once a field exists in a response, it must not be removed or redefined.

## Allowed changes
- Add new fields (optional)
- Add new nested objects
- Add new endpoints

## Forbidden changes
- Removing fields
- Renaming fields
- Changing field meaning or units
- Changing enum semantics

## Versioning strategy
Default strategy:
- Single version (v1) with backward-compatible changes

If breaking change is required:
- Introduce `/v2/...` endpoints
- OR use feature flags

## Snapshot principle
Orders store **pricing snapshots**:
- item prices
- applied promotions
- service_fee
- delivery_fee
- total

Snapshots must never be recalculated or mutated after order creation.

## Contract ownership
- Backend owns the source of truth
- Frontend adapts to backend contracts
- Admin panel reads full contract
- Client/Vendor/Courier read filtered views

## Deprecation policy
If a field or endpoint is planned for removal:
- Mark as deprecated in docs
- Keep for at least one full release cycle
- Remove only after confirmation

## Testing contracts
Critical contracts (quote, order, promotions):
- Must have contract-based tests
- Changes require updating tests

Breaking contract = failing build.

## Auth & Files

### JWT claims (all roles)
```
{
  "sub": "user_id",
  "role": "ADMIN | VENDOR | COURIER | CLIENT",
  "vendorId": "vendor_id (for VENDOR)",
  "courierId": "courier_id (for COURIER)",
  "clientId": "client_id (for CLIENT)"
}
```
Notes:
- Use `Authorization: Bearer <token>` in production for all role-scoped endpoints.
- DEV_MODE supports legacy headers (`x-dev-user`, `x-vendor-id`, `x-client-id`, `x-courier-id`).

### `POST /vendor/auth/login`
Request:
```json
{ "login": "vendor_login", "password": "secret" }
```
Response:
```json
{ "token": "jwt", "vendor_id": "uuid", "is_active": true }
```

### `POST /client/auth/register`
Request:
```json
{ "full_name": "Name", "birth_date": "2000-01-01", "phone": "+998901112233", "password": "secret" }
```
Response:
```json
{ "token": "jwt", "client_id": "uuid", "full_name": "Name", "phone": "+998901112233" }
```

### `POST /client/auth/login`
Request:
```json
{ "phone": "+998901112233", "password": "secret" }
```
Response:
```json
{ "token": "jwt", "client_id": "uuid" }
```

### `POST /client/auth/telegram`
Headers:
- `x-telegram-init-data`: Telegram initData
Response:
```json
{ "token": "jwt", "client_id": "tg:123" }
```

### `POST /files/upload`
Multipart form-data with `file`.
Response:
```json
{ "file_id": "uuid", "public_url": "/uploads/<filename>" }
```

## Client Orders

### `GET /client/categories`
Response:
```json
{ "categories": ["RESTAURANTS", "PRODUCTS", "PHARMACY", "MARKET"] }
```

### `GET /client/vendors`
Response:
```json
{
  "vendors": [
    {
      "vendor_id": "uuid",
      "category": "RESTAURANTS",
      "supports_pickup": true,
      "delivers_self": false,
      "address_text": "Street 1",
      "geo": { "lat": 55.75, "lng": 37.62 },
      "name": "Vendor 123",
      "description": "Optional vendor description",
      "is_active": true,
      "is_blocked": false,
      "is_open_now": true,
      "next_open_at": "2026-02-03T06:00:00.000Z",
      "rating": null,
      "rating_avg": 0,
      "rating_count": 0,
      "active_promotions": ["10% off", "Combo", "Gift", "Promo code available"]
    }
  ]
}
```

### `GET /client/vendors/{vendorId}`
Response:
```json
{
  "vendor_id": "uuid",
  "category": "RESTAURANTS",
  "supports_pickup": true,
  "delivers_self": false,
  "address_text": "Street 1",
  "geo": { "lat": 55.75, "lng": 37.62 },
  "name": "Vendor 123",
  "description": "Optional vendor description",
  "is_active": true,
  "is_blocked": false,
  "is_open_now": true,
  "next_open_at": "2026-02-03T06:00:00.000Z",
  "rating": null,
  "rating_avg": 0,
  "rating_count": 0,
  "active_promotions": ["10% off", "Promo code available"],
  "menu": [
    {
      "menu_item_id": "uuid",
      "title": "Item 123",
      "description": "Optional description",
      "weight_value": 350,
      "weight_unit": "g",
      "price": 10000,
      "is_available": true,
      "promo_badges": ["PERCENT"]
    }
  ]
}
```

### `POST /client/cart/quote`
Returns quote breakdown for a cart snapshot.

Request:
```json
{
  "vendor_id": "uuid",
  "fulfillment_type": "DELIVERY",
  "delivery_location": { "lat": 55.75, "lng": 37.62 },
  "delivery_comment": "Call on arrival",
  "vendor_comment": "No onions",
  "utensils_count": 2,
  "receiver_phone": "+998991112233",
  "payment_method": "CARD",
  "change_for_amount": null,
  "address_text": "Street 1, 10",
  "address_street": "Street 1",
  "address_house": "10",
  "address_entrance": "2",
  "address_apartment": "15",
  "promo_code": "OPTIONAL",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2 }
  ]
}
```
Notes:
- `napkins_count` is accepted temporarily for backward compatibility but merged into `utensils_count`.
Errors:
- `PROMO_ALREADY_USED` when the client has already redeemed the promo code.
Order responses may include `courier`:
```json
{ "courier": { "id": "uuid", "full_name": "Courier Name" } }
```

### `POST /client/orders`
Creates a new order from the client cart snapshot.

**Request body**
```json
{
  "vendor_id": "uuid",
  "fulfillment_type": "DELIVERY",
  "delivery_location": { "lat": 55.75, "lng": 37.62 },
  "delivery_comment": "Call on arrival",
  "vendor_comment": "No onions",
  "utensils_count": 2,
  "napkins_count": 1,
  "receiver_phone": "+998991112233",
  "payment_method": "CARD",
  "change_for_amount": null,
  "address_text": "Street 1, 10",
  "address_street": "Street 1",
  "address_house": "10",
  "address_entrance": "2",
  "address_apartment": "15",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2 }
  ],
  "promo_code": "OPTIONAL"
}
```

**Response body**
```json
{
  "order_id": "uuid",
  "status": "NEW",
  "items_subtotal": 12000,
  "discount_total": 2000,
  "promo_code": "SAVE10",
  "promo_code_discount": 1000,
  "service_fee": 3000,
  "delivery_fee": 4000,
  "total": 17000,
  "promo_items_count": 1,
  "combo_count": 0,
  "buyxgety_count": 0,
  "gift_count": 0,
  "delivery_code": "1234",
  "pickup_code": null
}
```

Notes:
- `delivery_code` is returned only for DELIVERY orders.
- `pickup_code` is returned only for PICKUP orders.
- Until auth is wired, client identity is taken from headers (see `docs/status.md` assumptions).
 - `promo_code` and `promo_code_discount` are returned only if a valid promo code was applied.

### `GET /client/orders/{orderId}`
Returns order summary for the client.

Response:
```json
{
  "order_id": "uuid",
  "status": "NEW",
  "vendor_id": "uuid",
  "vendor_name": "Vendor 123",
  "vendor_geo": { "lat": 55.75, "lng": 37.62 },
  "delivers_self": false,
  "courier_id": "uuid",
  "courier_rating_avg": 4.8,
  "courier_rating_count": 10,
  "fulfillment_type": "DELIVERY",
  "delivery_location": { "lat": 55.75, "lng": 37.62 },
  "delivery_comment": "Call on arrival",
  "vendor_comment": "No onions",
  "utensils_count": 2,
  "receiver_phone": "+998991112233",
  "payment_method": "CARD",
  "change_for_amount": null,
  "address_text": "Street 1, 10",
  "address_street": "Street 1",
  "address_house": "10",
  "address_entrance": "2",
  "address_apartment": "15",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2, "price": 6000, "discount_amount": 1000, "is_gift": false }
  ],
  "items_subtotal": 12000,
  "discount_total": 2000,
  "promo_code": "SAVE10",
  "promo_code_discount": 1000,
  "service_fee": 3000,
  "delivery_fee": 4000,
  "total": 17000,
  "rating": {
    "vendor_stars": 5,
    "vendor_comment": "Great",
    "courier_stars": 5,
    "courier_comment": "On time"
  }
}
```

### `GET /client/orders`
Response:
```json
{
  "orders": [
    {
      "order_id": "uuid",
      "vendor_id": "uuid",
      "vendor_name": "Vendor 123",
      "status": "NEW",
      "total": 17000,
      "fulfillment_type": "DELIVERY",
      "created_at": "2026-02-03T00:00:00.000Z"
    }
  ],
  "next_cursor": "2026-02-01T00:00:00.000Z"
}
```

### `POST /client/orders/{orderId}/rating`
Request:
```json
{
  "vendor_stars": 5,
  "vendor_comment": "Great",
  "courier_stars": 5,
  "courier_comment": "On time"
}
```
Response:
```json
{
  "rating": {
    "vendor_stars": 5,
    "vendor_comment": "Great",
    "courier_stars": 5,
    "courier_comment": "On time",
    "created_at": "2026-02-03T00:00:00.000Z"
  }
}
```

### `GET /client/orders/{orderId}/rating`
Response:
```json
{
  "rating": {
    "vendor_stars": 5,
    "vendor_comment": "Great",
    "courier_stars": 5,
    "courier_comment": "On time",
    "created_at": "2026-02-03T00:00:00.000Z"
  }
}
```

### `GET /client/orders/{orderId}/tracking`
Returns last known courier location only after courier assignment and `READY` (or later).

Response:
```json
{
  "order_id": "uuid",
  "courier_id": "uuid",
  "location": { "lat": 55.75, "lng": 37.62 },
  "updated_at": "2026-02-03T00:00:00.000Z"
}
```

## Courier Flow

### `GET /courier/orders/available`
Returns delivery orders that are `READY` and unassigned.
Response:
```json
{
  "orders": [
    {
      "order_id": "uuid",
      "vendor_id": "uuid",
      "vendor_name": "Vendor 123",
      "vendor_address": "Street 1",
      "vendor_geo": { "lat": 55.75, "lng": 37.62 },
      "delivery_location": { "lat": 55.75, "lng": 37.62 },
      "status": "READY",
      "items_subtotal": 12000,
      "total": 17000,
      "courier_fee": 3000
    }
  ]
}
```

### `GET /courier/orders/{orderId}`
Response:
```json
{
  "order_id": "uuid",
  "status": "READY",
  "vendor_id": "uuid",
  "vendor_name": "Vendor 123",
  "vendor_address": "Street 1",
  "vendor_geo": { "lat": 55.75, "lng": 37.62 },
  "fulfillment_type": "DELIVERY",
  "delivery_location": { "lat": 55.75, "lng": 37.62 },
  "delivery_comment": "Call on arrival",
  "utensils_count": 2,
  "receiver_phone": "+998...",
  "payment_method": "CASH",
  "change_for_amount": 20000,
  "address_text": "Street 1, 10",
  "address_entrance": "2",
  "address_apartment": "15",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2, "price": 6000, "discount_amount": 1000, "is_gift": false }
  ],
  "courier_fee": 3000,
  "total": 17000
}
```

### `POST /courier/orders/{orderId}/accept`
Response:
```json
{ "order_id": "uuid", "status": "READY" }
```

### `POST /courier/orders/{orderId}/handoff`
Request:
```json
{ "handoff_code": "1234" }
```
Response:
```json
{ "order_id": "uuid", "status": "HANDOFF_CONFIRMED" }
```

### `POST /courier/orders/{orderId}/pickup`
Request: empty body if already HANDOFF_CONFIRMED, or provide `handoff_code` (legacy `pickup_code`).
Response:
```json
{ "order_id": "uuid", "status": "PICKED_UP" }
```

### `POST /courier/orders/{orderId}/deliver`
Request:
```json
{ "delivery_code": "5678" }
```
Response:
```json
{ "order_id": "uuid", "status": "DELIVERED" }
```

### `POST /courier/orders/{orderId}/location`
Request:
```json
{ "lat": 55.75, "lng": 37.62 }
```
Response:
```json
{ "order_id": "uuid", "status": "READY" }
```

### `GET /courier/orders/history`
NDA-safe history list (no address/phone).
Response:
```json
{
  "orders": [
    {
      "order_id": "uuid",
      "vendor_id": "uuid",
      "vendor_name": "Vendor 123",
      "status": "DELIVERED",
      "total": 17000,
      "courier_fee": 3000,
      "created_at": "2026-02-03T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20
}
```

### `GET /courier/balance`
Query: `range=today|week|month|custom&from&to`
Response:
```json
{
  "range": "week",
  "from": "2026-02-01T00:00:00.000Z",
  "to": "2026-02-08T00:00:00.000Z",
  "completed_count": 10,
  "gross_earnings": 30000,
  "average_per_order": 3000
}
```

### `GET /courier/profile`
Response:
```json
{
  "courier_id": "uuid",
  "full_name": "Courier Name",
  "phone": "+998...",
  "telegram_username": "user",
  "photo_url": "https://...",
  "delivery_method": "BIKE",
  "is_available": true,
  "max_active_orders": 2,
  "active_orders_count": 1,
  "remaining_slots": 1,
  "delivered_count": 12,
  "rating_avg": 4.8,
  "rating_count": 10
}
```

### `PATCH /courier/profile`
Request:
```json
{
  "full_name": "Courier Name",
  "phone": "+998...",
  "telegram_username": "user",
  "photo_url": "https://...",
  "delivery_method": "CAR",
  "is_available": true,
  "max_active_orders": 2
}
```

### `GET /courier/ratings`
Response:
```json
{
  "ratings": [
    { "order_id": "uuid", "courier_stars": 5, "courier_comment": "On time", "created_at": "2026-02-03T00:00:00.000Z" }
  ]
}
```

## Vendor Orders

### `GET /vendor/orders/active`
Returns current active orders for the vendor (NEW/ACCEPTED/COOKING/READY/HANDOFF_CONFIRMED/PICKED_UP).

### `GET /vendor/orders/history`
Returns completed/cancelled orders for the vendor.

### `GET /vendor/orders`
Query:
- `status=active|history`
- `from`, `to` (ISO dates)
- `page`, `limit`

Response:
```json
{ "orders": [ { "order_id": "uuid", "status": "NEW" } ], "page": 1, "limit": 20 }
```

### `GET /vendor/orders/{orderId}`
Returns vendor order details (same shape as admin order detail subset).

### `POST /vendor/orders/{orderId}/accept`
Response:
```json
{ "order_id": "uuid", "status": "COOKING" }
```

### `POST /vendor/orders/{orderId}/status`
Request:
```json
{ "status": "COOKING" }
```
Response:
```json
{ "order_id": "uuid", "status": "COOKING", "handoff_code": null }
```

### `POST /vendor/orders/{orderId}/pickup`
Confirm pickup order by code.
Request:
```json
{ "pickup_code": "1234" }
```
Response:
```json
{ "order_id": "uuid", "status": "COMPLETED" }
```

### `POST /vendor/orders/{orderId}/deliver`
Confirm self-delivery by code (vendor deliversSelf).
Request:
```json
{ "delivery_code": "5678" }
```
Response:
```json
{ "order_id": "uuid", "status": "DELIVERED" }
```

### `GET /vendor/menu`
Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "vendor_id": "uuid",
      "title": "Burger",
      "description": "Cheese burger",
      "price": 12000,
      "is_available": true,
      "category": "BURGERS",
      "image_url": "https://...",
      "created_at": "2026-02-03T00:00:00.000Z",
      "updated_at": "2026-02-03T00:00:00.000Z"
    }
  ]
}
```

### `GET /vendor/dashboard`
Response:
```json
{
  "revenue": 100000,
  "completed_count": 10,
  "average_check": 10000,
  "service_fee_total": 30000,
  "vendor_owes": 30000,
  "rating_avg": 4.5,
  "rating_count": 20,
  "daily": [ { "date": "2026-02-01", "revenue": 5000, "count": 1 } ],
  "range_days": 7
}
```

### `GET /vendor/profile`
Response:
```json
{
  "vendor_id": "uuid",
  "name": "Vendor",
  "owner_full_name": "Owner Name",
  "phone1": "+998...",
  "phone2": "+998...",
  "phone3": "+998...",
  "email": "owner@vendor.uz",
  "inn": "123456789",
  "phone": "+998...",
  "address_text": "Street 1",
  "opening_hours": "9-21",
  "timezone": "Asia/Tashkent",
  "schedule": [
    { "weekday": "MON", "open_time": "09:00", "close_time": "21:00", "closed": false, "is24h": false }
  ],
  "supports_pickup": true,
  "delivers_self": false,
  "payment_methods": { "cash": true, "card": true },
  "geo": { "lat": 55.75, "lng": 37.62 }
}
```

### `PATCH /vendor/profile`
Request:
```json
{
  "name": "Vendor",
  "owner_full_name": "Owner Name",
  "phone1": "+998...",
  "phone2": "+998...",
  "phone3": "+998...",
  "email": "owner@vendor.uz",
  "inn": "123456789",
  "address_text": "Street 1",
  "timezone": "Asia/Tashkent",
  "schedule": [
    { "weekday": "MON", "open_time": "09:00", "close_time": "21:00", "closed": false, "is24h": false }
  ],
  "delivers_self": false
}
```

### `GET /vendor/promotions`
Response:
```json
{
  "promotions": [
    {
      "promotion_id": "uuid",
      "promo_type": "PERCENT",
      "value_numeric": 10,
      "priority": 0,
      "is_active": true,
      "starts_at": "2026-02-01T00:00:00.000Z",
      "ends_at": "2026-02-28T23:59:59.000Z",
      "items": ["uuid"],
      "combo_items": [],
      "buy_x_get_y": null,
      "gift": null
    }
  ]
}
```

### `POST /vendor/promotions`
Request:
```json
{
  "promo_type": "PERCENT",
  "value_numeric": 10,
  "priority": 0,
  "is_active": true,
  "starts_at": "2026-02-01T00:00:00.000Z",
  "ends_at": "2026-02-28T23:59:59.000Z",
  "items": ["uuid"]
}
```
Notes:
- `FIXED_PRICE`/`PERCENT` require `items`.
- `COMBO` requires `combo_items` and `value_numeric` (combo price).
- `BUY_X_GET_Y` requires `buy_x_get_y`.
- `GIFT` requires `gift`.
- Active promotions are `is_active=true` and within `starts_at`/`ends_at` window (if provided).

### `PATCH /vendor/promotions/{id}`
Request:
```json
{ "is_active": false, "priority": 5 }
```

### `DELETE /vendor/promotions/{id}`
Response:
```json
{ "deleted": true }
```

### `GET /vendor/reviews`
Response:
```json
{ "reviews": [ { "order_id": "uuid", "vendor_stars": 5, "vendor_comment": "Great" } ] }
```

### `POST /vendor/menu`
Request:
```json
{
  "title": "Burger",
  "description": "Cheese burger",
  "price": 12000,
  "is_available": true,
  "category": "BURGERS",
  "image_url": "https://..."
}
```

### `PATCH /vendor/menu/{id}`
Request:
```json
{ "is_available": false }
```

### `DELETE /vendor/menu/{id}`
Response:
```json
{ "deleted": true }
```

## Promo Codes

### `POST /admin/promo-codes`
Request:
```json
{
  "code": "SAVE10",
  "type": "PERCENT",
  "value": 10,
  "is_active": true,
  "starts_at": "2026-02-01T00:00:00.000Z",
  "ends_at": "2026-02-28T23:59:59.000Z",
  "usage_limit": 100,
  "min_order_sum": 15000
}
```
Notes:
- Promo codes are case-insensitive; server normalizes to `trim().toUpperCase()`.

### `GET /admin/promo-codes`
Response:
```json
{ "promo_codes": [ { "id": "uuid", "code": "SAVE10", "type": "PERCENT", "value": 10 } ] }
```

### `PATCH /admin/promo-codes/{id}`
Request:
```json
{ "is_active": false }
```

### `DELETE /admin/promo-codes/{id}`
Response:
```json
{ "deleted": true }
```

## Admin Vendor Analytics

### `GET /admin/vendors/{vendorId}/dashboard`
Response:
```json
{
  "revenue": 100000,
  "completed_count": 10,
  "average_check": 10000,
  "service_fee_total": 30000,
  "vendor_owes": 30000,
  "rating_avg": 4.5,
  "rating_count": 20,
  "daily": [ { "date": "2026-02-01", "revenue": 5000, "count": 1 } ],
  "range_days": 7
}
```

### `GET /admin/vendors/{vendorId}/stats`
Query: `range=week|month` or `from`/`to` ISO.
Response:
```json
{
  "revenue": 100000,
  "completed_count": 10,
  "average_check": 10000,
  "service_fee_total": 30000,
  "vendor_owes": 30000,
  "rating_avg": 4.5,
  "rating_count": 20,
  "daily": [ { "date": "2026-02-01", "revenue": 5000, "count": 1 } ],
  "range_days": 7,
  "from": "2026-02-01T00:00:00.000Z",
  "to": "2026-02-08T00:00:00.000Z"
}
```

### `GET /admin/vendors/{vendorId}/finance`
Query: `range=week|month` or `from`/`to` ISO.
Response:
```json
{
  "gmv": 200000,
  "gross_revenue": 230000,
  "service_fee_total": 30000,
  "delivery_fee_total": 20000,
  "promo_discounts_total": 5000,
  "platform_income": 30000,
  "vendor_payouts": 200000,
  "vendor_owes": 30000,
  "completed_count": 20,
  "from": "2026-02-01T00:00:00.000Z",
  "to": "2026-02-08T00:00:00.000Z"
}
```

### `GET /admin/vendors/{vendorId}/reviews`
Response:
```json
{ "reviews": [ { "order_id": "uuid", "vendor_stars": 5, "vendor_comment": "Great" } ] }
```

### `GET /admin/vendors/{vendorId}/promotions`
Response:
```json
{ "promotions": [ { "promotion_id": "uuid", "promo_type": "PERCENT", "value_numeric": 10, "is_active": true } ] }
```

## Admin Orders

### `GET /admin/orders`
Query:
- `order_id`, `status`, `vendor_id`, `vendor_name`, `client_id`, `receiver_phone`
- `fulfillment_type`, `from`, `to`

### `GET /admin/orders/{orderId}`
Response includes full order details plus `promo_code`, `promo_code_discount`.

### `PATCH /admin/orders/{orderId}`
Request:
```json
{ "status": "READY", "delivery_comment": "...", "vendor_comment": "..." }
```
Notes: invalid transitions return 409.

### `POST /admin/orders/{orderId}/cancel`
Request:
```json
{ "reason": "admin_cancel" }
```

## Admin Clients

### `GET /admin/clients`
Response includes `created_at`, `saved_promo_codes`, `used_promo_codes`.

### `GET /admin/clients/{id}/orders`
### `GET /admin/clients/{id}/addresses`
### `GET /admin/clients/{id}/promo-codes`
### `GET /admin/clients/{id}/ratings`

## Admin Couriers

### `POST /admin/couriers`
Request:
```json
{
  "courier_id": "uuid",
  "full_name": "Courier Name",
  "phone": "+998...",
  "delivery_method": "CAR",
  "is_available": true,
  "max_active_orders": 2
}
```

### `PATCH /admin/couriers/{id}`
Request:
```json
{ "full_name": "Courier Name", "is_available": false }
```

### `GET /admin/couriers/{id}/orders`
### `GET /admin/couriers/{id}/finance`
### `GET /admin/couriers/{id}/reviews`

## Admin Finance

### `GET /admin/finance`
Query: `range=week|month` or `from`/`to` ISO.
Response:
```json
{
  "gmv": 200000,
  "gross_revenue": 230000,
  "service_fee_total": 30000,
  "delivery_fee_total": 20000,
  "promo_discounts_total": 5000,
  "platform_income": 30000,
  "vendor_payouts": 200000,
  "vendor_owes": 30000,
  "completed_count": 20,
  "by_vendor": [
    { "vendor_id": "uuid", "vendor_name": "Vendor 1", "gmv": 50000, "vendor_owes": 9000 }
  ]
}
```

### `POST /client/profile/promo-codes`
Request:
```json
{ "code": "SAVE10" }
```
Response:
```json
{ "id": "uuid", "code": "SAVE10", "type": "PERCENT", "value": 10, "status": "ACTIVE", "used": false }
```
Errors:
- `promo_code not found` when code does not exist.
- `promo_code inactive or expired` when code is inactive or outside date range.
- `PROMO_ALREADY_USED` when the client has already redeemed the promo code.

### `GET /client/profile/promo-codes`
Response:
```json
{ "promo_codes": [ { "id": "uuid", "code": "SAVE10", "type": "PERCENT", "value": 10, "status": "ACTIVE", "used": false } ] }
```

### `DELETE /client/profile/promo-codes/{id}`
Response:
```json
{ "deleted": true }
```

## Client Profile

### `GET /client/profile`
Response:
```json
{
  "client_id": "uuid",
  "full_name": "Name",
  "phone": "+998991112233",
  "telegram_username": "user",
  "about": "..."
}
```

### `PATCH /client/profile`
Request:
```json
{
  "full_name": "Name",
  "phone": "+998991112233",
  "telegram_username": "user",
  "about": "..."
}
```

### `GET /client/profile/addresses`
Response:
```json
{
  "addresses": [
    {
      "id": "uuid",
      "type": "HOME",
      "address_text": "Street 1",
      "lat": 55.75,
      "lng": 37.62,
      "entrance": "2",
      "apartment": "15",
      "created_at": "2026-02-03T00:00:00.000Z"
    }
  ]
}
```

### `POST /client/profile/addresses`
Request:
```json
{
  "type": "HOME",
  "address_text": "Street 1",
  "lat": 55.75,
  "lng": 37.62,
  "entrance": "2",
  "apartment": "15"
}
```

### `PATCH /client/profile/addresses/{id}`
Request:
```json
{
  "address_text": "Street 2",
  "entrance": "1",
  "apartment": "10"
}
```

### `DELETE /client/profile/addresses/{id}`
Response:
```json
{ "deleted": true }
```
