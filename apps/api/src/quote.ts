import {
  CartLine,
  FulfillmentType,
  GeoPoint,
  QuoteContext,
  QuoteRequest,
  QuoteValidationError,
  calculateQuote,
} from "./pricing";

export class QuoteNotFoundError extends QuoteValidationError {}

export type QuotePayload = {
  vendor_id?: string;
  fulfillment_type?: string;
  delivery_location?: { lat: number; lng: number };
  delivery_comment?: string | null;
  vendor_comment?: string | null;
  promo_code?: string | null;
  items?: { menu_item_id: string; quantity: number }[];
};

export function buildQuoteRequest(payload: QuotePayload, context: QuoteContext): QuoteRequest {
  const vendorId = payload.vendor_id;
  if (!vendorId) {
    throw new QuoteValidationError("vendor_id is required");
  }

  const vendor = context.vendors[vendorId];
  if (!vendor) {
    throw new QuoteNotFoundError("vendor not found");
  }

  const fulfillmentTypeRaw = payload.fulfillment_type;
  if (!fulfillmentTypeRaw) {
    throw new QuoteValidationError("fulfillment_type is required");
  }
  let fulfillmentType: FulfillmentType;
  if (fulfillmentTypeRaw === FulfillmentType.DELIVERY) {
    fulfillmentType = FulfillmentType.DELIVERY;
  } else if (fulfillmentTypeRaw === FulfillmentType.PICKUP) {
    fulfillmentType = FulfillmentType.PICKUP;
  } else {
    throw new QuoteValidationError("fulfillment_type is invalid");
  }

  let deliveryLocation: GeoPoint | null = null;
  if (payload.delivery_location) {
    deliveryLocation = {
      lat: payload.delivery_location.lat,
      lng: payload.delivery_location.lng,
    };
  }

  const itemsPayload = payload.items ?? [];
  if (itemsPayload.length === 0) {
    throw new QuoteValidationError("items are required");
  }

  const requestItems: CartLine[] = [];
  for (const line of itemsPayload) {
    const menuItemId = line.menu_item_id;
    const quantity = line.quantity;
    if (quantity <= 0) {
      throw new QuoteValidationError("quantity must be greater than 0");
    }
    const menuItem = context.menuItems[menuItemId];
    if (!menuItem) {
      throw new QuoteValidationError("menu_item_id not found");
    }
    if (menuItem.vendorId !== vendor.vendorId) {
      throw new QuoteValidationError("menu_item_id does not belong to vendor");
    }
    if (!menuItem.isAvailable) {
      throw new QuoteValidationError("menu_item_id is not available");
    }
    requestItems.push({ menuItemId, quantity });
  }

  const request: QuoteRequest = {
    vendorId,
    fulfillmentType,
    items: requestItems,
    deliveryLocation,
    deliveryComment: payload.delivery_comment ?? null,
    promoCode: payload.promo_code ?? null,
  };

  return request;
}

export function quoteCart(payload: QuotePayload, context: QuoteContext) {
  const request = buildQuoteRequest(payload, context);
  const vendor = context.vendors[request.vendorId];
  if (!vendor) {
    throw new QuoteNotFoundError("vendor not found");
  }

  const promotions = context.promotions.filter((promo) => promo.isActive);
  const quote = calculateQuote(
    request,
    vendor,
    context.menuItems,
    promotions,
    context.promoCode ?? null,
  );

  return {
    items_subtotal: quote.itemsSubtotal,
    discount_total: quote.discountTotal,
    promo_code: quote.promoCode,
    promo_code_discount: quote.promoCodeDiscount,
    service_fee: quote.serviceFee,
    delivery_fee: quote.deliveryFee,
    total: quote.total,
    promo_items_count: quote.promoItemsCount,
    combo_count: quote.comboCount,
    buyxgety_count: quote.buyxgetyCount,
    gift_count: quote.giftCount,
  };
}
