import { describe, expect, it } from "vitest";

import { PrismaClient } from "@prisma/client";

import { OrderStatus } from "../src/orderState";
import { buildServer } from "../src/server";
import { signAuthToken } from "../src/auth";

describe("courier order DTO", () => {
  it("includes handoffCode field for READY delivery orders", async () => {
    process.env.JWT_SECRET = "test-secret";
    const order = {
      id: "order-1",
      courierId: "dev-courier-1",
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
          where.id === "dev-courier-1" ? { id: "dev-courier-1", isBlocked: false } : null,
      },
      $disconnect: async () => {},
    } as unknown as PrismaClient;

    const app = buildServer({ prisma });

    try {
      const token = signAuthToken({
        sub: "dev-courier-1",
        role: "COURIER",
        courierId: "dev-courier-1",
      });
      const response = await app.inject({
        method: "GET",
        url: `/courier/orders/${order.id}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty("handoffCode");
      expect(body.handoffCode).toBeNull();
    } finally {
      await app.close();
    }
  });
});
