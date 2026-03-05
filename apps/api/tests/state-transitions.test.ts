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
        OrderStatus.HANDOFF_CONFIRMED,
        "COURIER",
        FulfillmentType.DELIVERY,
      ),
    ).not.toThrow();
    expect(() =>
      assertTransition(
        OrderStatus.HANDOFF_CONFIRMED,
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
        OrderStatus.HANDOFF_CONFIRMED,
        "COURIER",
        FulfillmentType.PICKUP,
      ),
    ).toThrow();
  });

  it("allows pickup completion without courier", () => {
    expect(() =>
      assertTransition(
        OrderStatus.READY,
        OrderStatus.HANDOFF_CONFIRMED,
        "VENDOR",
        FulfillmentType.PICKUP,
      ),
    ).not.toThrow();
    expect(() =>
      assertTransition(
        OrderStatus.HANDOFF_CONFIRMED,
        OrderStatus.COMPLETED,
        "VENDOR",
        FulfillmentType.PICKUP,
      ),
    ).not.toThrow();
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
    expect(canTransition(OrderStatus.NEW, OrderStatus.COMPLETED, FulfillmentType.DELIVERY)).toBe(
      false,
    );
  });
});
