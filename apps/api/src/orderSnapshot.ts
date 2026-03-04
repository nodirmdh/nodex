import { QuoteResult } from "./pricing";

export type OrderSnapshot = {
  itemsSubtotal: number;
  discountTotal: number;
  promoCode: string | null;
  promoCodeDiscount: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  promoItemsCount: number;
  comboCount: number;
  buyxgetyCount: number;
  giftCount: number;
};

export function buildOrderSnapshot(quote: QuoteResult): OrderSnapshot {
  return {
    itemsSubtotal: quote.itemsSubtotal,
    discountTotal: quote.discountTotal,
    promoCode: quote.promoCode,
    promoCodeDiscount: quote.promoCodeDiscount,
    serviceFee: quote.serviceFee,
    deliveryFee: quote.deliveryFee,
    total: quote.total,
    promoItemsCount: quote.promoItemsCount,
    comboCount: quote.comboCount,
    buyxgetyCount: quote.buyxgetyCount,
    giftCount: quote.giftCount,
  };
}
