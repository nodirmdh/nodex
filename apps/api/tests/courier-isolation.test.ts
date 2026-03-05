import { describe, expect, it } from "vitest";

import { PrismaClient } from "@prisma/client";

import { OrderStatus } from "../src/orderState";
import { buildServer } from "../src/server";
import { signAuthToken } from "../src/auth";

describe("courier isolation", () => {
  it("prevents courier from fetching another courier's order", async () => {
    process.env.JWT_SECRET = "test-secret";
    const order = {
      id: "order-1",
      courierId: "courier-b",
      vendorId: "vendor-1",
      status: OrderStatus.READY,
      fulfillmentType: "DELIVERY",
      deliveryLat: 0,
      deliveryLng: 0,
      deliveryComment: null,
      utensilsCount: 0,
      receiverPhone: null,
      paymentMethod: null,
      changeForAmount: null,
      addressText: null,
      addressStreet: null,
      addressHouse: null,
      addressEntrance: null,
      addressApartment: null,
      itemsSubtotal: 0,
      total: 0,
      deliveryFee: 0,
      items: [],
      vendor: { id: "vendor-1", name: "Vendor", addressText: null, geoLat: 0, geoLng: 0 },
    };

    const prisma = {
      order: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === order.id ? order : null,
      },
      courier: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === "courier-a" ? { id: "courier-a", isBlocked: false } : null,
      },
      $disconnect: async () => {},
    } as unknown as PrismaClient;

    const app = buildServer({ prisma });
    const token = signAuthToken({
      sub: "courier-a",
      role: "COURIER",
      courierId: "courier-a",
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: `/courier/orders/${order.id}`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});
