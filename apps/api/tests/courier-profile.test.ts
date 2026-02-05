import { describe, expect, it, vi } from "vitest";

import { buildServer } from "../src/server";
import { signAuthToken } from "../src/auth";

vi.mock("@prisma/client", () => {
  class PrismaClient {
    $disconnect = vi.fn(async () => {});
    courier = {
      findUnique: vi.fn(async () => ({ isBlocked: false })),
      upsert: vi.fn(async () => ({
        id: "dev-courier-1",
        fullName: null,
        phone: null,
        telegramUsername: null,
        photoUrl: null,
        avatarUrl: null,
        avatarFileId: null,
        deliveryMethod: null,
        isAvailable: true,
        maxActiveOrders: 1,
        ratingAvg: 0,
        ratingCount: 0,
      })),
    };
    rating = {
      findMany: vi.fn(async () => []),
    };
    order = {
      count: vi.fn(async () => 0),
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

describe("courier profile validation", () => {
  it("rejects invalid delivery method", async () => {
    process.env.JWT_SECRET = "test-secret";
    const app = buildServer();
    const token = signAuthToken({
      sub: "dev-courier-1",
      role: "COURIER",
      courierId: "dev-courier-1",
    });
    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/courier/profile",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        payload: {
          delivery_method: "PLANE",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ message: "invalid delivery_method" });
    } finally {
      await app.close();
    }
  });
});
