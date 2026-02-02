export const SERVICE_FEE_AMOUNT = 3000;
export const DELIVERY_BASE_FEE = 3000;
export const DELIVERY_PER_KM_FEE = 1000;

export enum FulfillmentType {
  DELIVERY = "DELIVERY",
  PICKUP = "PICKUP",
}

export enum VendorCategory {
  RESTAURANTS = "RESTAURANTS",
  PRODUCTS = "PRODUCTS",
  PHARMACY = "PHARMACY",
  MARKET = "MARKET",
}

export enum PromotionType {
  FIXED_PRICE = "FIXED_PRICE",
  PERCENT = "PERCENT",
}

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type VendorInfo = {
  vendorId: string;
  category: VendorCategory;
  supportsPickup: boolean;
  geo: GeoPoint;
};

export type MenuItem = {
  itemId: string;
  vendorId: string;
  price: number;
  isAvailable: boolean;
};

export type CartLine = {
  menuItemId: string;
  quantity: number;
};

export type Promotion = {
  promotionId: string;
  promoType: PromotionType;
  itemIds: string[];
  valueNumeric: number;
  isActive: boolean;
};

export type QuoteRequest = {
  vendorId: string;
  fulfillmentType: FulfillmentType;
  items: CartLine[];
  deliveryLocation?: GeoPoint | null;
  deliveryComment?: string | null;
  promoCode?: string | null;
};

export type QuoteResult = {
  itemsSubtotal: number;
  discountTotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  promoItemsCount: number;
  comboCount: number;
  buyxgetyCount: number;
  giftCount: number;
};

export class QuoteValidationError extends Error {
  statusCode = 400;
}

export type QuoteContext = {
  vendors: Record<string, VendorInfo>;
  menuItems: Record<string, MenuItem>;
  promotions: Promotion[];
};

export function haversineKm(origin: GeoPoint, destination: GeoPoint): number {
  const radiusKm = 6371.0;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = (destination.lat * Math.PI) / 180;
  const deltaLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const deltaLng = ((destination.lng - origin.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusKm * c;
}

export function calculateDeliveryFee(
  fulfillmentType: FulfillmentType,
  vendorGeo: GeoPoint,
  deliveryLocation?: GeoPoint | null,
): number {
  if (fulfillmentType === FulfillmentType.PICKUP) {
    return 0;
  }
  if (!deliveryLocation) {
    throw new QuoteValidationError("delivery_location is required for delivery orders");
  }
  const distanceKm = haversineKm(vendorGeo, deliveryLocation);
  return DELIVERY_BASE_FEE + Math.ceil(distanceKm) * DELIVERY_PER_KM_FEE;
}

function validatePickupRules(fulfillmentType: FulfillmentType, vendor: VendorInfo): void {
  if (fulfillmentType !== FulfillmentType.PICKUP) {
    return;
  }
  if (vendor.category !== VendorCategory.RESTAURANTS || !vendor.supportsPickup) {
    throw new QuoteValidationError(
      "pickup is only allowed for restaurants with pickup enabled",
    );
  }
}

function validateDeliveryRules(request: QuoteRequest): void {
  if (request.fulfillmentType !== FulfillmentType.DELIVERY) {
    return;
  }
  if (!request.deliveryLocation) {
    throw new QuoteValidationError("delivery_location is required for delivery orders");
  }
  if (!request.deliveryComment) {
    throw new QuoteValidationError("delivery_comment is required for delivery orders");
  }
}

function perUnitDiscount(unitPrice: number, promotions: Promotion[]): number {
  let bestDiscount = 0;
  for (const promo of promotions) {
    if (!promo.isActive) {
      continue;
    }
    const discount =
      promo.promoType === PromotionType.FIXED_PRICE
        ? Math.max(unitPrice - promo.valueNumeric, 0)
        : Math.floor((unitPrice * promo.valueNumeric) / 100);
    if (discount > bestDiscount) {
      bestDiscount = discount;
    }
  }
  return bestDiscount;
}

function calculateDiscounts(
  menuItems: Record<string, MenuItem>,
  requestItems: CartLine[],
  promotions: Promotion[],
): { discountTotal: number; promoItemsCount: number } {
  let discountTotal = 0;
  let promoItemsCount = 0;

  for (const line of requestItems) {
    const menuItem = menuItems[line.menuItemId];
    const applicablePromos = promotions.filter(
      (promo) => promo.isActive && promo.itemIds.includes(line.menuItemId),
    );
    const perUnit = perUnitDiscount(menuItem.price, applicablePromos);
    if (perUnit > 0) {
      promoItemsCount += 1;
      discountTotal += perUnit * line.quantity;
    }
  }

  return { discountTotal, promoItemsCount };
}

export function calculateQuote(
  request: QuoteRequest,
  vendor: VendorInfo,
  menuItems: Record<string, MenuItem>,
  promotions: Promotion[],
): QuoteResult {
  validatePickupRules(request.fulfillmentType, vendor);
  validateDeliveryRules(request);

  let itemsSubtotal = 0;
  for (const line of request.items) {
    const menuItem = menuItems[line.menuItemId];
    itemsSubtotal += menuItem.price * line.quantity;
  }

  const { discountTotal, promoItemsCount } = calculateDiscounts(
    menuItems,
    request.items,
    promotions,
  );

  const deliveryFee = calculateDeliveryFee(
    request.fulfillmentType,
    vendor.geo,
    request.deliveryLocation,
  );
  const total = itemsSubtotal - discountTotal + SERVICE_FEE_AMOUNT + deliveryFee;

  return {
    itemsSubtotal,
    discountTotal,
    serviceFee: SERVICE_FEE_AMOUNT,
    deliveryFee,
    total,
    promoItemsCount,
    comboCount: 0,
    buyxgetyCount: 0,
    giftCount: 0,
  };
}
