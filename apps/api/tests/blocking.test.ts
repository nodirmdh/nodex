import { describe, expect, it, vi } from "vitest";

import { buildServer } from "../src/server";
import { signAuthToken } from "../src/auth";
import { hashPassword } from "../src/auth/password";

const vendorData: {
  id: string;
  login: string;
  passwordHash: string | null;
  isBlocked: boolean;
} = {
  id: "vendor-1",
  login: "vendor-login",
  passwordHash: null,
  isBlocked: true,
};

const courierData: { id: string; isBlocked: boolean } = {
  id: "dev-courier-1",
  isBlocked: true,
};

vi.mock("@prisma/client", () => {
  class PrismaClient {
    $disconnect = vi.fn(async () => {});
    vendor = {
      findFirst: vi.fn(async (args: { where?: { login?: string } }) => {
        if (args.where?.login === vendorData.login) {
          return vendorData;
        }
        return null;
      }),
      findUnique: vi.fn(async (args: { where?: { id?: string } }) => {
        if (args.where?.id === vendorData.id) {
          return vendorData;
        }
        return null;
      }),
    };
    courier = {
      findUnique: vi.fn(async (args: { where?: { id?: string } }) => {
        if (args.where?.id === courierData.id) {
          return courierData;
        }
        return null;
      }),
      upsert: vi.fn(async () => ({
        id: courierData.id,
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

describe("block enforcement", () => {
  it("blocks vendor login when vendor is blocked", async () => {
    process.env.JWT_SECRET = "test-secret";
    vendorData.passwordHash = await hashPassword("secret");
    const app = buildServer();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/vendor/auth/login",
        payload: { login: vendorData.login, password: "secret" },
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("blocks courier endpoints when courier is blocked", async () => {
    process.env.JWT_SECRET = "test-secret";
    const app = buildServer();
    const token = signAuthToken({
      sub: courierData.id,
      role: "COURIER",
      courierId: courierData.id,
    });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/courier/orders/available",
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});
