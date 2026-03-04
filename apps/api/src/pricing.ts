export const SERVICE_FEE_AMOUNT = 3000;
export const DELIVERY_BASE_FEE = 3000;
export const DELIVERY_PER_KM_FEE = 1000;
export const MAX_DELIVERY_DISTANCE_KM = 50;

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
  COMBO = "COMBO",
  BUY_X_GET_Y = "BUY_X_GET_Y",
  GIFT = "GIFT",
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

type BasePromotion = {
  promotionId: string;
  promoType: PromotionType;
  isActive: boolean;
  priority: number;
};

export type FixedPercentPromotion = BasePromotion & {
  promoType: PromotionType.FIXED_PRICE | PromotionType.PERCENT;
  itemIds: string[];
  valueNumeric: number;
};

export type ComboPromotion = BasePromotion & {
  promoType: PromotionType.COMBO;
  comboItems: { itemId: string; quantity: number }[];
  valueNumeric: number;
};

export type BuyXGetYPromotion = BasePromotion & {
  promoType: PromotionType.BUY_X_GET_Y;
  buyItemId: string;
  buyQuantity: number;
  getItemId: string;
  getQuantity: number;
  discountPercent: number;
};

export type GiftPromotion = BasePromotion & {
  promoType: PromotionType.GIFT;
  giftItemId: string;
  giftQuantity: number;
  minOrderAmount: number;
};

export type Promotion =
  | FixedPercentPromotion
  | ComboPromotion
  | BuyXGetYPromotion
  | GiftPromotion;

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
  promoCode: string | null;
  promoCodeDiscount: number;
  promoCodeApplied: boolean;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  promoItemsCount: number;
  comboCount: number;
  buyxgetyCount: number;
  giftCount: number;
  lineItems: QuoteLineItem[];
};

export class QuoteValidationError extends Error {
  statusCode = 400;
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export type QuoteContext = {
  vendors: Record<string, VendorInfo>;
  menuItems: Record<string, MenuItem>;
  promotions: Promotion[];
  promoCode?: PromoCode | null;
};

export type PromoCode = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  minOrderSum: number | null;
};

export type QuoteLineItem = {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  isGift: boolean;
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
  if (!Number.isFinite(vendorGeo.lat) || !Number.isFinite(vendorGeo.lng)) {
    throw new QuoteValidationError("vendor geo is missing");
  }
  if (!Number.isFinite(deliveryLocation.lat) || !Number.isFinite(deliveryLocation.lng)) {
    throw new QuoteValidationError("delivery_location is required for delivery orders");
  }
  const distanceKm = haversineKm(vendorGeo, deliveryLocation);
  if (!Number.isFinite(distanceKm) || distanceKm > MAX_DELIVERY_DISTANCE_KM) {
    throw new QuoteValidationError("delivery location is too far", "DELIVERY_TOO_FAR");
  }
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

function perUnitDiscount(unitPrice: number, promotions: FixedPercentPromotion[]): number {
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

type DiscountResult = {
  discountTotal: number;
  promoItemsCount: number;
  comboCount: number;
  buyxgetyCount: number;
  giftCount: number;
  lineDiscounts: Record<string, number>;
  giftItems: { menuItemId: string; quantity: number }[];
};

function calculateDiscounts(
  menuItems: Record<string, MenuItem>,
  requestItems: CartLine[],
  promotions: Promotion[],
  itemsSubtotal: number,
): DiscountResult {
  let discountTotal = 0;
  let comboCount = 0;
  let buyxgetyCount = 0;
  let giftCount = 0;
  const lineDiscounts: Record<string, number> = {};
  const giftItems: { menuItemId: string; quantity: number }[] = [];

  const remainingQty: Record<string, number> = {};
  for (const line of requestItems) {
    remainingQty[line.menuItemId] = (remainingQty[line.menuItemId] ?? 0) + line.quantity;
    lineDiscounts[line.menuItemId] = 0;
  }

  const comboPromos = promotions.filter(
    (promo): promo is ComboPromotion => promo.promoType === PromotionType.COMBO && promo.isActive,
  ).sort((a, b) => b.priority - a.priority || a.promotionId.localeCompare(b.promotionId));
  const buyxgetyPromos = promotions.filter(
    (promo): promo is BuyXGetYPromotion =>
      promo.promoType === PromotionType.BUY_X_GET_Y && promo.isActive,
  ).sort((a, b) => b.priority - a.priority || a.promotionId.localeCompare(b.promotionId));
  const fixedPercentPromos = promotions.filter(
    (promo): promo is FixedPercentPromotion =>
      (promo.promoType === PromotionType.FIXED_PRICE ||
        promo.promoType === PromotionType.PERCENT) &&
      promo.isActive,
  ).sort((a, b) => b.priority - a.priority || a.promotionId.localeCompare(b.promotionId));
  const giftPromos = promotions.filter(
    (promo): promo is GiftPromotion => promo.promoType === PromotionType.GIFT && promo.isActive,
  ).sort((a, b) => b.priority - a.priority || a.promotionId.localeCompare(b.promotionId));

  for (const combo of comboPromos) {
    if (combo.comboItems.length === 0) {
      continue;
    }

    const maxSets = combo.comboItems.reduce((minSets, item) => {
      const available = remainingQty[item.itemId] ?? 0;
      return Math.min(minSets, Math.floor(available / item.quantity));
    }, Number.POSITIVE_INFINITY);

    if (!Number.isFinite(maxSets) || maxSets <= 0) {
      continue;
    }

    for (let setIndex = 0; setIndex < maxSets; setIndex += 1) {
      let setTotal = 0;
      for (const item of combo.comboItems) {
        const menuItem = menuItems[item.itemId];
        if (!menuItem) {
          continue;
        }
        setTotal += menuItem.price * item.quantity;
      }

      const discount = Math.max(setTotal - combo.valueNumeric, 0);
      if (discount <= 0) {
        break;
      }

      let remainingDiscount = discount;
      combo.comboItems.forEach((item, index) => {
        const menuItem = menuItems[item.itemId];
        if (!menuItem) {
          return;
        }
        const itemTotal = menuItem.price * item.quantity;
        const share =
          index === combo.comboItems.length - 1
            ? remainingDiscount
            : Math.floor((discount * itemTotal) / setTotal);
        remainingDiscount -= share;
        lineDiscounts[item.itemId] = (lineDiscounts[item.itemId] ?? 0) + share;
      });

      for (const item of combo.comboItems) {
        remainingQty[item.itemId] = Math.max(0, (remainingQty[item.itemId] ?? 0) - item.quantity);
      }

      discountTotal += discount;
      comboCount += 1;
    }
  }

  for (const promo of buyxgetyPromos) {
    const availableBuy = remainingQty[promo.buyItemId] ?? 0;
    const availableGet = remainingQty[promo.getItemId] ?? 0;
    const possibleSets = Math.min(
      Math.floor(availableBuy / promo.buyQuantity),
      Math.floor(availableGet / promo.getQuantity),
    );
    if (possibleSets <= 0) {
      continue;
    }

    const menuItem = menuItems[promo.getItemId];
    if (!menuItem) {
      continue;
    }

    const discountedUnits = possibleSets * promo.getQuantity;
    const perUnit = Math.floor((menuItem.price * promo.discountPercent) / 100);
    const discount = perUnit * discountedUnits;

    if (discount > 0) {
      lineDiscounts[promo.getItemId] =
        (lineDiscounts[promo.getItemId] ?? 0) + discount;
      discountTotal += discount;
      buyxgetyCount += possibleSets;
      remainingQty[promo.getItemId] = Math.max(0, availableGet - discountedUnits);
    }
  }

  for (const line of requestItems) {
    const menuItem = menuItems[line.menuItemId];
    const remaining = remainingQty[line.menuItemId] ?? 0;
    if (!menuItem || remaining <= 0) {
      continue;
    }
    const applicablePromos = fixedPercentPromos.filter((promo) =>
      promo.itemIds.includes(line.menuItemId),
    );
    const perUnit = perUnitDiscount(menuItem.price, applicablePromos);
    if (perUnit > 0) {
      lineDiscounts[line.menuItemId] =
        (lineDiscounts[line.menuItemId] ?? 0) + perUnit * remaining;
      discountTotal += perUnit * remaining;
    }
  }

  for (const promo of giftPromos) {
    if (itemsSubtotal < promo.minOrderAmount) {
      continue;
    }
    const menuItem = menuItems[promo.giftItemId];
    if (!menuItem) {
      continue;
    }
    giftItems.push({ menuItemId: promo.giftItemId, quantity: promo.giftQuantity });
    giftCount += promo.giftQuantity;
  }

  const promoItemsCount = Object.values(lineDiscounts).filter((amount) => amount > 0).length;

  return { discountTotal, promoItemsCount, comboCount, buyxgetyCount, giftCount, lineDiscounts, giftItems };
}

export function calculateQuote(
  request: QuoteRequest,
  vendor: VendorInfo,
  menuItems: Record<string, MenuItem>,
  promotions: Promotion[],
  promoCode?: PromoCode | null,
): QuoteResult {
  validatePickupRules(request.fulfillmentType, vendor);
  validateDeliveryRules(request);

  let itemsSubtotal = 0;
  for (const line of request.items) {
    const menuItem = menuItems[line.menuItemId];
    itemsSubtotal += menuItem.price * line.quantity;
  }

  const {
    discountTotal,
    promoItemsCount,
    comboCount,
    buyxgetyCount,
    giftCount,
    lineDiscounts,
    giftItems,
  } = calculateDiscounts(menuItems, request.items, promotions, itemsSubtotal);

  const deliveryFee = calculateDeliveryFee(
    request.fulfillmentType,
    vendor.geo,
    request.deliveryLocation,
  );
  const promoEvaluation = evaluatePromoCode(
    promoCode ?? null,
    itemsSubtotal,
    discountTotal,
  );
  const promoCodeDiscount = promoEvaluation.discount;
  const total = Math.max(
    itemsSubtotal - discountTotal - promoCodeDiscount + SERVICE_FEE_AMOUNT + deliveryFee,
    0,
  );

  const lineItems: QuoteLineItem[] = request.items.map((line) => ({
    menuItemId: line.menuItemId,
    quantity: line.quantity,
    unitPrice: menuItems[line.menuItemId].price,
    discountAmount: lineDiscounts[line.menuItemId] ?? 0,
    isGift: false,
  }));

  for (const gift of giftItems) {
    lineItems.push({
      menuItemId: gift.menuItemId,
      quantity: gift.quantity,
      unitPrice: 0,
      discountAmount: 0,
      isGift: true,
    });
  }

  return {
    itemsSubtotal,
    discountTotal,
    promoCode: promoEvaluation.applied ? promoCode?.code ?? null : null,
    promoCodeDiscount,
    promoCodeApplied: promoEvaluation.applied,
    serviceFee: SERVICE_FEE_AMOUNT,
    deliveryFee,
    total,
    promoItemsCount,
    comboCount,
    buyxgetyCount,
    giftCount,
    lineItems,
  };
}

function evaluatePromoCode(
  promoCode: PromoCode | null,
  itemsSubtotal: number,
  discountTotal: number,
): { discount: number; applied: boolean } {
  if (!promoCode) {
    return { discount: 0, applied: false };
  }
  if (!promoCode.isActive) {
    return { discount: 0, applied: false };
  }

  const now = new Date();
  if (promoCode.startsAt && now < promoCode.startsAt) {
    return { discount: 0, applied: false };
  }
  if (promoCode.endsAt && now > promoCode.endsAt) {
    return { discount: 0, applied: false };
  }
  if (promoCode.usageLimit !== null && promoCode.usedCount >= promoCode.usageLimit) {
    return { discount: 0, applied: false };
  }
  if (promoCode.minOrderSum !== null && itemsSubtotal < promoCode.minOrderSum) {
    return { discount: 0, applied: false };
  }

  const base = Math.max(itemsSubtotal - discountTotal, 0);
  if (promoCode.type === "PERCENT") {
    return {
      discount: Math.min(base, Math.floor((base * promoCode.value) / 100)),
      applied: true,
    };
  }
  return { discount: Math.min(base, promoCode.value), applied: true };
}
