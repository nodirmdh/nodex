export type AvailableOrder = {
  order_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_address: string | null;
  vendor_geo: { lat: number; lng: number };
  delivery_location: { lat: number; lng: number } | null;
  status: string;
  items_subtotal: number;
  total: number;
  courier_fee: number;
};

export type CourierOrderDetails = {
  order_id: string;
  status: string;
  vendor_id: string;
  vendor_name: string;
  vendor_address: string | null;
  vendor_geo: { lat: number; lng: number };
  fulfillment_type: string;
  delivery_location: { lat: number; lng: number } | null;
  delivery_comment: string | null;
  utensils_count: number;
  receiver_phone: string | null;
  payment_method: string | null;
  change_for_amount: number | null;
  address_text: string | null;
  address_street: string | null;
  address_house: string | null;
  address_entrance: string | null;
  address_apartment: string | null;
  handoffCode?: string | null;
  deliveryCode?: string | null;
  pickupCode?: string | null;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    price: number;
    discount_amount: number;
    is_gift: boolean;
  }>;
  courier_fee: number;
  total: number;
};

export type CourierProfile = {
  courier_id: string;
  full_name: string | null;
  phone: string | null;
  telegram_username: string | null;
  photo_url?: string | null;
  avatar_url: string | null;
  avatar_file_id: string | null;
  delivery_method: string | null;
  is_available: boolean;
  max_active_orders: number;
  active_orders_count: number;
  remaining_slots: number;
  delivered_count: number;
  rating_avg: number;
  rating_count: number;
  ratings: Array<{
    order_id: string;
    courier_stars: number | null;
    courier_comment: string | null;
    created_at: string;
  }>;
};

export type CourierHistoryOrder = {
  order_id: string;
  vendor_id: string;
  vendor_name: string;
  status: string;
  total: number;
  courier_fee: number;
  created_at: string;
};

export type CourierBalance = {
  range: string;
  from: string | null;
  to: string | null;
  completed_count: number;
  gross_earnings: number;
  average_per_order: number;
};
