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

## Client Orders

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
  "delivery_code": "1234"
}
```

Notes:
- `delivery_code` is returned only for DELIVERY orders. Pickup code is not returned to the client.
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
  "fulfillment_type": "DELIVERY",
  "delivery_location": { "lat": 55.75, "lng": 37.62 },
  "delivery_comment": "Call on arrival",
  "vendor_comment": "No onions",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2, "price": 6000, "discount_amount": 1000, "is_gift": false }
  ],
  "items_subtotal": 12000,
  "discount_total": 2000,
  "promo_code": "SAVE10",
  "promo_code_discount": 1000,
  "service_fee": 3000,
  "delivery_fee": 4000,
  "total": 17000
}
```

### `GET /client/orders/{orderId}/tracking`
Returns last known courier location only after `COURIER_ACCEPTED`.

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

### `POST /courier/orders/{orderId}/accept`
Response:
```json
{ "order_id": "uuid", "status": "COURIER_ACCEPTED" }
```

### `POST /courier/orders/{orderId}/pickup`
Request:
```json
{ "pickup_code": "1234" }
```
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
{ "order_id": "uuid", "status": "COURIER_ACCEPTED" }
```

## Vendor Orders

### `GET /vendor/orders/active`
Returns current active orders for the vendor (NEW/ACCEPTED/COOKING/READY).

### `GET /vendor/orders/history`
Returns completed/cancelled orders for the vendor.

### `POST /vendor/orders/{orderId}/accept`
Response:
```json
{ "order_id": "uuid", "status": "ACCEPTED" }
```

### `POST /vendor/orders/{orderId}/status`
Request:
```json
{ "status": "COOKING" }
```
Response:
```json
{ "order_id": "uuid", "status": "COOKING" }
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

### `POST /client/profile/promo-codes`
Request:
```json
{ "code": "SAVE10" }
```
Response:
```json
{ "id": "uuid", "code": "SAVE10", "type": "PERCENT", "value": 10 }
```

### `GET /client/profile/promo-codes`
Response:
```json
{ "promo_codes": [ { "id": "uuid", "code": "SAVE10", "type": "PERCENT", "value": 10 } ] }
```

### `DELETE /client/profile/promo-codes/{id}`
Response:
```json
{ "deleted": true }
```
