import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { quoteCart } from "../src/quote";
import { buildQuoteContextFromRepository } from "../src/quoteContext";
import { PrismaQuoteRepository } from "../src/repositories/prismaQuoteRepository";
import { FulfillmentType } from "../src/pricing";

const shouldRun = process.env.RUN_INTEGRATION === "1";

describe.skipIf(!shouldRun)("Quote repository integration", () => {
  it("loads vendor/menu/promotions from the database", async () => {
    const prisma = new PrismaClient();
    const repository = new PrismaQuoteRepository(prisma);

    try {
      await prisma.promotionItem.deleteMany();
      await prisma.promotion.deleteMany();
      await prisma.menuItem.deleteMany();
      await prisma.vendor.deleteMany();

      const vendor = await prisma.vendor.create({
        data: {
          category: "RESTAURANTS",
          supportsPickup: true,
          geoLat: 0,
          geoLng: 0,
        },
      });

      const item = await prisma.menuItem.create({
        data: {
          vendorId: vendor.id,
          price: 10000,
          isAvailable: true,
        },
      });

      const promo = await prisma.promotion.create({
        data: {
          vendorId: vendor.id,
          promoType: "PERCENT",
          valueNumeric: 10,
          isActive: true,
        },
      });

      await prisma.promotionItem.create({
        data: {
          promotionId: promo.id,
          menuItemId: item.id,
        },
      });

      const context = await buildQuoteContextFromRepository(
        repository,
        vendor.id,
        [item.id],
      );

      const quote = quoteCart(
        {
          vendor_id: vendor.id,
          fulfillment_type: FulfillmentType.DELIVERY,
          delivery_location: { lat: 0, lng: 0 },
          delivery_comment: "Drop at door",
          items: [{ menu_item_id: item.id, quantity: 1 }],
        },
        context,
      );

      expect(quote.discount_total).toBe(1000);
      expect(quote.delivery_fee).toBe(3000);
    } finally {
      await prisma.$disconnect();
    }
  });
});
