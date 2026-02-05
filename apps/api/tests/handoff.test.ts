import { describe, expect, it, vi } from "vitest";

import { hashCode } from "../src/codes";
import { OrderStatus } from "../src/orderState";
import { buildServer } from "../src/server";
import { signAuthToken } from "../src/auth";

vi.mock("@prisma/client", () => {
  const { hash, salt } = hashCode("1234");
  const order = {
    id: "order-1",
    vendorId: "vendor-1",
    courierId: "dev-courier-1",
    fulfillmentType: "DELIVERY",
    status: OrderStatus.READY,
    pickupCodeHash: hash,
    pickupCodeSalt: salt,
  };

  class PrismaClient {
    $disconnect = vi.fn(async () => {});
    order = {
      findUnique: vi.fn(async (args: { where?: { id?: string } }) => {
        if (args.where?.id === order.id) {
          return order;
        }
        return null;
      }),
      update: vi.fn(async () => order),
    };
    courier = {
      findUnique: vi.fn(async () => ({ isBlocked: false })),
    };
    vendor = {
      findUnique: vi.fn(async () => ({ deliversSelf: false })),
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

describe("courier handoff code", () => {
  it("rejects invalid handoff code", async () => {
    process.env.JWT_SECRET = "test-secret";
    const app = buildServer();
    const token = signAuthToken({
      sub: "dev-courier-1",
      role: "COURIER",
      courierId: "dev-courier-1",
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/courier/orders/order-1/handoff",
        headers: { Authorization: `Bearer ${token}` },
        payload: { handoff_code: "9999" },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
