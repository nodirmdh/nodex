type ApiClientOptions = {
  baseUrl?: string;
};

export type Vendor = {
  vendor_id: string;
  category: string;
  supports_pickup: boolean;
  address_text: string | null;
  geo: { lat: number; lng: number };
  created_at: string;
};

export type OrderSummary = {
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

export type OrderDetails = {
  order_id: string;
  status: string;
  vendor_id: string;
  client_id: string | null;
  courier_id: string | null;
  fulfillment_type: string;
  delivery_location: { lat: number; lng: number } | null;
  delivery_comment: string | null;
  vendor_comment: string | null;
  items: Array<{
    menu_item_id: string;
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
};

export type PromotionSummary = {
  promotion_id: string;
  vendor_id: string;
  promo_type: string;
  value_numeric: number;
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
    category: string;
    supports_pickup: boolean;
    address_text?: string;
    geo: { lat: number; lng: number };
  }): Promise<Vendor> {
    return this.request<Vendor>("/admin/vendors", "POST", payload);
  }

  async listOrders(filters: {
    status?: string;
    vendor_id?: string;
    fulfillment_type?: string;
  }): Promise<OrderSummary[]> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.vendor_id) params.set("vendor_id", filters.vendor_id);
    if (filters.fulfillment_type) params.set("fulfillment_type", filters.fulfillment_type);
    const query = params.toString();
    const data = await this.request<{ orders: OrderSummary[] }>(
      `/admin/orders${query ? `?${query}` : ""}`,
    );
    return data.orders;
  }

  async getOrder(orderId: string): Promise<OrderDetails> {
    return this.request<OrderDetails>(`/admin/orders/${orderId}`);
  }

  async listPromotions(vendorId?: string): Promise<PromotionSummary[]> {
    const query = vendorId ? `?vendor_id=${encodeURIComponent(vendorId)}` : "";
    const data = await this.request<{ promotions: PromotionSummary[] }>(
      `/admin/promotions${query}`,
    );
    return data.promotions;
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
