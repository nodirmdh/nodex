# Architecture

## Glossary (short)
- **Vendorka**: Vendor cabinet (Telegram Mini App) for a single physical vendor point.
- **Vendor**: Single physical point with one address and geo coordinates.
- **Promotion**: Discount rule applied in the promotions engine.

## High-level architecture (text diagram)
```
[Client Mini App]    [Courier Mini App]    [Vendorka Mini App]    [Admin Web]
        |                   |                   |                   |
        |------------------- HTTPS / API ---------------------------|
                                |
                         [Backend API]
                                |
                         [Postgres DB]
                                |
                      (Optional Cache/Queue)
```

## Modules / services (logical)
- **Auth & Session**: Telegram `initData` verification and session handling.
- **Catalog**: Vendors, menus, items, categories.
- **Orders**: Cart, order creation, state machine, codes.
- **Pricing/Quote**: Delivery fee, pickup rules, quote breakdown.
- **Promotions Engine**: Applies promotions in defined order; non-stacking per item units.
- **Tracking**: Courier location and client tracking.
- **Reviews**: Ratings and feedback for vendors/couriers.
- **Finance**: Vendor revenue, averages, payout reporting.

## Data storage
- **Primary DB**: Postgres (single database).
- **Caching (optional)**: Redis or in-memory cache for hot reads and rate limiting.

## API map (endpoint list only)
> Note: endpoint names are placeholders and must align with future implementation.

### `/client`
- `POST /client/auth/telegram`
- `GET /client/categories`
- `GET /client/vendors`
- `GET /client/vendors/{vendorId}`
- `POST /client/cart/quote`
- `POST /client/orders`
- `GET /client/orders/{orderId}`
- `GET /client/orders/{orderId}/tracking`
- `GET /client/profile`
- `POST /client/profile/promo-codes`
- `DELETE /client/profile/promo-codes/{code}`

### `/courier`
- `POST /courier/auth/telegram`
- `GET /courier/orders/available`
- `POST /courier/orders/{orderId}/accept`
- `POST /courier/orders/{orderId}/pickup`
- `POST /courier/orders/{orderId}/deliver`
- `GET /courier/profile`
- `PATCH /courier/profile`
- `GET /courier/balance`

### `/vendor`
- `POST /vendor/auth/telegram`
- `GET /vendor/orders/active`
- `GET /vendor/orders/history`
- `POST /vendor/orders/{orderId}/accept`
- `POST /vendor/orders/{orderId}/status`
- `GET /vendor/menu`
- `POST /vendor/menu/items`
- `PATCH /vendor/menu/items/{itemId}`
- `DELETE /vendor/menu/items/{itemId}`
- `GET /vendor/promotions`
- `POST /vendor/promotions`
- `PATCH /vendor/promotions/{promotionId}`
- `GET /vendor/finance`
- `GET /vendor/statistics`
- `GET /vendor/profile`
- `PATCH /vendor/profile`

### `/admin`
- `POST /admin/auth`
- `POST /admin/vendors`
- `POST /admin/vendors/{vendorId}/users`
- `GET /admin/vendors`
- `GET /admin/promo-codes`
- `POST /admin/promo-codes`
- `PATCH /admin/promo-codes/{codeId}`
- `DELETE /admin/promo-codes/{codeId}`
- `POST /admin/orders/{orderId}/cancel`

## Security
- Verify **Telegram `initData`** signatures for all mini app requests.
- **RBAC** per interface: client, courier, vendor, admin.
- **Rate limiting** for pickup/delivery code attempts and authentication endpoints.
- Store **hashed pickup/delivery codes**; never persist plaintext codes.

