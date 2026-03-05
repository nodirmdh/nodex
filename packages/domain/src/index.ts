export type Role = "client" | "vendor" | "admin";

export type SessionUser = {
  id: string;
  tgId: string;
  role: Role;
  name: string | null;
  phone: string | null;
};

export type TelegramAuthApp = "client" | "vendor";

export type TelegramAuthRequest = {
  initData: string;
  app: TelegramAuthApp;
};

export type TelegramAuthResponse = {
  token: string;
  user: SessionUser;
};

export type Restaurant = {
  id: string;
  name: string;
  isOpen: boolean;
  deliveryFee: number;
  minOrder: number;
  etaText: string | null;
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  title: string;
  price: number;
  isAvailable: boolean;
  category: string | null;
};

export type CartLine = {
  menuItemId: string;
  qty: number;
};

export type CreateOrderRequest = {
  restaurantId: string;
  address: string;
  phone: string;
  comment?: string;
  items: CartLine[];
};

export type OrderSummary = {
  id: string;
  client_user_id: string;
  restaurant_id: string;
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

export type CreateRestaurantRequest = {
  vendorUserId: string;
  name: string;
  isOpen?: boolean;
  deliveryFee?: number;
  minOrder?: number;
  etaText?: string | null;
};

export type CreateMenuItemRequest = {
  restaurantId: string;
  title: string;
  price: number;
  isAvailable?: boolean;
  category?: string | null;
};
