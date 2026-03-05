# Admin Panel Views

Admin panel is the single source of full system visibility.

## Orders view
Admin sees for every order:
- Order ID
- Status timeline (all transitions)
- Vendor info
- Client info
- Courier info (if assigned)
- Items with prices and discounts
- Promotions applied
- service_fee and delivery_fee
- Total
- Delivery location and comment
- Vendor comment (special instructions)
- Tracking history
- Codes (masked / hashed)
- Cancellation history

## Vendors view
- Vendor profile
- Address and geo
- Category
- supports_pickup flag
- Active orders
- Order history
- Revenue summary (future)

## Promotions view
- List promotions grouped by vendor
- Read-only in v1

## Users view
- Clients
- Vendors (Vendorka users)
- Couriers
- Roles and status

## Promotions & promo codes
- Global promo codes
- Vendor promotions
- Usage statistics

## System tools
- Manual order cancellation
- Feature flags (future)
- Audit logs (future)
