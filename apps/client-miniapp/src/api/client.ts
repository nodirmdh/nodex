import {
  AddressEntry,
  ClientProfile,
  MenuItem,
  OrderDetails,
  OrderRatingPayload,
  OrderRatingResponse,
  OrderResponse,
  OrdersResponse,
  PromoCodeEntry,
  QuoteResponse,
  TrackingResponse,
  VendorDetails,
  VendorSummary,
} from "./types";
import { getTelegramInitData, parseTelegramUserId } from "../telegram";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const DEV_MODE =
  import.meta.env.VITE_DEV_MODE === "true" || import.meta.env.VITE_DEV_MODE === "1";
const DEV_CLIENT_ID = import.meta.env.VITE_DEV_CLIENT_ID ?? "dev-client-1";
const TOKEN_KEY = "nodex_client_token";

export function getClientToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setClientToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function buildHeaders() {
  const initData = getTelegramInitData();
  const tgUserId = parseTelegramUserId(initData);
  const clientId = tgUserId ?? (DEV_MODE ? DEV_CLIENT_ID : "");
  const token = getClientToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(DEV_MODE ? { "x-dev-user": "client" } : { "x-role": "CLIENT" }),
    ...(initData ? { "x-telegram-init-data": initData } : {}),
  };
  if (clientId) {
    headers["x-client-id"] = clientId;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message : "Request failed";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function listCategories(): Promise<string[]> {
  const data = await request<{ categories: string[] }>("/client/categories");
  return data.categories;
}

export async function registerClient(payload: {
  full_name: string;
  birth_date: string;
  phone: string;
  password: string;
}): Promise<{ token: string; client_id: string; full_name: string | null; phone: string | null }> {
  const data = await request<{
    token: string;
    client_id: string;
    full_name: string | null;
    phone: string | null;
  }>("/client/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setClientToken(data.token);
  return data;
}

export async function loginClient(payload: {
  phone: string;
  password: string;
}): Promise<{ token: string; client_id: string; full_name: string | null; phone: string | null }> {
  const data = await request<{
    token: string;
    client_id: string;
    full_name: string | null;
    phone: string | null;
  }>("/client/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setClientToken(data.token);
  return data;
}

export async function telegramLogin(): Promise<{ token: string; client_id: string }> {
  const data = await request<{ token: string; client_id: string }>("/client/auth/telegram", {
    method: "POST",
  });
  setClientToken(data.token);
  return data;
}

export async function listVendors(): Promise<VendorSummary[]> {
  const data = await request<{ vendors: VendorSummary[] }>("/client/vendors");
  return data.vendors;
}

export async function getVendor(vendorId: string): Promise<VendorDetails> {
  return request<VendorDetails>(`/client/vendors/${vendorId}`);
}

export async function createQuote(payload: {
  vendor_id: string;
  fulfillment_type: string;
  delivery_location?: { lat: number; lng: number } | null;
  delivery_comment?: string | null;
  vendor_comment?: string | null;
  utensils_count?: number | null;
  receiver_phone?: string | null;
  payment_method?: string | null;
  change_for_amount?: number | null;
  address_text?: string | null;
  address_street?: string | null;
  address_house?: string | null;
  address_entrance?: string | null;
  address_apartment?: string | null;
  promo_code?: string | null;
  items: Array<{ menu_item_id: string; quantity: number }>;
}): Promise<QuoteResponse> {
  return request<QuoteResponse>("/client/cart/quote", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOrder(payload: {
  vendor_id: string;
  fulfillment_type: string;
  delivery_location?: { lat: number; lng: number } | null;
  delivery_comment?: string | null;
  vendor_comment?: string | null;
  utensils_count?: number | null;
  receiver_phone?: string | null;
  payment_method?: string | null;
  change_for_amount?: number | null;
  address_text?: string | null;
  address_street?: string | null;
  address_house?: string | null;
  address_entrance?: string | null;
  address_apartment?: string | null;
  promo_code?: string | null;
  items: Array<{ menu_item_id: string; quantity: number }>;
}): Promise<OrderResponse> {
  return request<OrderResponse>("/client/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrder(orderId: string): Promise<OrderDetails> {
  return request<OrderDetails>(`/client/orders/${orderId}`);
}

export async function listOrders(params?: {
  status?: string;
  limit?: number;
  cursor?: string;
}): Promise<OrdersResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.cursor) query.set("cursor", params.cursor);
  const suffix = query.toString();
  return request<OrdersResponse>(`/client/orders${suffix ? `?${suffix}` : ""}`);
}

export async function getTracking(orderId: string): Promise<TrackingResponse> {
  return request<TrackingResponse>(`/client/orders/${orderId}/tracking`);
}

export async function getOrderRating(orderId: string): Promise<OrderRatingResponse> {
  return request<OrderRatingResponse>(`/client/orders/${orderId}/rating`);
}

export async function submitOrderRating(
  orderId: string,
  payload: OrderRatingPayload,
): Promise<OrderRatingResponse> {
  return request<OrderRatingResponse>(`/client/orders/${orderId}/rating`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listPromoCodes(): Promise<PromoCodeEntry[]> {
  const data = await request<{ promo_codes: PromoCodeEntry[] }>("/client/profile/promo-codes");
  return data.promo_codes;
}

export async function addPromoCode(code: string): Promise<PromoCodeEntry> {
  return request<PromoCodeEntry>("/client/profile/promo-codes", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function removePromoCode(id: string): Promise<void> {
  await request<{ deleted: boolean }>(`/client/profile/promo-codes/${id}`, {
    method: "DELETE",
  });
}

export async function getProfile(): Promise<ClientProfile> {
  return request<ClientProfile>("/client/profile");
}

export async function updateProfile(payload: {
  full_name?: string | null;
  phone?: string | null;
  telegram_username?: string | null;
  about?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  avatar_file_id?: string | null;
}): Promise<ClientProfile> {
  return request<ClientProfile>("/client/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listAddresses(): Promise<AddressEntry[]> {
  const data = await request<{ addresses: AddressEntry[] }>("/client/profile/addresses");
  return data.addresses;
}

export async function addAddress(payload: {
  type: "HOME" | "WORK" | "OTHER";
  address_text: string;
  lat: number;
  lng: number;
  entrance?: string | null;
  apartment?: string | null;
}): Promise<AddressEntry> {
  return request<AddressEntry>("/client/profile/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAddress(
  id: string,
  payload: Partial<{
    type: "HOME" | "WORK" | "OTHER";
    address_text: string;
    lat: number;
    lng: number;
    entrance: string | null;
    apartment: string | null;
  }>,
): Promise<AddressEntry> {
  return request<AddressEntry>(`/client/profile/addresses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeAddress(id: string): Promise<void> {
  await request<{ deleted: boolean }>(`/client/profile/addresses/${id}`, {
    method: "DELETE",
  });
}

export function buildMenuItemLabel(item: MenuItem) {
  return item.title || `Item ${item.menu_item_id.slice(0, 6)}`;
}
