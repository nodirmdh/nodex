import { describe, expect, it } from "vitest";

import { buildActivePromotionBadges } from "../src/promotionVisibility";

describe("promotion visibility", () => {
  it("returns active promotion badges for client vendor list", () => {
    const now = new Date("2026-02-04T12:00:00Z");
    const promotions = [
      {
        promoType: "PERCENT",
        valueNumeric: 10,
        isActive: true,
        startsAt: null,
        endsAt: null,
      },
      {
        promoType: "COMBO",
        valueNumeric: 12000,
        isActive: true,
        startsAt: new Date("2026-02-05T00:00:00Z"),
        endsAt: null,
      },
      {
        promoType: "GIFT",
        valueNumeric: 0,
        isActive: false,
        startsAt: null,
        endsAt: null,
      },
    ];

    const badges = buildActivePromotionBadges(promotions, true, now);

    expect(badges).toContain("10% off");
    expect(badges).toContain("Promo code available");
    expect(badges).not.toContain("Combo");
    expect(badges).not.toContain("Gift");
  });
});
