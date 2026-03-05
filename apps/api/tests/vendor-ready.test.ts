import { describe, expect, it } from "vitest";

import { PrismaClient } from "@prisma/client";

import { OrderStatus } from "../src/orderState";
import { buildServer } from "../src/server";

describe("vendor READY transition", () => {
  it("returns handoff code without 500", async () => {
    const order = {
      id: "order-1",
      vendorId: "vendor-1",
      fulfillmentType: "DELIVERY",
      status: OrderStatus.COOKING,
    };
    const vendor = {
      id: "vendor-1",
      deliversSelf: false,
    };

    const prisma = {
      order: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === order.id ? order : null,
        update: async ({ data }: { data: { status: OrderStatus } }) => ({
          ...order,
          status: data.status,
        }),
      },
      vendor: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === vendor.id ? vendor : null,
      },
      $disconnect: async () => {},
    } as unknown as PrismaClient;

    const app = buildServer({ prisma });

    try {
      const response = await app.inject({
        method: "POST",
        url: `/vendor/orders/${order.id}/status`,
        headers: {
          "x-role": "VENDOR",
          "x-vendor-id": vendor.id,
        },
        payload: { status: OrderStatus.READY },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe(OrderStatus.READY);
      expect(typeof body.handoff_code).toBe("string");
    } finally {
      await app.close();
    }
  });
});
