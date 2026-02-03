# Domain Events

Events represent important moments in the system lifecycle.
Events do NOT change state directly; they are reactions to state changes.

## Core events
- order_quoted
- order_created
- vendor_accepted
- order_ready
- courier_accepted
- courier_picked_up
- courier_delivered
- order_cancelled

## Event usage
Events may trigger:
- notifications
- analytics
- future integrations
- audit logs

## Storage
- Events may be stored in DB table `domain_events`
- Events may be emitted in-memory initially

## Example
When order status changes from READY → COURIER_ACCEPTED:
- State is updated first
- Event `courier_accepted` is emitted

## Rules
- Events must never mutate core state
- Events are append-only
- Failure in event handling must not break main flow
