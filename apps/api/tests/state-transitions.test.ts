import { describe, expect, it } from "vitest";

import { FulfillmentType } from "../src/pricing";
import { OrderStatus, assertTransition, canTransition } from "../src/orderState";

describe("order state transitions", () => {
  it("allows vendor preparation flow transitions", () => {
    expect(() =>
      assertTransition(OrderStatus.NEW, OrderStatus.ACCEPTED, "VENDOR", FulfillmentType.PICKUP),
    ).not.toThrow();
    expect(() =>
      assertTransition(OrderStatus.ACCEPTED, OrderStatus.COOKING, "VENDOR", FulfillmentType.PICKUP),
    ).not.toThrow();
    expect(() =>
      assertTransition(OrderStatus.COOKING, OrderStatus.READY, "VENDOR", FulfillmentType.PICKUP),
    ).not.toThrow();
  });

  it("allows courier delivery transitions for delivery orders", () => {
    expect(() =>
      assertTransition(
        OrderStatus.READY,
        OrderStatus.COURIER_ACCEPTED,
        "COURIER",
        FulfillmentType.DELIVERY,
      ),
    ).not.toThrow();
    expect(() =>
      assertTransition(
        OrderStatus.COURIER_ACCEPTED,
        OrderStatus.PICKED_UP,
        "COURIER",
        FulfillmentType.DELIVERY,
      ),
    ).not.toThrow();
    expect(() =>
      assertTransition(
        OrderStatus.PICKED_UP,
        OrderStatus.DELIVERED,
        "COURIER",
        FulfillmentType.DELIVERY,
      ),
    ).not.toThrow();
  });

  it("rejects courier transitions for pickup orders", () => {
    expect(() =>
      assertTransition(
        OrderStatus.READY,
        OrderStatus.COURIER_ACCEPTED,
        "COURIER",
        FulfillmentType.PICKUP,
      ),
    ).toThrow();
  });

  it("rejects invalid transitions", () => {
    expect(() =>
      assertTransition(OrderStatus.NEW, OrderStatus.COOKING, "VENDOR", FulfillmentType.PICKUP),
    ).toThrow();
  });

  it("allows admin patch only for valid transitions", () => {
    expect(canTransition(OrderStatus.NEW, OrderStatus.ACCEPTED, FulfillmentType.DELIVERY)).toBe(
      true,
    );
    expect(canTransition(OrderStatus.NEW, OrderStatus.DELIVERED, FulfillmentType.DELIVERY)).toBe(
      false,
    );
  });
});
