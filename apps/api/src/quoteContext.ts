import { MenuItem, Promotion, QuoteContext, VendorInfo } from "./pricing";

export type QuoteContextRepository = {
  getVendor: (vendorId: string) => Promise<VendorInfo | null>;
  getMenuItems: (menuItemIds: string[]) => Promise<MenuItem[]>;
  getPromotionsForItems: (
    vendorId: string,
    menuItemIds: string[],
  ) => Promise<Promotion[]>;
};

export async function buildQuoteContextFromRepository(
  repository: QuoteContextRepository,
  vendorId: string,
  menuItemIds: string[],
): Promise<QuoteContext> {
  const [vendor, menuItems, promotions] = await Promise.all([
    repository.getVendor(vendorId),
    repository.getMenuItems(menuItemIds),
    repository.getPromotionsForItems(vendorId, menuItemIds),
  ]);

  const menuItemMap: Record<string, MenuItem> = {};
  for (const item of menuItems) {
    menuItemMap[item.itemId] = item;
  }

  return {
    vendors: vendor ? { [vendor.vendorId]: vendor } : {},
    menuItems: menuItemMap,
    promotions,
  };
}
