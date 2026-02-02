import { describe, expect, it } from "vitest";

import { buildServer } from "../src/server";
import { FulfillmentType, PromotionType, VendorCategory } from "../src/pricing";
import { QuoteContextRepository, buildQuoteContextFromRepository } from "../src/quoteContext";

class InMemoryQuoteRepository implements QuoteContextRepository {
  async getVendor() {
    return {
      vendorId: "vendor-1",
      category: VendorCategory.RESTAURANTS,
      supportsPickup: true,
      geo: { lat: 0, lng: 0 },
    };
  }

  async getMenuItems() {
    return [
      {
        itemId: "item-1",
        vendorId: "vendor-1",
        price: 10000,
        isAvailable: true,
      },
    ];
  }

  async getPromotionsForItems() {
    return [
      {
        promotionId: "promo-1",
        promoType: PromotionType.PERCENT,
        itemIds: ["item-1"],
        valueNumeric: 10,
        isActive: true,
      },
    ];
  }
}

describe("POST /client/cart/quote", () => {
  it("returns a quote response matching the contract", async () => {
    const repository = new InMemoryQuoteRepository();
    const app = buildServer({
      quoteContextBuilder: (vendorId, menuItemIds) =>
        buildQuoteContextFromRepository(repository, vendorId, menuItemIds),
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/client/cart/quote",
        payload: {
          vendor_id: "vendor-1",
          fulfillment_type: FulfillmentType.DELIVERY,
          delivery_location: { lat: 0.0, lng: 0.0 },
          delivery_comment: "Leave at the door",
          items: [{ menu_item_id: "item-1", quantity: 1 }]
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toMatchObject({
        items_subtotal: 10000,
        discount_total: 1000,
        service_fee: 3000,
        delivery_fee: 3000,
        total: 15000,
        promo_items_count: 1,
        combo_count: 0,
        buyxgety_count: 0,
        gift_count: 0
      });
    } finally {
      await app.close();
    }
  });
});
