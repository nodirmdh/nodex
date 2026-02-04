export type CourierHistoryOrderInput = {
  id: string;
  vendorId: string;
  vendorName: string;
  status: string;
  total: number;
  deliveryFee: number;
  createdAt: Date;
  addressText?: string | null;
  receiverPhone?: string | null;
};

export type CourierHistoryOrder = {
  order_id: string;
  vendor_id: string;
  vendor_name: string;
  status: string;
  total: number;
  courier_fee: number;
  created_at: Date;
};

export function mapCourierHistoryOrder(order: CourierHistoryOrderInput): CourierHistoryOrder {
  return {
    order_id: order.id,
    vendor_id: order.vendorId,
    vendor_name: order.vendorName,
    status: order.status,
    total: order.total,
    courier_fee: order.deliveryFee,
    created_at: order.createdAt,
  };
}

export function computeCourierBalance(orders: Array<{ deliveryFee: number }>) {
  const gross = orders.reduce((sum, order) => sum + order.deliveryFee, 0);
  const count = orders.length;
  const avg = count > 0 ? Math.floor(gross / count) : 0;
  return { gross, count, avg };
}
