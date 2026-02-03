import { describe, expect, it } from "vitest";

import {
  FulfillmentType,
  MenuItem,
  PromoCode,
  QuoteRequest,
  VendorCategory,
  VendorInfo,
  calculateQuote,
} from "../src/pricing";

const vendor: VendorInfo = {
  vendorId: "vendor-1",
  category: VendorCategory.RESTAURANTS,
  supportsPickup: true,
  geo: { lat: 0, lng: 0 },
};

const menuItems: Record<string, MenuItem> = {
  "item-1": { itemId: "item-1", vendorId: vendor.vendorId, price: 10000, isAvailable: true },
};

const request: QuoteRequest = {
  vendorId: vendor.vendorId,
  fulfillmentType: FulfillmentType.PICKUP,
  items: [{ menuItemId: "item-1", quantity: 1 }],
};

describe("promo codes", () => {
  it("applies percent promo after item discounts", () => {
    const promo: PromoCode = {
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

    const quote = calculateQuote(request, vendor, menuItems, [], promo);

    expect(quote.promoCode).toBe("SAVE10");
    expect(quote.promoCodeDiscount).toBe(1000);
  });

  it("applies fixed promo", () => {
    const promo: PromoCode = {
      id: "promo-2",
      code: "SAVE500",
      type: "FIXED",
      value: 500,
      isActive: true,
      startsAt: null,
      endsAt: null,
      usageLimit: null,
      usedCount: 0,
      minOrderSum: null,
    };

    const quote = calculateQuote(request, vendor, menuItems, [], promo);

    expect(quote.promoCodeDiscount).toBe(500);
  });

  it("does not apply promo if usage limit reached", () => {
    const promo: PromoCode = {
      id: "promo-3",
      code: "LIMIT1",
      type: "PERCENT",
      value: 10,
      isActive: true,
      startsAt: null,
      endsAt: null,
      usageLimit: 1,
      usedCount: 1,
      minOrderSum: null,
    };

    const quote = calculateQuote(request, vendor, menuItems, [], promo);

    expect(quote.promoCodeApplied).toBe(false);
    expect(quote.promoCodeDiscount).toBe(0);
  });

  it("does not apply promo if min order sum not met", () => {
    const promo: PromoCode = {
      id: "promo-4",
      code: "MIN20000",
      type: "PERCENT",
      value: 10,
      isActive: true,
      startsAt: null,
      endsAt: null,
      usageLimit: null,
      usedCount: 0,
      minOrderSum: 20000,
    };

    const quote = calculateQuote(request, vendor, menuItems, [], promo);

    expect(quote.promoCodeApplied).toBe(false);
    expect(quote.promoCodeDiscount).toBe(0);
  });
});
