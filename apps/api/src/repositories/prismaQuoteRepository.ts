import { PrismaClient } from "@prisma/client";

import {
  MenuItem,
  Promotion,
  PromotionType,
  VendorCategory,
  VendorInfo,
} from "../pricing";
import { QuoteContextRepository } from "../quoteContext";

export class PrismaQuoteRepository implements QuoteContextRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getVendor(vendorId: string): Promise<VendorInfo | null> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return null;
    }

    return {
      vendorId: vendor.id,
      category: vendor.category as VendorCategory,
      supportsPickup: vendor.supportsPickup,
      geo: { lat: vendor.geoLat, lng: vendor.geoLng },
    };
  }

  async getMenuItems(menuItemIds: string[]): Promise<MenuItem[]> {
    if (menuItemIds.length === 0) {
      return [];
    }

    const items = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    return items.map((item) => ({
      itemId: item.id,
      vendorId: item.vendorId,
      price: item.price,
      isAvailable: item.isAvailable,
    }));
  }

  async getPromotionsForItems(
    vendorId: string,
    menuItemIds: string[],
  ): Promise<Promotion[]> {
    if (menuItemIds.length === 0) {
      return [];
    }

    const promotions = await this.prisma.promotion.findMany({
      where: {
        vendorId,
        isActive: true,
        promoType: { in: ["FIXED_PRICE", "PERCENT"] },
        promotionItems: {
          some: { menuItemId: { in: menuItemIds } },
        },
      },
      include: { promotionItems: true },
    });

    return promotions.map((promo) => ({
      promotionId: promo.id,
      promoType: promo.promoType as PromotionType,
      itemIds: promo.promotionItems.map((item) => item.menuItemId),
      valueNumeric: promo.valueNumeric,
      isActive: promo.isActive,
    }));
  }
}
