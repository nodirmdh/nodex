import { FulfillmentType } from "./pricing";

export enum OrderStatus {
  NEW = "NEW",
  ACCEPTED = "ACCEPTED",
  COOKING = "COOKING",
  READY = "READY",
  HANDOFF_CONFIRMED = "HANDOFF_CONFIRMED",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  PICKED_UP_BY_CUSTOMER = "PICKED_UP_BY_CUSTOMER",
  COURIER_ACCEPTED = "COURIER_ACCEPTED",
  PICKED_UP = "PICKED_UP",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  CANCELLED_BY_VENDOR = "CANCELLED_BY_VENDOR",
}

export type OrderActorRole = "VENDOR" | "COURIER" | "CLIENT" | "ADMIN" | "SYSTEM";

export class OrderStateError extends Error {
  statusCode = 409;
}

const transitions: Record<OrderActorRole, Record<OrderStatus, OrderStatus[]>> = {
  VENDOR: {
    NEW: [OrderStatus.ACCEPTED],
    ACCEPTED: [OrderStatus.COOKING],
    COOKING: [OrderStatus.READY],
    READY: [OrderStatus.HANDOFF_CONFIRMED, OrderStatus.DELIVERED],
    HANDOFF_CONFIRMED: [OrderStatus.COMPLETED],
    READY_FOR_PICKUP: [],
    PICKED_UP_BY_CUSTOMER: [],
    COURIER_ACCEPTED: [],
    PICKED_UP: [],
    DELIVERED: [OrderStatus.COMPLETED],
    COMPLETED: [],
    CANCELLED: [],
    CANCELLED_BY_VENDOR: [],
  },
  COURIER: {
    NEW: [],
    ACCEPTED: [],
    COOKING: [],
    READY: [OrderStatus.HANDOFF_CONFIRMED],
    HANDOFF_CONFIRMED: [OrderStatus.PICKED_UP],
    READY_FOR_PICKUP: [],
    PICKED_UP_BY_CUSTOMER: [],
    COURIER_ACCEPTED: [OrderStatus.HANDOFF_CONFIRMED],
    PICKED_UP: [OrderStatus.DELIVERED],
    DELIVERED: [OrderStatus.COMPLETED],
    COMPLETED: [],
    CANCELLED: [],
    CANCELLED_BY_VENDOR: [],
  },
  CLIENT: {
    NEW: [],
    ACCEPTED: [],
    COOKING: [],
    READY: [],
    HANDOFF_CONFIRMED: [],
    READY_FOR_PICKUP: [],
    PICKED_UP_BY_CUSTOMER: [],
    COURIER_ACCEPTED: [],
    PICKED_UP: [],
    DELIVERED: [],
    COMPLETED: [],
    CANCELLED: [],
    CANCELLED_BY_VENDOR: [],
  },
  SYSTEM: {
    NEW: [],
    ACCEPTED: [],
    COOKING: [],
    READY: [],
    HANDOFF_CONFIRMED: [],
    READY_FOR_PICKUP: [],
    PICKED_UP_BY_CUSTOMER: [],
    COURIER_ACCEPTED: [],
    PICKED_UP: [],
    DELIVERED: [OrderStatus.COMPLETED],
    COMPLETED: [],
    CANCELLED: [],
    CANCELLED_BY_VENDOR: [],
  },
  ADMIN: {
    NEW: [OrderStatus.CANCELLED],
    ACCEPTED: [OrderStatus.CANCELLED],
    COOKING: [OrderStatus.CANCELLED],
    READY: [OrderStatus.CANCELLED],
    HANDOFF_CONFIRMED: [OrderStatus.CANCELLED],
    READY_FOR_PICKUP: [OrderStatus.CANCELLED],
    PICKED_UP_BY_CUSTOMER: [OrderStatus.CANCELLED],
    COURIER_ACCEPTED: [OrderStatus.CANCELLED],
    PICKED_UP: [OrderStatus.CANCELLED],
    DELIVERED: [OrderStatus.CANCELLED],
    COMPLETED: [OrderStatus.CANCELLED],
    CANCELLED: [],
    CANCELLED_BY_VENDOR: [],
  },
};

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActorRole,
  fulfillmentType: FulfillmentType,
): void {
  const allowedTargets = transitions[actor]?.[from] ?? [];
  if (!allowedTargets.includes(to)) {
    throw new OrderStateError(`Invalid transition ${from} -> ${to} for ${actor}`);
  }

  if (actor === "COURIER" && fulfillmentType !== FulfillmentType.DELIVERY) {
    throw new OrderStateError("Courier transitions are only allowed for delivery orders");
  }
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillmentType: FulfillmentType,
): boolean {
  const actors: OrderActorRole[] = ["VENDOR", "COURIER", "CLIENT", "SYSTEM", "ADMIN"];
  for (const actor of actors) {
    try {
      assertTransition(from, to, actor, fulfillmentType);
      return true;
    } catch {
      // try next actor
    }
  }
  return false;
}
