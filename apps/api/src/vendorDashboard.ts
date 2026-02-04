import { OrderStatus } from "./orderState";

type OrderLike = {
  total: number;
  serviceFee: number;
  status: OrderStatus | string;
  createdAt: Date;
};

type VendorLike = {
  ratingAvg: number;
  ratingCount: number;
} | null;

export function computeVendorDashboard(orders: OrderLike[], vendor: VendorLike, days: number) {
  const delivered = orders.filter((order) => order.status === OrderStatus.DELIVERED);
  const revenue = delivered.reduce((sum, order) => sum + order.total, 0);
  const serviceFeeTotal = delivered.reduce((sum, order) => sum + order.serviceFee, 0);
  const completedCount = delivered.length;
  const avgCheck = completedCount > 0 ? Math.round(revenue / completedCount) : 0;

  const daily = new Map<string, { revenue: number; count: number }>();
  for (const order of delivered) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const entry = daily.get(key) ?? { revenue: 0, count: 0 };
    entry.revenue += order.total;
    entry.count += 1;
    daily.set(key, entry);
  }

  return {
    revenue,
    completed_count: completedCount,
    average_check: avgCheck,
    service_fee_total: serviceFeeTotal,
    vendor_owes: serviceFeeTotal,
    rating_avg: vendor?.ratingAvg ?? 0,
    rating_count: vendor?.ratingCount ?? 0,
    daily: Array.from(daily.entries()).map(([date, entry]) => ({
      date,
      revenue: entry.revenue,
      count: entry.count,
    })),
    range_days: days,
  };
}
