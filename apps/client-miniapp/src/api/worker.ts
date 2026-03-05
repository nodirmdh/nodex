import type {
  CreateOrderRequest,
  MenuItem,
  OrderSummary,
  Restaurant,
  TelegramAuthResponse,
} from "@nodex/domain";

const API_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8787";

let sessionToken: string | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? "Request failed";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function telegramAuth(initData: string) {
  const data = await request<TelegramAuthResponse>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData, app: "client" }),
  });
  setSessionToken(data.token);
  return data;
}

export async function listRestaurants() {
  return request<{ restaurants: Restaurant[] }>("/restaurants");
}

export async function listMenu(restaurantId: string) {
  return request<{ items: MenuItem[] }>(`/restaurants/${restaurantId}/menu`);
}

export async function createOrder(payload: CreateOrderRequest) {
  return request<{ id: string; status: string; total: number }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listMyOrders() {
  return request<{ orders: OrderSummary[] }>("/orders/me");
}
