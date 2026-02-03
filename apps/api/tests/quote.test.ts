import { describe, expect, it } from "vitest";

import {
  FulfillmentType,
  GeoPoint,
  MenuItem,
  Promotion,
  PromotionType,
  QuoteContext,
  QuoteValidationError,
  VendorCategory,
  VendorInfo,
} from "../src/pricing";
import { quoteCart } from "../src/quote";

const buildContext = (): QuoteContext => {
  const vendor: VendorInfo = {
    vendorId: "vendor-1",
    category: VendorCategory.RESTAURANTS,
    supportsPickup: true,
    geo: { lat: 0.0, lng: 0.0 },
  };
  const menuItems: Record<string, MenuItem> = {
    "item-1": { itemId: "item-1", vendorId: "vendor-1", price: 10000, isAvailable: true },
    "item-2": { itemId: "item-2", vendorId: "vendor-1", price: 8000, isAvailable: true },
  };
  const promotions: Promotion[] = [
    {
      promotionId: "promo-1",
      promoType: PromotionType.PERCENT,
      itemIds: ["item-1"],
      valueNumeric: 10,
      isActive: true,
    },
    {
      promotionId: "promo-2",
      promoType: PromotionType.FIXED_PRICE,
      itemIds: ["item-2"],
      valueNumeric: 5000,
      isActive: true,
    },
  ];
  return { vendors: { [vendor.vendorId]: vendor }, menuItems, promotions };
};

const deliveryPayload = (latDelta: number) => ({
  vendor_id: "vendor-1",
  fulfillment_type: FulfillmentType.DELIVERY,
  delivery_location: { lat: latDelta, lng: 0.0 },
  delivery_comment: "Leave at the door",
  items: [{ menu_item_id: "item-1", quantity: 1 }],
});

const latDeltaForKm = (distanceKm: number) => distanceKm / 111.195;

describe("quoteCart", () => {
  it("applies minimum delivery fee for delivery", () => {
    const context = buildContext();
    const result = quoteCart(deliveryPayload(0.0), context);

    expect(result.delivery_fee).toBe(3000);
    expect(result.service_fee).toBe(3000);
  });

  it("rounds delivery fee up from 0.1km", () => {
    const context = buildContext();
    const result = quoteCart(deliveryPayload(latDeltaForKm(0.1)), context);

    expect(result.delivery_fee).toBe(4000);
  });

  it("rounds delivery fee up from 2.01km", () => {
    const context = buildContext();
    const result = quoteCart(deliveryPayload(latDeltaForKm(2.01)), context);

    expect(result.delivery_fee).toBe(6000);
  });

  it("sets pickup delivery fee to zero", () => {
    const context = buildContext();
    const payload = {
      vendor_id: "vendor-1",
      fulfillment_type: FulfillmentType.PICKUP,
      items: [{ menu_item_id: "item-1", quantity: 1 }],
    };

    const result = quoteCart(payload, context);

    expect(result.delivery_fee).toBe(0);
    expect(result.service_fee).toBe(3000);
  });

  it("requires delivery comment for delivery", () => {
    const context = buildContext();
    const payload = {
      vendor_id: "vendor-1",
      fulfillment_type: FulfillmentType.DELIVERY,
      delivery_location: { lat: 0.0, lng: 0.0 },
      items: [{ menu_item_id: "item-1", quantity: 1 }],
    };

    expect(() => quoteCart(payload, context)).toThrow(QuoteValidationError);
  });

  it("disallows pickup for non-restaurant vendors", () => {
    const vendor: VendorInfo = {
      vendorId: "vendor-1",
      category: VendorCategory.PRODUCTS,
      supportsPickup: true,
      geo: { lat: 0.0, lng: 0.0 },
    };
    const context: QuoteContext = {
      vendors: { [vendor.vendorId]: vendor },
      menuItems: {
        "item-1": { itemId: "item-1", vendorId: "vendor-1", price: 10000, isAvailable: true },
      },
      promotions: [],
    };
    const payload = {
      vendor_id: "vendor-1",
      fulfillment_type: FulfillmentType.PICKUP,
      items: [{ menu_item_id: "item-1", quantity: 1 }],
    };

    expect(() => quoteCart(payload, context)).toThrow(QuoteValidationError);
  });

  it("disallows pickup when supportsPickup is false", () => {
    const vendor: VendorInfo = {
      vendorId: "vendor-1",
      category: VendorCategory.RESTAURANTS,
      supportsPickup: false,
      geo: { lat: 0.0, lng: 0.0 },
    };
    const context: QuoteContext = {
      vendors: { [vendor.vendorId]: vendor },
      menuItems: {
        "item-1": { itemId: "item-1", vendorId: "vendor-1", price: 10000, isAvailable: true },
      },
      promotions: [],
    };
    const payload = {
      vendor_id: "vendor-1",
      fulfillment_type: FulfillmentType.PICKUP,
      items: [{ menu_item_id: "item-1", quantity: 1 }],
    };

    expect(() => quoteCart(payload, context)).toThrow(QuoteValidationError);
  });

  it("applies percent promotion correctly", () => {
    const context = buildContext();
    const result = quoteCart(deliveryPayload(0.0), context);

    expect(result.discount_total).toBe(1000);
    expect(result.promo_items_count).toBe(1);
    expect(result.promo_code).toBeNull();
    expect(result.promo_code_discount).toBe(0);
  });

  it("applies fixed price promotion correctly", () => {
    const context = buildContext();
    const payload = {
      vendor_id: "vendor-1",
      fulfillment_type: FulfillmentType.DELIVERY,
      delivery_location: { lat: 0.0, lng: 0.0 },
      delivery_comment: "Gate code 1234",
      items: [{ menu_item_id: "item-2", quantity: 1 }],
    };

    const result = quoteCart(payload, context);

    expect(result.discount_total).toBe(3000);
    expect(result.promo_items_count).toBe(1);
  });

  it("uses the best discount when multiple promotions apply", () => {
    const vendor: VendorInfo = {
      vendorId: "vendor-1",
      category: VendorCategory.RESTAURANTS,
      supportsPickup: true,
      geo: { lat: 0.0, lng: 0.0 },
    };
    const menuItems: Record<string, MenuItem> = {
      "item-1": { itemId: "item-1", vendorId: "vendor-1", price: 10000, isAvailable: true },
    };
    const promotions: Promotion[] = [
      {
        promotionId: "promo-1",
        promoType: PromotionType.PERCENT,
        itemIds: ["item-1"],
        valueNumeric: 50,
        isActive: true,
      },
      {
        promotionId: "promo-2",
        promoType: PromotionType.FIXED_PRICE,
        itemIds: ["item-1"],
        valueNumeric: 7000,
        isActive: true,
      },
    ];
    const context: QuoteContext = { vendors: { [vendor.vendorId]: vendor }, menuItems, promotions };
    const payload = {
      vendor_id: "vendor-1",
      fulfillment_type: FulfillmentType.DELIVERY,
      delivery_location: { lat: 0.0, lng: 0.0 },
      delivery_comment: "Call on arrival",
      items: [{ menu_item_id: "item-1", quantity: 2 }],
    };

    const result = quoteCart(payload, context);

    expect(result.discount_total).toBe(10000);
    expect(result.promo_items_count).toBe(1);
  });
});
