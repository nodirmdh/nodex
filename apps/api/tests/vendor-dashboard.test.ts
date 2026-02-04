import { describe, expect, it } from "vitest";

import { computeVendorDashboard } from "../src/vendorDashboard";
import { OrderStatus } from "../src/orderState";

describe("computeVendorDashboard", () => {
  it("computes revenue and average check", () => {
    const orders = [
      { total: 10000, serviceFee: 3000, status: OrderStatus.DELIVERED, createdAt: new Date("2026-02-01") },
      { total: 20000, serviceFee: 3000, status: OrderStatus.DELIVERED, createdAt: new Date("2026-02-02") },
    ];
    const result = computeVendorDashboard(orders, { ratingAvg: 4.5, ratingCount: 2 }, 7);
    expect(result.revenue).toBe(30000);
    expect(result.completed_count).toBe(2);
    expect(result.average_check).toBe(15000);
    expect(result.service_fee_total).toBe(6000);
  });
});
