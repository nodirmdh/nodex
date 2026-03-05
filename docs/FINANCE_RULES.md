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

Note: Promo code single-use per client does not change fee calculations.

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

## Vendor owes (interim)
- `vendor_owes = service_fee_total` for the selected period.
- Commission is TBD; when defined, `vendor_owes = service_fee_total + commission - refunds`.

## Platform income (interim)
- `platform_income = service_fee_total`
- `vendor_payouts = gross_revenue - platform_income`

## Promotions priority
- Promotions are applied in order: `COMBO` → `BUY_X_GET_Y` → `FIXED_PRICE`/`PERCENT` → `GIFT`.
- Within the same type, higher `priority` applies first (ties resolved deterministically).
