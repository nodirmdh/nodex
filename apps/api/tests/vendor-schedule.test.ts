import { describe, expect, it, vi } from "vitest";

import { computeVendorScheduleInfo } from "../src/vendorSchedule";
import { buildServer } from "../src/server";

vi.mock("@prisma/client", () => {
  const vendor = {
    id: "vendor-1",
    isActive: true,
    isBlocked: false,
    timezone: "Asia/Tashkent",
    schedules: [
      {
        weekday: "MON",
        openTime: "09:00",
        closeTime: "21:00",
        closed: true,
        is24h: false,
      },
    ],
  };

  class PrismaClient {
    $disconnect = vi.fn(async () => {});
    vendor = {
      findUnique: vi.fn(async () => vendor),
    };
  }

  return {
    PrismaClient,
    PromotionType: {
      FIXED_PRICE: "FIXED_PRICE",
      PERCENT: "PERCENT",
      COMBO: "COMBO",
      BUY_X_GET_Y: "BUY_X_GET_Y",
      GIFT: "GIFT",
    },
    DeliveryMethod: {
      WALK: "WALK",
      SCOOTER: "SCOOTER",
      CAR: "CAR",
    },
  };
});

describe("vendor schedule", () => {

  it("computes open state", () => {
    const schedule = [
      {
        weekday: "MON",
        openTime: "09:00",
        closeTime: "18:00",
        closed: false,
        is24h: false,
      },
    ];
    const info = computeVendorScheduleInfo(
      schedule,
      "Asia/Tashkent",
      new Date("2026-02-02T05:00:00Z"),
    );
    expect(info.isOpenNow).toBe(true);
  });

  it("computes closed state", () => {
    const schedule = [
      {
        weekday: "MON",
        openTime: "09:00",
        closeTime: "18:00",
        closed: true,
        is24h: false,
      },
    ];
    const info = computeVendorScheduleInfo(
      schedule,
      "Asia/Tashkent",
      new Date("2026-02-02T05:00:00Z"),
    );
    expect(info.isOpenNow).toBe(false);
  });

  it("blocks quote and order when vendor is closed", async () => {
    const app = buildServer();
    try {
      const quoteResponse = await app.inject({
        method: "POST",
        url: "/client/cart/quote",
        headers: { "x-dev-user": "client" },
        payload: {
          vendor_id: "vendor-1",
          items: [],
          fulfillment_type: "DELIVERY",
          delivery_location: { lat: 42.84, lng: 59.01 },
          delivery_comment: "test",
        },
      });
      expect(quoteResponse.statusCode).toBe(400);
      expect(quoteResponse.json()).toMatchObject({ code: "VENDOR_CLOSED" });

      const orderResponse = await app.inject({
        method: "POST",
        url: "/client/orders",
        headers: { "x-dev-user": "client" },
        payload: {
          vendor_id: "vendor-1",
          items: [],
          fulfillment_type: "DELIVERY",
          delivery_location: { lat: 42.84, lng: 59.01 },
          delivery_comment: "test",
          receiver_phone: "+998901112233",
        },
      });
      expect(orderResponse.statusCode).toBe(400);
      expect(orderResponse.json()).toMatchObject({ code: "VENDOR_CLOSED" });
    } finally {
      await app.close();
    }
  });
});
