import { describe, expect, it } from "vitest";

import { buildOrderSnapshot } from "../src/orderSnapshot";
import { QuoteResult } from "../src/pricing";

describe("order snapshot", () => {
  it("keeps totals immutable after creation", () => {
    const quote: QuoteResult = {
      itemsSubtotal: 12000,
      discountTotal: 2000,
      promoCode: "SAVE10",
      promoCodeDiscount: 1000,
      promoCodeApplied: true,
      serviceFee: 3000,
      deliveryFee: 4000,
      total: 17000,
      promoItemsCount: 1,
      comboCount: 0,
      buyxgetyCount: 0,
      giftCount: 0,
      lineItems: [],
    };

    const snapshot = buildOrderSnapshot(quote);

    quote.itemsSubtotal = 99999;
    quote.total = 99999;
    quote.promoCodeDiscount = 999;

    expect(snapshot.itemsSubtotal).toBe(12000);
    expect(snapshot.total).toBe(17000);
    expect(snapshot.promoCodeDiscount).toBe(1000);
  });
});
