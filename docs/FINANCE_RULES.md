# Finance & Settlement Rules

## Fees
- service_fee = 3000 (always)
- delivery_fee = 3000 + ceil(distance_km) * 1000 (DELIVERY only)

## Order totals
total = items_subtotal
        - discounts
        - promo_code_discount
        + service_fee
        + delivery_fee

## Cancellations (logic level)
- If cancelled BEFORE vendor ACCEPTED:
  - Full refund to client
- If cancelled AFTER vendor ACCEPTED:
  - Food cost compensation applies (TBD)
- Admin cancellation:
  - May force refund or partial refund (TBD)

## Courier payments
- Courier earns per delivered order
- Courier payment rules defined later (TBD)

## Vendor payouts
- Vendor revenue = order total - platform commission
- Commission rules defined later (TBD)
