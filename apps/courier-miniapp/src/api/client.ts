import type {
  AvailableOrder,
  CourierBalance,
  CourierHistoryOrder,
  CourierOrderDetails,
  CourierProfile,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "nodex_courier_token";

export function getCourierToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setCourierToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function buildHeaders() {
  const token = getCourierToken();

  const headers: Record<string, string> = {
    "x-role": "COURIER",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const mergedHeaders = {
    ...buildHeaders(),
    ...(options?.headers ?? {}),
  } as Record<string, string>;
  if (options?.body !== undefined) {
    mergedHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message : "Request failed";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function listAvailableOrders(): Promise<AvailableOrder[]> {
  const data = await request<{ orders: AvailableOrder[] }>("/courier/orders/available");
  return data.orders;
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const headers = buildHeaders();
  const response = await fetch(`${API_URL}/files/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message : "Upload failed";
    throw new Error(message);
  }
  return response.json() as Promise<{ file_id: string; public_url: string }>;
}

export async function loginCourier(payload: { login?: string; phone?: string; password: string }) {
  const response = await fetch(`${API_URL}/courier/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message : "Request failed";
    throw new Error(message);
  }

  const data = (await response.json()) as {
    token: string;
    courier_id: string;
    full_name: string | null;
    phone: string | null;
  };
  setCourierToken(data.token);
  return data;
}

export async function acceptOrder(orderId: string) {
  return request<{ order_id: string; status: string }>(`/courier/orders/${orderId}/accept`, {
    method: "POST",
  });
}

export async function getCourierOrder(orderId: string): Promise<CourierOrderDetails> {
  return request<CourierOrderDetails>(`/courier/orders/${orderId}`);
}

export async function submitPickup(orderId: string, code: string) {
  return request<{ order_id: string; status: string }>(`/courier/orders/${orderId}/pickup`, {
    method: "POST",
    body: JSON.stringify({ pickup_code: code }),
  });
}

export async function submitHandoff(orderId: string, code: string) {
  return request<{ order_id: string; status: string }>(`/courier/orders/${orderId}/handoff`, {
    method: "POST",
    body: JSON.stringify({ handoff_code: code }),
  });
}

export async function confirmPickup(orderId: string) {
  return request<{ order_id: string; status: string }>(`/courier/orders/${orderId}/pickup`, {
    method: "POST",
  });
}

export async function submitDelivery(orderId: string, code: string) {
  return request<{ order_id: string; status: string }>(`/courier/orders/${orderId}/deliver`, {
    method: "POST",
    body: JSON.stringify({ delivery_code: code }),
  });
}

export async function sendLocation(orderId: string, lat: number, lng: number) {
  return request<{ order_id: string; status: string }>(`/courier/orders/${orderId}/location`, {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  });
}

export async function getCourierProfile(): Promise<CourierProfile> {
  return request<CourierProfile>("/courier/profile");
}

export async function updateCourierProfile(payload: Partial<CourierProfile>) {
  return request<CourierProfile>("/courier/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listCourierHistory(params?: {
  from?: string;
  to?: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.page) query.set("page", params.page.toString());
  const suffix = query.toString();
  const data = await request<{ orders: CourierHistoryOrder[]; page: number; limit: number }>(
    `/courier/orders/history${suffix ? `?${suffix}` : ""}`,
  );
  return data;
}

export async function getCourierBalance(params?: {
  range?: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
}) {
  const query = new URLSearchParams();
  if (params?.range) query.set("range", params.range);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const suffix = query.toString();
  return request<CourierBalance>(`/courier/balance${suffix ? `?${suffix}` : ""}`);
}

export async function listCourierRatings() {
  const data = await request<{ ratings: CourierProfile["ratings"] }>("/courier/ratings");
  return data.ratings;
}
