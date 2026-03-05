import { describe, expect, it } from "vitest";

import { computeCourierBalance, mapCourierHistoryOrder } from "../src/courierAggregates";

describe("courier aggregates", () => {
  it("maps courier history without NDA fields", () => {
    const order = mapCourierHistoryOrder({
      id: "order-1",
      vendorId: "vendor-1",
      vendorName: "Vendor",
      status: "DELIVERED",
      total: 12000,
      deliveryFee: 3000,
      createdAt: new Date("2026-02-04T10:00:00Z"),
      addressText: "Secret address",
      receiverPhone: "+998000000000",
    });

    expect(order).toEqual({
      order_id: "order-1",
      vendor_id: "vendor-1",
      vendor_name: "Vendor",
      status: "DELIVERED",
      total: 12000,
      courier_fee: 3000,
      created_at: new Date("2026-02-04T10:00:00Z"),
    });
    expect((order as Record<string, unknown>).address_text).toBeUndefined();
    expect((order as Record<string, unknown>).receiver_phone).toBeUndefined();
  });

  it("computes courier balance aggregates", () => {
    const summary = computeCourierBalance([{ deliveryFee: 3000 }, { deliveryFee: 5000 }]);
    expect(summary).toEqual({ gross: 8000, count: 2, avg: 4000 });
  });
});
