import type { TelegramAuthResponse } from "@nodex/domain";

const API_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8787";

let sessionToken: string | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

function headers() {
  return {
    "Content-Type": "application/json",
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers(),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export type VendorRestaurant = {
  id: string;
  vendor_user_id?: string;
  name: string;
  is_open: number | boolean;
  delivery_fee: number;
  min_order: number;
  eta_text: string | null;
};

export type VendorMenuItem = {
  id: string;
  restaurant_id?: string;
  restaurantId?: string;
  title: string;
  price: number;
  is_available?: number;
  isAvailable?: boolean;
  category: string | null;
};

export type VendorOrder = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  status: string;
  address: string;
  phone: string;
  comment: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  created_at: string;
};

export async function telegramAuth(initData: string) {
  const data = await request<TelegramAuthResponse>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData, app: "vendor" }),
  });
  setSessionToken(data.token);
  return data;
}

export async function getRestaurant() {
  return request<{ restaurant: VendorRestaurant }>("/vendor/restaurant");
}

export async function listMenu() {
  return request<{ items: VendorMenuItem[] }>("/vendor/menu");
}

export async function createMenuItem(payload: {
  title: string;
  price: number;
  isAvailable: boolean;
  category: string | null;
}) {
  return request<{ id: string }>("/vendor/menu", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMenuItem(
  itemId: string,
  payload: Partial<{
    title: string;
    price: number;
    isAvailable: boolean;
    category: string | null;
  }>,
) {
  return request<{ id: string }>(`/vendor/menu/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function listOrders() {
  return request<{ orders: VendorOrder[] }>("/vendor/orders");
}

export async function listActiveOrders() {
  return request<{ orders: VendorOrder[] }>("/vendor/orders/active");
}

export async function updateOrderStatus(orderId: string, status: string) {
  return request<{ id: string; status: string }>(`/vendor/orders/${orderId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function getDashboard() {
  return request<{
    revenue: number;
    completed_count: number;
    average_check: number;
  }>("/vendor/dashboard");
}

export async function listPromotions() {
  return request<{ promotions: Array<Record<string, unknown>>; message?: string }>("/vendor/promotions");
}

export async function listReviews() {
  return request<{ reviews: Array<Record<string, unknown>>; message?: string }>("/vendor/reviews");
}
