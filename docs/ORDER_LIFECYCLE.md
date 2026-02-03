# Order Lifecycle & Ownership

## Order creation
- Orders are created only after successful `/client/cart/quote`
- Order snapshot stores:
  - item prices
  - applied promotions
  - service_fee
  - delivery_fee
- Quote recalculation after order creation is NOT allowed

## Ownership by stage
| Stage | Owner | Can update |
|------|-------|------------|
| NEW | Vendor | preparation states |
| ACCEPTED | Vendor | COOKING, READY |
| COURIER_ACCEPTED | Courier | PICKED_UP |
| PICKED_UP | Courier | DELIVERED |
| READY_FOR_PICKUP | Client | PICKED_UP_BY_CUSTOMER |

## Codes
- Pickup code:
  - Generated on order creation
  - Shown to vendor
  - Entered by courier
- Delivery code:
  - Generated on order creation
  - Shown to client
  - Entered by courier
- Codes are stored ONLY as hashes

## Cancellation rules (logic only)
- Admin can cancel anytime
- Vendor can cancel only before ACCEPTED
- Courier cannot cancel orders
- Refund/charge logic is defined in Finance rules
