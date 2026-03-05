import { PrismaClient } from "@prisma/client";

import {
  BuyXGetYPromotion,
  ComboPromotion,
  FixedPercentPromotion,
  PromoCode,
  GiftPromotion,
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
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        vendorId,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      include: {
        promotionItems: true,
        comboItems: true,
        buyXGetY: true,
        gift: true,
      },
    });

    const mapped: Promotion[] = [];
    for (const promo of promotions) {
      if (
        promo.promoType === "FIXED_PRICE" ||
        promo.promoType === "PERCENT"
      ) {
        const itemIds = promo.promotionItems.map((item) => item.menuItemId);
        if (itemIds.length === 0) {
          continue;
        }
        if (
          menuItemIds.length > 0 &&
          !itemIds.some((itemId) => menuItemIds.includes(itemId))
        ) {
          continue;
        }
        mapped.push({
          promotionId: promo.id,
          promoType: promo.promoType as PromotionType,
          itemIds,
          valueNumeric: promo.valueNumeric,
          priority: promo.priority,
          isActive: promo.isActive,
        } satisfies FixedPercentPromotion);
        continue;
      }

      if (promo.promoType === "COMBO") {
        if (promo.comboItems.length === 0) {
          continue;
        }
        const comboItems = promo.comboItems.map((item) => ({
          itemId: item.menuItemId,
          quantity: item.quantity,
        }));
        if (
          menuItemIds.length > 0 &&
          !comboItems.some((item) => menuItemIds.includes(item.itemId))
        ) {
          continue;
        }
        mapped.push({
          promotionId: promo.id,
          promoType: PromotionType.COMBO,
          comboItems,
          valueNumeric: promo.valueNumeric,
          priority: promo.priority,
          isActive: promo.isActive,
        } satisfies ComboPromotion);
        continue;
      }

      if (promo.promoType === "BUY_X_GET_Y") {
        if (!promo.buyXGetY) {
          continue;
        }
        const buyX = promo.buyXGetY;
        if (
          menuItemIds.length > 0 &&
          !menuItemIds.includes(buyX.buyItemId) &&
          !menuItemIds.includes(buyX.getItemId)
        ) {
          continue;
        }
        mapped.push({
          promotionId: promo.id,
          promoType: PromotionType.BUY_X_GET_Y,
          buyItemId: buyX.buyItemId,
          buyQuantity: buyX.buyQuantity,
          getItemId: buyX.getItemId,
          getQuantity: buyX.getQuantity,
          discountPercent: buyX.discountPercent,
          priority: promo.priority,
          isActive: promo.isActive,
        } satisfies BuyXGetYPromotion);
        continue;
      }

      if (promo.promoType === "GIFT") {
        if (!promo.gift) {
          continue;
        }
        mapped.push({
          promotionId: promo.id,
          promoType: PromotionType.GIFT,
          giftItemId: promo.gift.giftItemId,
          giftQuantity: promo.gift.giftQuantity,
          minOrderAmount: promo.gift.minOrderAmount,
          priority: promo.priority,
          isActive: promo.isActive,
        } satisfies GiftPromotion);
      }
    }

    return mapped;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    const normalized = code.trim().toUpperCase();
    const promo = await this.prisma.promoCode.findFirst({
      where: {
        code: {
          equals: normalized,
          mode: "insensitive",
        },
      },
    });
    if (!promo) {
      return null;
    }
    return {
      id: promo.id,
      code: promo.code,
      type: promo.type as "PERCENT" | "FIXED",
      value: promo.value,
      isActive: promo.isActive,
      startsAt: promo.startsAt,
      endsAt: promo.endsAt,
      usageLimit: promo.usageLimit,
      usedCount: promo.usedCount,
      minOrderSum: promo.minOrderSum,
    };
  }
}
