# Courier Mini App — UI Flow & Logic

This document defines courier-facing UI and behavior.
Courier app is a Telegram Mini App built with React + TypeScript.

## General principles
- Courier sees only courier-related data
- Courier cannot cancel orders
- Courier can modify only courier-owned states
- All actions validated by backend

## Entry & auth
- Courier opens Telegram Mini App
- initData is verified by backend
- Backend identifies courier account

## Main tabs
- Orders
- Balance
- Rating
- Profile

## Orders → Available
Displays:
- List of available orders:
  - pickup address
  - delivery address (masked/general)
  - estimated distance
  - order value
- Accept button

Action:
- `POST /courier/orders/{orderId}/accept`

## Orders → Active
Displays:
- Current active order
- Vendor address and contact
- Client delivery location
- Status timeline
- Map:
  - route overview
- Input for pickup code (when required)
- Input for delivery code (when required)

Actions:
- Accept order
- Confirm pickup (pickup code required)
- Confirm delivery (delivery code required)

## Location tracking
- While order is ACTIVE:
  - Courier app sends location updates periodically
  - Backend stores tracking data
- Tracking stops automatically after delivery

## Balance screen
Displays:
- Current balance
- Completed orders count
- Earnings summary (future)

## Rating screen
Displays:
- Courier rating
- Client feedback (read-only)

## Profile screen
Displays/editable:
- Name
- Phone
- Delivery mode:
  - WALK
  - SCOOTER
  - CAR

## Error handling
- Invalid codes → clear error
- Order already taken → refresh available list
- Network error → retry

## Forbidden actions
Courier must NOT:
- Modify vendor preparation states
- Cancel orders
- See admin-only data
- See other couriers’ orders
