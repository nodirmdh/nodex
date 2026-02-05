import { OrderStatus } from "./orderState";

export type FinanceOrder = {
  vendorId: string;
  itemsSubtotal: number;
  discountTotal: number;
  promoCodeDiscount: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus | string;
};

export type FinanceSummary = {
  gmv: number;
  gross_revenue: number;
  service_fee_total: number;
  delivery_fee_total: number;
  promo_discounts_total: number;
  platform_income: number;
  vendor_payouts: number;
  vendor_owes: number;
  completed_count: number;
};

export type FinanceByVendorRow = FinanceSummary & {
  vendor_id: string;
};

export function computeFinanceSummary(orders: FinanceOrder[]): FinanceSummary {
  const delivered = orders.filter(
    (order) => order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED,
  );
  const gmv = delivered.reduce((sum, order) => sum + order.itemsSubtotal, 0);
  const gross = delivered.reduce((sum, order) => sum + order.total, 0);
  const serviceFeeTotal = delivered.reduce((sum, order) => sum + order.serviceFee, 0);
  const deliveryFeeTotal = delivered.reduce((sum, order) => sum + order.deliveryFee, 0);
  const promoDiscounts = delivered.reduce(
    (sum, order) => sum + order.discountTotal + order.promoCodeDiscount,
    0,
  );
  const platformIncome = serviceFeeTotal;
  const vendorPayouts = gross - platformIncome;

  return {
    gmv,
    gross_revenue: gross,
    service_fee_total: serviceFeeTotal,
    delivery_fee_total: deliveryFeeTotal,
    promo_discounts_total: promoDiscounts,
    platform_income: platformIncome,
    vendor_payouts: vendorPayouts,
    vendor_owes: platformIncome,
    completed_count: delivered.length,
  };
}

export function computeFinanceByVendor(orders: FinanceOrder[]): FinanceByVendorRow[] {
  const byVendor = new Map<string, FinanceOrder[]>();
  for (const order of orders) {
    const existing = byVendor.get(order.vendorId) ?? [];
    existing.push(order);
    byVendor.set(order.vendorId, existing);
  }

  return Array.from(byVendor.entries()).map(([vendorId, vendorOrders]) => ({
    vendor_id: vendorId,
    ...computeFinanceSummary(vendorOrders),
  }));
}
