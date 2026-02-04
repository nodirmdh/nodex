import { describe, expect, it } from "vitest";

import { computeFinanceByVendor, computeFinanceSummary } from "../src/adminFinance";
import { OrderStatus } from "../src/orderState";

describe("admin finance aggregation", () => {
  it("aggregates delivered orders only", () => {
    const orders = [
      {
        vendorId: "v1",
        itemsSubtotal: 10000,
        discountTotal: 1000,
        promoCodeDiscount: 500,
        serviceFee: 3000,
        deliveryFee: 4000,
        total: 15500,
        status: OrderStatus.DELIVERED,
      },
      {
        vendorId: "v1",
        itemsSubtotal: 5000,
        discountTotal: 0,
        promoCodeDiscount: 0,
        serviceFee: 3000,
        deliveryFee: 3000,
        total: 11000,
        status: OrderStatus.CANCELLED,
      },
      {
        vendorId: "v2",
        itemsSubtotal: 8000,
        discountTotal: 0,
        promoCodeDiscount: 0,
        serviceFee: 3000,
        deliveryFee: 3000,
        total: 14000,
        status: OrderStatus.DELIVERED,
      },
    ];

    const summary = computeFinanceSummary(orders);
    expect(summary.completed_count).toBe(2);
    expect(summary.gmv).toBe(18000);
    expect(summary.gross_revenue).toBe(29500);
    expect(summary.service_fee_total).toBe(6000);
    expect(summary.delivery_fee_total).toBe(7000);
    expect(summary.promo_discounts_total).toBe(1500);
    expect(summary.platform_income).toBe(6000);
    expect(summary.vendor_payouts).toBe(23500);
  });

  it("returns per-vendor breakdown", () => {
    const orders = [
      {
        vendorId: "v1",
        itemsSubtotal: 10000,
        discountTotal: 0,
        promoCodeDiscount: 0,
        serviceFee: 3000,
        deliveryFee: 3000,
        total: 16000,
        status: OrderStatus.DELIVERED,
      },
      {
        vendorId: "v2",
        itemsSubtotal: 5000,
        discountTotal: 0,
        promoCodeDiscount: 0,
        serviceFee: 3000,
        deliveryFee: 3000,
        total: 11000,
        status: OrderStatus.DELIVERED,
      },
    ];

    const rows = computeFinanceByVendor(orders);
    const v1 = rows.find((row) => row.vendor_id === "v1");
    const v2 = rows.find((row) => row.vendor_id === "v2");
    expect(v1?.gmv).toBe(10000);
    expect(v2?.gmv).toBe(5000);
  });
});
