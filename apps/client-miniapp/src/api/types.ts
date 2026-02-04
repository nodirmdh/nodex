export type VendorCategory = "RESTAURANTS" | "PRODUCTS" | "PHARMACY" | "MARKET";

export type VendorSummary = {
  vendor_id: string;
  category: VendorCategory;
  supports_pickup: boolean;
  address_text: string | null;
  geo: { lat: number; lng: number };
  name: string;
  description?: string | null;
  rating_avg: number;
  rating_count: number;
  active_promotions: string[];
};

export type MenuItem = {
  menu_item_id: string;
  price: number;
  is_available: boolean;
  title: string;
  description: string | null;
  weight_value: number | null;
  weight_unit: string | null;
  promo_badges: string[];
};

export type VendorDetails = {
  vendor_id: string;
  category: VendorCategory;
  supports_pickup: boolean;
  address_text: string | null;
  geo: { lat: number; lng: number };
  name: string;
  description?: string | null;
  rating_avg: number;
  rating_count: number;
  active_promotions: string[];
  menu: MenuItem[];
};

export type QuoteResponse = {
  items_subtotal: number;
  discount_total: number;
  promo_code: string | null;
  promo_code_discount: number;
  service_fee: number;
  delivery_fee: number;
  total: number;
  promo_items_count: number;
  combo_count: number;
  buyxgety_count: number;
  gift_count: number;
};

export type OrderResponse = {
  order_id: string;
  status: string;
  items_subtotal: number;
  discount_total: number;
  promo_code: string | null;
  promo_code_discount: number;
  service_fee: number;
  delivery_fee: number;
  total: number;
  promo_items_count: number;
  combo_count: number;
  buyxgety_count: number;
  gift_count: number;
  delivery_code: string | null;
};

export type OrderDetails = {
  order_id: string;
  status: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_geo?: { lat: number; lng: number };
  courier_id?: string | null;
  courier_rating_avg?: number | null;
  courier_rating_count?: number | null;
  fulfillment_type: string;
  delivery_location: { lat: number; lng: number } | null;
  delivery_comment: string | null;
  vendor_comment: string | null;
  utensils_count?: number;
  receiver_phone?: string | null;
  payment_method?: string | null;
  change_for_amount?: number | null;
  address_text?: string | null;
  address_street?: string | null;
  address_house?: string | null;
  address_entrance?: string | null;
  address_apartment?: string | null;
  items: Array<{
    menu_item_id: string;
    title?: string | null;
    weight_value?: number | null;
    weight_unit?: string | null;
    quantity: number;
    price: number;
    discount_amount: number;
    is_gift: boolean;
  }>;
  items_subtotal: number;
  discount_total: number;
  promo_code: string | null;
  promo_code_discount: number;
  service_fee: number;
  delivery_fee: number;
  total: number;
  rating?: {
    vendor_stars: number;
    vendor_comment: string | null;
    courier_stars: number | null;
    courier_comment: string | null;
  } | null;
};

export type OrderSummary = {
  order_id: string;
  vendor_id: string;
  vendor_name: string;
  status: string;
  total: number;
  fulfillment_type: string;
  created_at: string;
};

export type OrdersResponse = {
  orders: OrderSummary[];
  next_cursor: string | null;
};

export type OrderRatingPayload = {
  vendor_stars: number;
  vendor_comment?: string | null;
  courier_stars?: number | null;
  courier_comment?: string | null;
};

export type OrderRatingResponse = {
  rating: {
    vendor_stars: number;
    vendor_comment: string | null;
    courier_stars: number | null;
    courier_comment: string | null;
    created_at: string;
  } | null;
};

export type ClientProfile = {
  client_id: string;
  full_name: string | null;
  phone: string | null;
  telegram_username: string | null;
  about: string | null;
};

export type AddressEntry = {
  id: string;
  type: "HOME" | "WORK" | "OTHER";
  address_text: string;
  lat: number;
  lng: number;
  entrance: string | null;
  apartment: string | null;
  created_at: string;
};

export type TrackingResponse = {
  order_id: string;
  courier_id: string | null;
  location: { lat: number; lng: number } | null;
  updated_at: string | null;
};

export type PromoCodeEntry = {
  id: string;
  code: string;
  type: string;
  value: number;
  is_active?: boolean;
  status?: string;
  used?: boolean;
};
