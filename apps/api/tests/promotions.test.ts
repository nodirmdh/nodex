import { describe, expect, it } from "vitest";

import {
  FulfillmentType,
  MenuItem,
  Promotion,
  PromotionType,
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

it("applies combo before percent promotions", () => {
  const menuItems: Record<string, MenuItem> = {
    "item-a": { itemId: "item-a", vendorId: vendor.vendorId, price: 10000, isAvailable: true },
    "item-b": { itemId: "item-b", vendorId: vendor.vendorId, price: 5000, isAvailable: true },
  };
  const promotions: Promotion[] = [
    {
      promotionId: "combo-1",
      promoType: PromotionType.COMBO,
      comboItems: [
        { itemId: "item-a", quantity: 1 },
        { itemId: "item-b", quantity: 1 },
      ],
      valueNumeric: 12000,
      isActive: true,
    },
    {
      promotionId: "percent-1",
      promoType: PromotionType.PERCENT,
      itemIds: ["item-a"],
      valueNumeric: 10,
      isActive: true,
    },
  ];

  const request: QuoteRequest = {
    vendorId: vendor.vendorId,
    fulfillmentType: FulfillmentType.PICKUP,
    items: [
      { menuItemId: "item-a", quantity: 1 },
      { menuItemId: "item-b", quantity: 1 },
    ],
  };

  const quote = calculateQuote(request, vendor, menuItems, promotions);

  expect(quote.discountTotal).toBe(3000);
  expect(quote.comboCount).toBe(1);
  expect(quote.buyxgetyCount).toBe(0);
  expect(quote.promoItemsCount).toBe(2);
  expect(quote.promoCodeDiscount).toBe(0);
});

it("applies buy-x-get-y before fixed/percent", () => {
  const menuItems: Record<string, MenuItem> = {
    "item-a": { itemId: "item-a", vendorId: vendor.vendorId, price: 10000, isAvailable: true },
    "item-b": { itemId: "item-b", vendorId: vendor.vendorId, price: 5000, isAvailable: true },
  };
  const promotions: Promotion[] = [
    {
      promotionId: "bxgy-1",
      promoType: PromotionType.BUY_X_GET_Y,
      buyItemId: "item-a",
      buyQuantity: 2,
      getItemId: "item-b",
      getQuantity: 1,
      discountPercent: 100,
      isActive: true,
    },
    {
      promotionId: "percent-1",
      promoType: PromotionType.PERCENT,
      itemIds: ["item-b"],
      valueNumeric: 10,
      isActive: true,
    },
  ];

  const request: QuoteRequest = {
    vendorId: vendor.vendorId,
    fulfillmentType: FulfillmentType.PICKUP,
    items: [
      { menuItemId: "item-a", quantity: 2 },
      { menuItemId: "item-b", quantity: 1 },
    ],
  };

  const quote = calculateQuote(request, vendor, menuItems, promotions);

  expect(quote.discountTotal).toBe(5000);
  expect(quote.buyxgetyCount).toBe(1);
  expect(quote.promoItemsCount).toBe(1);
  expect(quote.promoCodeDiscount).toBe(0);
});

it("applies gift promotions after discounts", () => {
  const menuItems: Record<string, MenuItem> = {
    "item-a": { itemId: "item-a", vendorId: vendor.vendorId, price: 9000, isAvailable: true },
    "item-gift": {
      itemId: "item-gift",
      vendorId: vendor.vendorId,
      price: 7000,
      isAvailable: true,
    },
  };
  const promotions: Promotion[] = [
    {
      promotionId: "gift-1",
      promoType: PromotionType.GIFT,
      giftItemId: "item-gift",
      giftQuantity: 1,
      minOrderAmount: 8000,
      isActive: true,
    },
  ];

  const request: QuoteRequest = {
    vendorId: vendor.vendorId,
    fulfillmentType: FulfillmentType.PICKUP,
    items: [{ menuItemId: "item-a", quantity: 1 }],
  };

  const quote = calculateQuote(request, vendor, menuItems, promotions);

  expect(quote.giftCount).toBe(1);
  const giftLine = quote.lineItems.find((item) => item.isGift);
  expect(giftLine?.menuItemId).toBe("item-gift");
  expect(giftLine?.unitPrice).toBe(0);
});
