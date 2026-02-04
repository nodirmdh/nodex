import { PromotionType } from "@prisma/client";

export function formatPromotionBadge(promoType: string, valueNumeric: number) {
  switch (promoType) {
    case "PERCENT":
      return `${valueNumeric}% off`;
    case "FIXED_PRICE":
      return "Fixed price";
    case "COMBO":
      return "Combo";
    case "BUY_X_GET_Y":
      return "Buy X Get Y";
    case "GIFT":
      return "Gift";
    default:
      return promoType;
  }
}

export function isPromotionActiveNow(
  promo: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date,
) {
  if (!promo.isActive) {
    return false;
  }
  if (promo.startsAt && now < promo.startsAt) {
    return false;
  }
  if (promo.endsAt && now > promo.endsAt) {
    return false;
  }
  return true;
}

export function buildActivePromotionBadges(
  promotions: Array<{ promoType: PromotionType | string; valueNumeric: number; isActive: boolean; startsAt: Date | null; endsAt: Date | null }>,
  promoCodeAvailable: boolean,
  now: Date,
) {
  const badges = new Set<string>();
  for (const promo of promotions) {
    if (isPromotionActiveNow(promo, now)) {
      const badge = formatPromotionBadge(promo.promoType, promo.valueNumeric);
      if (badge) {
        badges.add(badge);
      }
    }
  }
  if (promoCodeAvailable) {
    badges.add("Promo code available");
  }
  return Array.from(badges);
}
