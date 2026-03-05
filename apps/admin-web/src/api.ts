import type { CreateMenuItemRequest, CreateRestaurantRequest } from "@nodex/domain";

const API_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8787";
const TOKEN_KEY = "nodex_admin_jwt";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function loginAdmin(username: string, password: string) {
  const response = await fetch(`${API_URL}/auth/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Admin login failed");
  }
  const data = (await response.json()) as { token: string };
  setAdminToken(data.token);
  return data;
}

function headers() {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function createRestaurant(payload: CreateRestaurantRequest) {
  return request<{ id: string }>("/admin/restaurants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRestaurant(id: string, payload: Partial<CreateRestaurantRequest>) {
  return request<{ id: string }>(`/admin/restaurants/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type RestaurantDto = {
  id: string;
  name: string;
  isOpen: boolean;
  deliveryFee: number;
  minOrder: number;
  etaText: string | null;
};

export async function listRestaurants() {
  return request<{ restaurants: RestaurantDto[] }>("/restaurants");
}

export async function createMenuItem(payload: CreateMenuItemRequest) {
  return request<{ id: string }>("/admin/menu-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMenuItem(id: string, payload: Partial<CreateMenuItemRequest>) {
  return request<{ id: string }>(`/admin/menu-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type MenuItemDto = {
  id: string;
  restaurantId: string;
  title: string;
  price: number;
  isAvailable: boolean;
  category: string | null;
};

export async function listMenuItems(restaurantId: string) {
  return request<{ items: MenuItemDto[] }>(`/restaurants/${restaurantId}/menu`);
}

export async function listAdminOrders() {
  return request<{ orders: OrderDto[] }>("/admin/orders");
}

export type OrderDto = {
  id: string;
  client_user_id: string;
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
