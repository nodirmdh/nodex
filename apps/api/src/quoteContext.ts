import { MenuItem, Promotion, PromoCode, QuoteContext, VendorInfo } from "./pricing";

export type QuoteContextRepository = {
  getVendor: (vendorId: string) => Promise<VendorInfo | null>;
  getMenuItems: (menuItemIds: string[]) => Promise<MenuItem[]>;
  getPromotionsForItems: (
    vendorId: string,
    menuItemIds: string[],
  ) => Promise<Promotion[]>;
  getPromoCodeByCode?: (code: string) => Promise<PromoCode | null>;
};

export async function buildQuoteContextFromRepository(
  repository: QuoteContextRepository,
  vendorId: string,
  menuItemIds: string[],
  promoCode?: string | null,
): Promise<QuoteContext> {
  const [vendor, promotions, promo] = await Promise.all([
    repository.getVendor(vendorId),
    repository.getPromotionsForItems(vendorId, menuItemIds),
    promoCode && repository.getPromoCodeByCode
      ? repository.getPromoCodeByCode(promoCode)
      : Promise.resolve(null),
  ]);

  const promotionItemIds = new Set<string>();
  for (const promo of promotions) {
    if (promo.promoType === "FIXED_PRICE" || promo.promoType === "PERCENT") {
      promo.itemIds.forEach((id) => promotionItemIds.add(id));
    }
    if (promo.promoType === "COMBO") {
      promo.comboItems.forEach((item) => promotionItemIds.add(item.itemId));
    }
    if (promo.promoType === "BUY_X_GET_Y") {
      promotionItemIds.add(promo.buyItemId);
      promotionItemIds.add(promo.getItemId);
    }
    if (promo.promoType === "GIFT") {
      promotionItemIds.add(promo.giftItemId);
    }
  }

  const allItemIds = Array.from(new Set([...menuItemIds, ...promotionItemIds]));
  const menuItems = await repository.getMenuItems(allItemIds);

  const menuItemMap: Record<string, MenuItem> = {};
  for (const item of menuItems) {
    menuItemMap[item.itemId] = item;
  }

  return {
    vendors: vendor ? { [vendor.vendorId]: vendor } : {},
    menuItems: menuItemMap,
    promotions,
    promoCode: promo,
  };
}
