type ApiClientOptions = {
  baseUrl?: string;
};

export type Vendor = {
  vendor_id: string;
  name: string;
  owner_full_name?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  phone3?: string | null;
  email?: string | null;
  phone: string | null;
  inn: string | null;
  category: string;
  supports_pickup: boolean;
  address_text: string | null;
  is_active: boolean;
  opening_hours: string | null;
  payout_details: unknown | null;
  geo: { lat: number; lng: number };
  rating_avg?: number;
  rating_count?: number;
  active_promotions_count?: number;
  weekly_stats?: { revenue: number; completed_count: number; average_check: number };
  created_at: string;
};

export type VendorDashboard = {
  revenue: number;
  completed_count: number;
  average_check: number;
  service_fee_total: number;
  vendor_owes: number;
  rating_avg: number;
  rating_count: number;
  daily: Array<{ date: string; revenue: number; count: number }>;
  range_days: number;
};

export type VendorReview = {
  order_id: string;
  vendor_stars: number;
  vendor_comment: string | null;
  courier_stars: number | null;
  courier_comment: string | null;
  created_at: string;
};

export type OrderSummary = {
  order_id: string;
  status: string;
  vendor_id: string;
  vendor_name?: string | null;
  client_id?: string | null;
  courier_id?: string | null;
  fulfillment_type: string;
  items_subtotal: number;
  total: number;
  delivery_comment: string | null;
  vendor_comment: string | null;
  receiver_phone?: string | null;
  created_at: string;
};

export type OrderDetails = {
  order_id: string;
  status: string;
  vendor_id: string;
  vendor_name?: string | null;
  client_id: string | null;
  courier_id: string | null;
  fulfillment_type: string;
  delivery_location: { lat: number; lng: number } | null;
  delivery_comment: string | null;
  vendor_comment: string | null;
  utensils_count: number;
  receiver_phone: string | null;
  payment_method: string | null;
  change_for_amount: number | null;
  address_text: string | null;
  address_street: string | null;
  address_house: string | null;
  address_entrance: string | null;
  address_apartment: string | null;
  items: Array<{
    menu_item_id: string;
    title: string | null;
    weight_value: number | null;
    weight_unit: string | null;
    quantity: number;
    price: number;
    discount_amount: number;
    is_gift: boolean;
  }>;
  items_subtotal: number;
  discount_total: number;
  promo_code: string | null;
  promo_code_type: string | null;
  promo_code_value: number | null;
  promo_code_discount: number;
  service_fee: number;
  delivery_fee: number;
  total: number;
  promo_items_count: number;
  combo_count: number;
  buyxgety_count: number;
  gift_count: number;
  events: Array<{ event_type: string; payload: unknown; created_at: string }>;
  tracking: Array<{
    courier_id: string;
    location: { lat: number; lng: number };
    created_at: string;
  }>;
  rating: {
    vendor_stars: number;
    vendor_comment: string | null;
    courier_stars: number | null;
    courier_comment: string | null;
    created_at: string;
  } | null;
};

export type PromotionSummary = {
  promotion_id: string;
  vendor_id: string;
  promo_type: string;
  value_numeric: number;
  priority?: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  items: string[];
  combo_items: Array<{ menu_item_id: string; quantity: number }>;
  buy_x_get_y: {
    buy_item_id: string;
    buy_quantity: number;
    get_item_id: string;
    get_quantity: number;
    discount_percent: number;
  } | null;
  gift: {
    gift_item_id: string;
    gift_quantity: number;
    min_order_amount: number;
  } | null;
};

export type MenuItem = {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  price: number;
  is_available: boolean;
  category: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientSummary = {
  client_id: string;
  full_name: string | null;
  phone: string | null;
  telegram_username: string | null;
  created_at?: string;
  orders_count: number;
  total_spent: number;
  saved_promo_codes: number;
  used_promo_codes?: number;
};

export type ClientDetails = {
  client_id: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    telegram_username: string | null;
    about: string | null;
  } | null;
  addresses: Array<{
    id: string;
    type: string;
    address_text: string;
    lat: number;
    lng: number;
    entrance: string | null;
    apartment: string | null;
    created_at: string;
  }>;
  orders: Array<{
    order_id: string;
    status: string;
    vendor_id: string;
    fulfillment_type: string;
    items_subtotal: number;
    total: number;
    created_at: string;
  }>;
  promo_codes: Array<{
    id: string;
    code: string;
    type: string;
    value: number;
    is_active: boolean;
    status?: string;
    used?: boolean;
  }>;
  ratings: Array<{
    order_id: string;
    vendor_id: string;
    courier_id: string | null;
    vendor_stars: number;
    vendor_comment: string | null;
    courier_stars: number | null;
    courier_comment: string | null;
    created_at: string;
  }>;
};

export type CourierSummary = {
  courier_id: string;
  delivered_count: number;
  active_status: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  gross_earnings?: number;
  full_name?: string | null;
  phone?: string | null;
  telegram_username?: string | null;
  delivery_method?: string | null;
  is_available?: boolean | null;
  max_active_orders?: number | null;
};

export type CourierDetails = {
  courier_id: string;
  full_name: string | null;
  phone: string | null;
  telegram_username: string | null;
  photo_url?: string | null;
  delivery_method: string | null;
  is_available: boolean | null;
  max_active_orders: number | null;
  delivered_count: number;
  gross_earnings: number;
  average_per_order: number;
  active_status: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  orders: Array<{
    order_id: string;
    status: string;
    vendor_id: string;
    fulfillment_type: string;
    total: number;
    delivery_fee?: number;
    created_at: string;
  }>;
  ratings: Array<{
    order_id: string;
    vendor_id: string;
    courier_stars: number | null;
    courier_comment: string | null;
    created_at: string;
  }>;
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
  from: string;
  to: string;
  by_vendor?: Array<
    FinanceSummary & { vendor_id: string; vendor_name: string }
  >;
};

export type PromoCode = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  min_order_sum: number | null;
};

export class ApiClient {
  private baseUrl: string;
  private onUnauthorized?: () => void;

  constructor(options: ApiClientOptions & { onUnauthorized?: () => void } = {}) {
    this.baseUrl =
      options.baseUrl ??
      (import.meta.env.VITE_API_URL as string | undefined) ??
      "http://localhost:3000";
    this.onUnauthorized = options.onUnauthorized;
  }

  async listVendors(): Promise<Vendor[]> {
    const data = await this.request<{ vendors: Vendor[] }>("/admin/vendors");
    return data.vendors;
  }

  async createVendor(payload: {
    name: string;
    description?: string;
    owner_full_name?: string;
    phone1?: string;
    phone2?: string;
    phone3?: string;
    email?: string;
    phone?: string;
    inn?: string;
    category: string;
    supports_pickup: boolean;
    address_text?: string;
    is_active?: boolean;
    opening_hours?: string;
    payout_details?: unknown;
    geo: { lat: number; lng: number };
  }): Promise<Vendor> {
    return this.request<Vendor>("/admin/vendors", "POST", payload);
  }

  async getVendor(vendorId: string): Promise<Vendor> {
    return this.request<Vendor>(`/admin/vendors/${vendorId}`);
  }

  async getVendorDashboard(vendorId: string): Promise<VendorDashboard> {
    return this.request<VendorDashboard>(`/admin/vendors/${vendorId}/dashboard`);
  }

  async getVendorStats(vendorId: string, range?: string): Promise<VendorDashboard & { from: string; to: string }> {
    const query = range ? `?range=${encodeURIComponent(range)}` : "";
    return this.request<VendorDashboard & { from: string; to: string }>(
      `/admin/vendors/${vendorId}/stats${query}`,
    );
  }

  async getVendorFinance(vendorId: string, range?: string): Promise<FinanceSummary> {
    const query = range ? `?range=${encodeURIComponent(range)}` : "";
    return this.request<FinanceSummary>(`/admin/vendors/${vendorId}/finance${query}`);
  }

  async getVendorReviews(vendorId: string): Promise<VendorReview[]> {
    const data = await this.request<{ reviews: VendorReview[] }>(
      `/admin/vendors/${vendorId}/reviews`,
    );
    return data.reviews;
  }

  async getVendorPromotions(vendorId: string): Promise<
    Array<{
      promotion_id: string;
      vendor_id: string;
      promo_type: string;
      value_numeric: number;
      priority?: number;
      is_active: boolean;
      starts_at: string | null;
      ends_at: string | null;
      items?: string[];
      combo_items?: Array<{ menu_item_id: string; quantity: number }>;
      buy_x_get_y?: {
        buy_item_id: string;
        buy_quantity: number;
        get_item_id: string;
        get_quantity: number;
        discount_percent: number;
      } | null;
      gift?: {
        gift_item_id: string;
        gift_quantity: number;
        min_order_amount: number;
      } | null;
    }>
  > {
    const data = await this.request<{ promotions: Array<{
      promotion_id: string;
      vendor_id: string;
      promo_type: string;
      value_numeric: number;
      priority?: number;
      is_active: boolean;
      starts_at: string | null;
      ends_at: string | null;
      items?: string[];
      combo_items?: Array<{ menu_item_id: string; quantity: number }>;
      buy_x_get_y?: {
        buy_item_id: string;
        buy_quantity: number;
        get_item_id: string;
        get_quantity: number;
        discount_percent: number;
      } | null;
      gift?: {
        gift_item_id: string;
        gift_quantity: number;
        min_order_amount: number;
      } | null;
    }> }>(`/admin/vendors/${vendorId}/promotions`);
    return data.promotions;
  }

  async updateVendor(
    vendorId: string,
    payload: Partial<{
      name: string;
      owner_full_name: string | null;
      phone1: string | null;
      phone2: string | null;
      phone3: string | null;
      email: string | null;
      phone: string | null;
      inn: string | null;
      category: string;
      supports_pickup: boolean;
      address_text: string | null;
      is_active: boolean;
      opening_hours: string | null;
      payout_details: unknown | null;
      geo: { lat: number; lng: number };
    }>,
  ): Promise<Vendor> {
    return this.request<Vendor>(`/admin/vendors/${vendorId}`, "PATCH", payload);
  }

  async listOrders(filters: {
    order_id?: string;
    status?: string;
    vendor_id?: string;
    vendor_name?: string;
    client_id?: string;
    receiver_phone?: string;
    fulfillment_type?: string;
    from?: string;
    to?: string;
  }): Promise<OrderSummary[]> {
    const params = new URLSearchParams();
    if (filters.order_id) params.set("order_id", filters.order_id);
    if (filters.status) params.set("status", filters.status);
    if (filters.vendor_id) params.set("vendor_id", filters.vendor_id);
    if (filters.vendor_name) params.set("vendor_name", filters.vendor_name);
    if (filters.client_id) params.set("client_id", filters.client_id);
    if (filters.receiver_phone) params.set("receiver_phone", filters.receiver_phone);
    if (filters.fulfillment_type) params.set("fulfillment_type", filters.fulfillment_type);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const query = params.toString();
    const data = await this.request<{ orders: OrderSummary[] }>(
      `/admin/orders${query ? `?${query}` : ""}`,
    );
    return data.orders;
  }

  async getOrder(orderId: string): Promise<OrderDetails> {
    return this.request<OrderDetails>(`/admin/orders/${orderId}`);
  }

  async updateOrder(
    orderId: string,
    payload: { status?: string; delivery_comment?: string | null; vendor_comment?: string | null },
  ): Promise<{ order_id: string; status: string; pickup_code?: string | null }> {
    return this.request<{ order_id: string; status: string; pickup_code?: string | null }>(
      `/admin/orders/${orderId}`,
      "PATCH",
      payload,
    );
  }

  async cancelOrder(orderId: string, reason?: string): Promise<{ order_id: string; status: string }> {
    return this.request<{ order_id: string; status: string }>(
      `/admin/orders/${orderId}/cancel`,
      "POST",
      { reason },
    );
  }

  async listPromotions(vendorId?: string): Promise<PromotionSummary[]> {
    const query = vendorId ? `?vendor_id=${encodeURIComponent(vendorId)}` : "";
    const data = await this.request<{ promotions: PromotionSummary[] }>(
      `/admin/promotions${query}`,
    );
    return data.promotions;
  }

  async listPromoCodes(): Promise<PromoCode[]> {
    const data = await this.request<{ promo_codes: PromoCode[] }>("/admin/promo-codes");
    return data.promo_codes;
  }

  async createPromoCode(payload: {
    code: string;
    type: "PERCENT" | "FIXED";
    value: number;
    is_active?: boolean;
    starts_at?: string;
    ends_at?: string;
    usage_limit?: number | null;
    min_order_sum?: number | null;
  }): Promise<PromoCode> {
    return this.request<PromoCode>("/admin/promo-codes", "POST", payload);
  }

  async updatePromoCode(
    id: string,
    payload: Partial<{
      code: string;
      type: "PERCENT" | "FIXED";
      value: number;
      is_active: boolean;
      starts_at: string | null;
      ends_at: string | null;
      usage_limit: number | null;
      min_order_sum: number | null;
    }>,
  ): Promise<PromoCode> {
    return this.request<PromoCode>(`/admin/promo-codes/${id}`, "PATCH", payload);
  }

  async deletePromoCode(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/admin/promo-codes/${id}`, "DELETE");
  }

  async listClients(): Promise<ClientSummary[]> {
    const data = await this.request<{ clients: ClientSummary[] }>("/admin/clients");
    return data.clients;
  }

  async getClient(clientId: string): Promise<ClientDetails> {
    return this.request<ClientDetails>(`/admin/clients/${clientId}`);
  }

  async listCouriers(): Promise<CourierSummary[]> {
    const data = await this.request<{ couriers: CourierSummary[] }>("/admin/couriers");
    return data.couriers;
  }

  async createCourier(payload: {
    courier_id: string;
    full_name?: string | null;
    phone?: string | null;
    telegram_username?: string | null;
    photo_url?: string | null;
    delivery_method?: string | null;
    is_available?: boolean;
    max_active_orders?: number;
  }): Promise<CourierDetails> {
    return this.request<CourierDetails>("/admin/couriers", "POST", payload);
  }

  async getCourier(courierId: string): Promise<CourierDetails> {
    return this.request<CourierDetails>(`/admin/couriers/${courierId}`);
  }

  async updateCourier(
    courierId: string,
    payload: Partial<{
      full_name: string | null;
      phone: string | null;
      telegram_username: string | null;
      photo_url: string | null;
      delivery_method: string | null;
      is_available: boolean;
      max_active_orders: number;
    }>,
  ): Promise<CourierDetails> {
    return this.request<CourierDetails>(`/admin/couriers/${courierId}`, "PATCH", payload);
  }

  async getCourierOrders(courierId: string): Promise<CourierDetails["orders"]> {
    const data = await this.request<{ orders: CourierDetails["orders"] }>(
      `/admin/couriers/${courierId}/orders`,
    );
    return data.orders;
  }

  async getCourierFinance(courierId: string, range?: string): Promise<{
    from: string;
    to: string;
    completed_count: number;
    gross_earnings: number;
    average_per_order: number;
  }> {
    const query = range ? `?range=${encodeURIComponent(range)}` : "";
    return this.request<{ from: string; to: string; completed_count: number; gross_earnings: number; average_per_order: number }>(
      `/admin/couriers/${courierId}/finance${query}`,
    );
  }

  async getCourierReviews(courierId: string): Promise<CourierDetails["ratings"]> {
    const data = await this.request<{ ratings: CourierDetails["ratings"] }>(
      `/admin/couriers/${courierId}/reviews`,
    );
    return data.ratings;
  }

  async listMenuItems(vendorId: string): Promise<MenuItem[]> {
    const data = await this.request<{ items: MenuItem[] }>(
      `/admin/menu-items?vendor_id=${encodeURIComponent(vendorId)}`,
    );
    return data.items;
  }

  async createMenuItem(payload: {
    vendor_id: string;
    title: string;
    description?: string | null;
    price: number;
    is_available?: boolean;
    category?: string | null;
    image_url?: string | null;
  }): Promise<MenuItem> {
    return this.request<MenuItem>("/admin/menu-items", "POST", payload);
  }

  async updateMenuItem(
    id: string,
    payload: Partial<{
      title: string;
      description: string | null;
      price: number;
      is_available: boolean;
      category: string | null;
      image_url: string | null;
    }>,
  ): Promise<MenuItem> {
    return this.request<MenuItem>(`/admin/menu-items/${id}`, "PATCH", payload);
  }

  async deleteMenuItem(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/admin/menu-items/${id}`, "DELETE");
  }

  async getFinance(range?: string): Promise<FinanceSummary> {
    const query = range ? `?range=${encodeURIComponent(range)}` : "";
    return this.request<FinanceSummary>(`/admin/finance${query}`);
  }

  private async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const token = localStorage.getItem("nodex_admin_token");
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      localStorage.removeItem("nodex_admin_token");
      this.onUnauthorized?.();
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
