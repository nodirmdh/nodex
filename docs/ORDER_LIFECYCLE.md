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
| READY | Courier | HANDOFF_CONFIRMED |
| HANDOFF_CONFIRMED | Courier | PICKED_UP |
| PICKED_UP | Courier | DELIVERED |
| DELIVERED | System | COMPLETED |
| READY (pickup) | Vendor | HANDOFF_CONFIRMED |

## Codes
- Handoff code (delivery orders):
  - Generated when vendor marks READY
  - Shown to vendor
  - Entered by courier
- Pickup code (pickup orders):
  - Generated on order creation
  - Shown to client
  - Entered by vendor
- Delivery code:
  - Generated on order creation (delivery orders)
  - Shown to client
  - Entered by courier (or vendor for self-delivery)
- Codes are stored ONLY as hashes

## Cancellation rules (logic only)
- Admin can cancel anytime
- Vendor can cancel only before ACCEPTED
- Courier cannot cancel orders
- Refund/charge logic is defined in Finance rules
