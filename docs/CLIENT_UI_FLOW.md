# Client Mini App — UI Flow & Logic

This document defines the exact client-facing flow.
Client app is a Telegram Mini App built with React + TypeScript.

## General principles
- Client never mutates core state directly.
- Client interacts only via backend API.
- Client sees only own data.
- UI must reflect backend state exactly.

## Entry & auth
- Client opens Telegram Mini App
- Telegram initData is sent to backend
- Backend verifies initData and returns client session

## Home screen
Displays:
- Categories: RESTAURANTS, PRODUCTS, PHARMACY, MARKET
- Search input
- Vendor cards:
  - name
  - rating
  - delivery availability
  - pickup availability badge (if supported)

## Vendor page
Displays:
- Vendor info (name, rating, delivery/pickup availability)
- Menu grouped by categories
- Menu items:
  - title
  - price
  - availability
  - active promotions (badges)

Actions:
- Add item to cart
- Increase/decrease quantity

## Cart screen
Displays:
- Selected items with quantities
- Subtotal (items only)
- Input for delivery comment (DELIVERY only, required)
- Toggle: DELIVERY / PICKUP (if pickup allowed)
- Promo code selector (from saved promo codes)
- Button: “Calculate total”
- Input: **vendor_comment** (special instructions for vendor)
  - Optional
  - Examples: "no onions", "no spicy", "allergy"
  - Sent to backend and shown in Vendorka/Admin as part of the Order


Action:
- Calls `POST /client/cart/quote`

## Quote result screen
Displays:
- Item list with applied discounts
- Promotions breakdown (read-only)
- Fees:
  - service_fee
  - delivery_fee (0 for pickup)
- Total amount
- Warnings (if any)

Actions:
- Confirm order → creates order
- Back → return to cart

## Order creation
- Client confirms quote
- Calls `POST /client/orders`
- Backend creates Order with snapshot pricing

## Active order screen
Displays:
- Order status (human-readable)
- Vendor info
- Items summary
- Fees and total
- Delivery comment
- Vendor comment (if provided)
- Courier status:
  - Waiting for courier
  - Courier accepted
- Map:
  - Courier location (only after courier acceptance)
- Button: “Show delivery code” (masked)

Client CANNOT:
- Change order after creation
- Cancel order (unless future feature)

## Order history
Displays:
- List of past orders
- Status and total
- Ability to rate vendor/courier (future)

## Profile screen
Sections:
- Personal info (read-only for now)
- Promo Codes:
  - list saved promo codes
  - add new promo code
  - remove promo code

Actions (buttons):
- **Support** → opens Telegram chat with Support
- **Become a courier** → opens Telegram chat with Support with prefilled message
- **Become a partner** → opens Telegram chat with Support with prefilled message
- All three buttons open the Support chat using `SUPPORT_TG_USERNAME` or `SUPPORT_TG_LINK`.

## Error handling
- Validation errors shown inline
- Network errors show retry option
- Backend errors shown as user-friendly messages

## Forbidden UI actions
- Client must not:
  - change order states
  - see other clients’ orders
  - see vendor or courier internals

### Telegram support chat navigation
Client app uses a configured `SUPPORT_TG_USERNAME` or `SUPPORT_TG_LINK`.
On click it opens:
- `https://t.me/<support_username>`
Optionally, it can prefill a message via Telegram deep links (if supported).
