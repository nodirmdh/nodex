import { describe, expect, it } from "vitest";

import { buildServer } from "../src/server";
import { FulfillmentType, PromotionType, VendorCategory } from "../src/pricing";
import { QuoteContextRepository } from "../src/quoteContext";

class InMemoryQuoteRepository implements QuoteContextRepository {
  async getVendor(_vendorId: string) {
    return {
      vendorId: "vendor-1",
      category: VendorCategory.RESTAURANTS,
      supportsPickup: true,
      geo: { lat: 0, lng: 0 },
    };
  }

  async getMenuItems(_menuItemIds: string[]) {
    return [
      {
        itemId: "item-1",
        vendorId: "vendor-1",
        price: 10000,
        isAvailable: true,
      },
    ];
  }

  async getPromotionsForItems(_vendorId: string, _menuItemIds: string[]) {
    return [
      {
        promotionId: "promo-1",
        promoType: PromotionType.PERCENT,
        itemIds: ["item-1"],
        valueNumeric: 10,
        priority: 0,
        isActive: true,
      },
    ];
  }

  async getPromoCodeByCode(code: string) {
    if (code === "SAVE10") {
      return {
        id: "promo-1",
        code: "SAVE10",
        type: "PERCENT",
        value: 10,
        isActive: true,
        startsAt: null,
        endsAt: null,
        usageLimit: null,
        usedCount: 0,
        minOrderSum: null,
      };
    }
    return null;
  }
}

describe("POST /client/cart/quote", () => {
  it("returns a quote response matching the contract", async () => {
    const repository = new InMemoryQuoteRepository();
    const app = buildServer({
      repository,
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/client/cart/quote",
        headers: {
          "x-role": "CLIENT",
          "x-client-id": "test-client",
        },
        payload: {
          vendor_id: "vendor-1",
          fulfillment_type: FulfillmentType.DELIVERY,
          delivery_location: { lat: 0.0, lng: 0.0 },
          delivery_comment: "Leave at the door",
          items: [{ menu_item_id: "item-1", quantity: 1 }],
          promo_code: "SAVE10"
        }
      });

      if (response.statusCode !== 200) {
        // покажет точную причину 400 (какое поле требует валидатор)
        console.log("QUOTE_ROUTE_FAIL", response.statusCode, response.body);
      }


      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toMatchObject({
        items_subtotal: 10000,
        discount_total: 1000,
        promo_code: "SAVE10",
        promo_code_discount: 900,
        service_fee: 3000,
        delivery_fee: 3000,
        total: 14100,
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
