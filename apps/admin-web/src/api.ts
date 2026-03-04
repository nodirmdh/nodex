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

export async function listAdminOrders() {
  return request<{ orders: Array<Record<string, unknown>> }>("/admin/orders");
}
