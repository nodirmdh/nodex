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

export async function telegramAuth(initData: string) {
  const data = await request<TelegramAuthResponse>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData, app: "vendor" }),
  });
  setSessionToken(data.token);
  return data;
}

export async function listActiveOrders() {
  return request<{ orders: Array<Record<string, unknown>> }>("/vendor/orders/active");
}

export async function updateOrderStatus(orderId: string, status: string) {
  return request<{ id: string; status: string }>(`/vendor/orders/${orderId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}
