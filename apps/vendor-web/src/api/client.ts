type ApiClientOptions = {
  baseUrl?: string;
  vendorId?: string | null;
};

export type VendorOrderSummary = {
  order_id: string;
  status: string;
  vendor_id: string;
  fulfillment_type: string;
  items_subtotal: number;
  total: number;
  delivery_comment: string | null;
  vendor_comment: string | null;
  created_at: string;
};

export type VendorOrderDetails = {
  order_id: string;
  status: string;
  vendor_id: string;
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

export type VendorProfile = {
  vendor_id: string;
  name: string;
  owner_full_name: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  email: string | null;
  inn: string | null;
  phone: string | null;
  address_text: string | null;
  opening_hours: string | null;
  supports_pickup: boolean;
  payment_methods: { cash: boolean; card: boolean };
  geo: { lat: number; lng: number };
};

export type MenuItem = {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  weight_value: number | null;
  weight_unit: string | null;
  price: number;
  is_available: boolean;
  category: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export class ApiClient {
  private baseUrl: string;
  private vendorId: string | null;
  private devMode: boolean;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl =
      options.baseUrl ??
      (import.meta.env.VITE_API_URL as string | undefined) ??
      "http://localhost:3000";
    this.vendorId = options.vendorId ?? null;
    this.devMode =
      import.meta.env.VITE_DEV_MODE === "true" || import.meta.env.VITE_DEV_MODE === "1";
  }

  setVendorId(vendorId: string | null) {
    this.vendorId = vendorId;
  }

  async listActiveOrders(): Promise<VendorOrderSummary[]> {
    const data = await this.request<{ orders: VendorOrderSummary[] }>("/vendor/orders/active");
    return data.orders;
  }

  async listHistoryOrders(): Promise<VendorOrderSummary[]> {
    const data = await this.request<{ orders: VendorOrderSummary[] }>("/vendor/orders/history");
    return data.orders;
  }

  async getOrder(orderId: string): Promise<VendorOrderDetails> {
    return this.request<VendorOrderDetails>(`/vendor/orders/${orderId}`);
  }

  async acceptOrder(orderId: string): Promise<{ order_id: string; status: string }> {
    return this.request(`/vendor/orders/${orderId}/accept`, "POST");
  }

  async updateOrderStatus(
    orderId: string,
    status: "COOKING" | "READY",
  ): Promise<{ order_id: string; status: string; pickup_code: string | null }> {
    return this.request(`/vendor/orders/${orderId}/status`, "POST", { status });
  }

  async listMenu(): Promise<MenuItem[]> {
    const data = await this.request<{ items: MenuItem[] }>("/vendor/menu");
    return data.items;
  }

  async getDashboard(range = "7d"): Promise<VendorDashboard> {
    return this.request<VendorDashboard>(`/vendor/dashboard?range=${encodeURIComponent(range)}`);
  }

  async listOrders(params?: {
    status?: "active" | "history";
    from?: string;
    to?: string;
    page?: number;
  }): Promise<{ orders: VendorOrderSummary[]; page: number; limit: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.page) query.set("page", params.page.toString());
    const suffix = query.toString();
    return this.request<{ orders: VendorOrderSummary[]; page: number; limit: number }>(
      `/vendor/orders${suffix ? `?${suffix}` : ""}`,
    );
  }

  async listPromotions(): Promise<{ promotions: Array<{
    promotion_id: string;
    promo_type: string;
    value_numeric: number;
    priority: number;
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
    gift: { gift_item_id: string; gift_quantity: number; min_order_amount: number } | null;
  }> }> {
    return this.request(`/vendor/promotions`);
  }

  async createPromotion(payload: {
    promo_type: string;
    value_numeric?: number;
    priority?: number;
    is_active?: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
    items?: string[];
    combo_items?: Array<{ menu_item_id: string; quantity: number }>;
    buy_x_get_y?: {
      buy_item_id: string;
      buy_quantity: number;
      get_item_id: string;
      get_quantity: number;
      discount_percent: number;
    } | null;
    gift?: { gift_item_id: string; gift_quantity: number; min_order_amount: number } | null;
  }) {
    return this.request(`/vendor/promotions`, "POST", payload);
  }

  async updatePromotion(
    id: string,
    payload: {
      promo_type?: string;
      value_numeric?: number;
      priority?: number;
      is_active?: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
      items?: string[];
      combo_items?: Array<{ menu_item_id: string; quantity: number }>;
      buy_x_get_y?: {
        buy_item_id: string;
        buy_quantity: number;
        get_item_id: string;
        get_quantity: number;
        discount_percent: number;
      } | null;
      gift?: { gift_item_id: string; gift_quantity: number; min_order_amount: number } | null;
    },
  ) {
    return this.request(`/vendor/promotions/${id}`, "PATCH", payload);
  }

  async deletePromotion(id: string) {
    return this.request(`/vendor/promotions/${id}`, "DELETE");
  }

  async listReviews(): Promise<VendorReview[]> {
    const data = await this.request<{ reviews: VendorReview[] }>(`/vendor/reviews`);
    return data.reviews;
  }

  async getProfile(): Promise<VendorProfile> {
    return this.request<VendorProfile>(`/vendor/profile`);
  }

  async updateProfile(payload: Partial<VendorProfile>): Promise<VendorProfile> {
    return this.request<VendorProfile>(`/vendor/profile`, "PATCH", payload);
  }

  async createMenuItem(payload: {
    title: string;
    description?: string | null;
    weight_value?: number | null;
    weight_unit?: string | null;
    price: number;
    is_available?: boolean;
    category?: string | null;
    image_url?: string | null;
  }): Promise<MenuItem> {
    return this.request<MenuItem>("/vendor/menu", "POST", payload);
  }

  async updateMenuItem(
    id: string,
    payload: Partial<{
      title: string;
      description: string | null;
      weight_value: number | null;
      weight_unit: string | null;
      price: number;
      is_available: boolean;
      category: string | null;
      image_url: string | null;
    }>,
  ): Promise<MenuItem> {
    return this.request<MenuItem>(`/vendor/menu/${id}`, "PATCH", payload);
  }

  async deleteMenuItem(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/vendor/menu/${id}`, "DELETE");
  }

  private async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    if (this.devMode && !this.vendorId) {
      throw new Error("vendorId is required in DEV_MODE");
    }
    const headers: Record<string, string> = {};
    if (this.devMode) {
      headers["x-dev-user"] = "vendor";
    } else {
      headers["x-role"] = "VENDOR";
    }
    if (this.vendorId) {
      headers["x-vendor-id"] = this.vendorId;
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
