-- 0001_init.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tg_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('client', 'vendor', 'admin')),
  name TEXT,
  phone TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  vendor_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1,
  vendor_delivery INTEGER NOT NULL DEFAULT 1,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  min_order INTEGER NOT NULL DEFAULT 0,
  eta_text TEXT,
  FOREIGN KEY(vendor_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 1,
  category TEXT,
  FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  client_user_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  comment TEXT,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(client_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  menu_item_id TEXT NOT NULL,
  title_snapshot TEXT NOT NULL,
  price_snapshot INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_tg_id ON users(tg_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_restaurants_vendor_user_id ON restaurants(vendor_user_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_user_id ON orders(client_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
