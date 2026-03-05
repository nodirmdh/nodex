import { describe, expect, it } from "vitest";

import { PromoAlreadyUsedError, assertPromoNotRedeemed } from "../src/promoRedemption";

describe("promo redemption", () => {
  it("throws when promo already redeemed", () => {
    expect(() => assertPromoNotRedeemed(true)).toThrow(PromoAlreadyUsedError);
  });

  it("allows when promo not redeemed", () => {
    expect(() => assertPromoNotRedeemed(false)).not.toThrow();
  });
});
