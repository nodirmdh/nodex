export class PromoAlreadyUsedError extends Error {
  code = "PROMO_ALREADY_USED";

  constructor(message = "promo_code already used") {
    super(message);
    this.name = "PromoAlreadyUsedError";
  }
}

export function assertPromoNotRedeemed(redeemed: boolean) {
  if (redeemed) {
    throw new PromoAlreadyUsedError();
  }
}

export function promoCodeStatus(
  promo: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  used: boolean,
) {
  if (used) {
    return "USED";
  }
  if (!promo.isActive) {
    return "INACTIVE";
  }
  const now = new Date();
  if ((promo.startsAt && now < promo.startsAt) || (promo.endsAt && now > promo.endsAt)) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

export function isPromoRedemptionConflict(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = (error as { code?: string }).code;
  if (code !== "P2002") {
    return false;
  }
  const target = (error as { meta?: { target?: string[] | string } }).meta?.target;
  if (Array.isArray(target)) {
    return target.includes("promoCodeId") && target.includes("clientId");
  }
  if (typeof target === "string") {
    return target.includes("promoCodeId") && target.includes("clientId");
  }
  return false;
}
