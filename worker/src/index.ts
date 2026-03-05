import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { SignJWT, jwtVerify } from "jose";
import { verifyTelegramInitData } from "./telegram/verifyInitData";
import { VerifyInitDataError } from "./telegram/types";

type Role = "client" | "vendor" | "admin";

type EnvBindings = {
  DB: D1Database;
  JWT_SECRET: string;
  CLIENT_BOT_TOKEN: string;
  VENDOR_BOT_TOKEN: string;
  ADMIN_TG_IDS?: string;
  JWT_TTL_SECONDS?: string;
  TELEGRAM_MAX_AUTH_AGE_SECONDS?: string;
};

type SessionClaims = {
  sub: string;
  role: Role;
  tgId: string;
};

type TelegramAuthBody = {
  initData?: string;
  app?: "client" | "vendor";
};

type OrderCreateBody = {
  restaurantId?: string;
  address?: string;
  phone?: string;
  comment?: string;
  items?: Array<{ menuItemId?: string; qty?: number }>;
};

type StatusUpdateBody = {
  status?: string;
};

const app = new Hono<{ Bindings: EnvBindings }>();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
}));

app.get("/", (c) =>
  c.json({
    ok: true,
    service: "nodex-worker",
    version: "v1",
    health: "/health",
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.post("/auth/telegram", async (c) => {
  const body = (await c.req.json().catch(() => null)) as TelegramAuthBody | null;
  if (!body?.initData || !body.app) {
    throw new HTTPException(400, { message: "initData and app are required" });
  }

  const botToken = body.app === "client" ? c.env.CLIENT_BOT_TOKEN : c.env.VENDOR_BOT_TOKEN;
  const maxAgeSec = Number(c.env.TELEGRAM_MAX_AUTH_AGE_SECONDS ?? "86400");
  let tgUser;
  try {
    tgUser = await verifyTelegramInitData(body.initData, botToken, maxAgeSec);
  } catch (error) {
    if (error instanceof VerifyInitDataError) {
      throw new HTTPException(401, { message: error.message });
    }
    throw error;
  }
  const tgId = String(tgUser.id);
  const adminTgIds = parseAdminTgIds(c.env.ADMIN_TG_IDS);
  const isAdmin = adminTgIds.has(tgId);
  const resolvedRole: Role = isAdmin ? "admin" : body.app;

  let user = await c.env.DB.prepare(
    "SELECT id, tg_id, role, name, phone FROM users WHERE tg_id = ?1 LIMIT 1",
  )
    .bind(tgId)
    .first<{ id: string; tg_id: string; role: Role; name: string | null; phone: string | null }>();

  if (!user) {
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO users (id, tg_id, role, name, phone, created_at) VALUES (?1, ?2, ?3, ?4, NULL, ?5)",
    )
      .bind(id, tgId, resolvedRole, tgUser.name ?? null, new Date().toISOString())
      .run();

    user = {
      id,
      tg_id: tgId,
      role: resolvedRole,
      name: tgUser.name ?? null,
      phone: null,
    };
  } else if (user.role !== resolvedRole) {
    await c.env.DB.prepare("UPDATE users SET role = ?1 WHERE id = ?2")
      .bind(resolvedRole, user.id)
      .run();
    user = { ...user, role: resolvedRole };
  }

  const token = await signSessionJwt(c.env.JWT_SECRET, {
    sub: user.id,
    role: user.role,
    tgId: user.tg_id,
  }, Number(c.env.JWT_TTL_SECONDS ?? "604800"));

  return c.json({
    token,
    user: {
      id: user.id,
      tgId: user.tg_id,
      role: user.role,
      name: user.name,
      phone: user.phone,
    },
  });
});

app.get("/restaurants", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id, name, is_open, delivery_fee, min_order, eta_text FROM restaurants ORDER BY name ASC",
  ).all<{
    id: string;
    name: string;
    is_open: number;
    delivery_fee: number;
    min_order: number;
    eta_text: string | null;
  }>();

  return c.json({
    restaurants: (rows.results ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      isOpen: Boolean(r.is_open),
      deliveryFee: r.delivery_fee,
      minOrder: r.min_order,
      etaText: r.eta_text,
    })),
  });
});

app.get("/restaurants/:id/menu", async (c) => {
  const id = c.req.param("id");
  const rows = await c.env.DB.prepare(
    "SELECT id, restaurant_id, title, price, is_available, category FROM menu_items WHERE restaurant_id = ?1 ORDER BY id DESC",
  )
    .bind(id)
    .all<{
      id: string;
      restaurant_id: string;
      title: string;
      price: number;
      is_available: number;
      category: string | null;
    }>();

  return c.json({
    items: (rows.results ?? []).map((item) => ({
      id: item.id,
      restaurantId: item.restaurant_id,
      title: item.title,
      price: item.price,
      isAvailable: Boolean(item.is_available),
      category: item.category,
    })),
  });
});

app.post("/orders", async (c) => {
  const session = await requireAuth(c, ["client"]);
  const body = (await c.req.json().catch(() => null)) as OrderCreateBody | null;

  if (!body?.restaurantId || !body.address || !body.phone || !Array.isArray(body.items) || body.items.length === 0) {
    throw new HTTPException(400, { message: "restaurantId, address, phone, items are required" });
  }

  const restaurant = await c.env.DB.prepare(
    "SELECT id, is_open, delivery_fee, min_order FROM restaurants WHERE id = ?1 LIMIT 1",
  )
    .bind(body.restaurantId)
    .first<{ id: string; is_open: number; delivery_fee: number; min_order: number }>();

  if (!restaurant) {
    throw new HTTPException(404, { message: "restaurant not found" });
  }
  if (!restaurant.is_open) {
    throw new HTTPException(400, { message: "restaurant is closed" });
  }

  const itemIds = body.items.map((i) => i.menuItemId).filter((v): v is string => Boolean(v));
  if (itemIds.length !== body.items.length) {
    throw new HTTPException(400, { message: "every item requires menuItemId" });
  }

  const placeholders = itemIds.map((_, i) => `?${i + 1}`).join(", ");
  const stmt = c.env.DB.prepare(
    `SELECT id, title, price, is_available, restaurant_id FROM menu_items WHERE id IN (${placeholders})`,
  ).bind(...itemIds);

  const menuRows = await stmt.all<{
    id: string;
    title: string;
    price: number;
    is_available: number;
    restaurant_id: string;
  }>();

  const menuById = new Map((menuRows.results ?? []).map((m) => [m.id, m]));

  let subtotal = 0;
  const preparedItems: Array<{
    id: string;
    orderId: string;
    menuItemId: string;
    titleSnapshot: string;
    priceSnapshot: number;
    qty: number;
  }> = [];

  const orderId = crypto.randomUUID();
  for (const line of body.items) {
    const qty = Number(line.qty ?? 0);
    if (!line.menuItemId || !Number.isInteger(qty) || qty <= 0) {
      throw new HTTPException(400, { message: "qty must be a positive integer" });
    }
    const menu = menuById.get(line.menuItemId);
    if (!menu || menu.restaurant_id !== body.restaurantId) {
      throw new HTTPException(400, { message: "menu item does not belong to restaurant" });
    }
    if (!menu.is_available) {
      throw new HTTPException(400, { message: `menu item unavailable: ${menu.id}` });
    }

    subtotal += menu.price * qty;
    preparedItems.push({
      id: crypto.randomUUID(),
      orderId,
      menuItemId: menu.id,
      titleSnapshot: menu.title,
      priceSnapshot: menu.price,
      qty,
    });
  }

  if (subtotal < restaurant.min_order) {
    throw new HTTPException(400, { message: "minimum order amount not reached" });
  }

  const discount = 0;
  const deliveryFee = restaurant.delivery_fee;
  const total = subtotal + deliveryFee - discount;

  const nowIso = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      "INSERT INTO orders (id, client_user_id, restaurant_id, status, address, phone, comment, subtotal, delivery_fee, discount, total, created_at) VALUES (?1, ?2, ?3, 'NEW', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
    ).bind(
      orderId,
      session.sub,
      body.restaurantId,
      body.address,
      body.phone,
      body.comment ?? null,
      subtotal,
      deliveryFee,
      discount,
      total,
      nowIso,
    ),
  ];

  for (const line of preparedItems) {
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO order_items (id, order_id, menu_item_id, title_snapshot, price_snapshot, qty) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      ).bind(line.id, line.orderId, line.menuItemId, line.titleSnapshot, line.priceSnapshot, line.qty),
    );
  }

  await c.env.DB.batch(statements);

  return c.json({
    id: orderId,
    status: "NEW",
    subtotal,
    deliveryFee,
    discount,
    total,
    createdAt: nowIso,
  });
});

app.get("/orders/me", async (c) => {
  const session = await requireAuth(c, ["client"]);
  const rows = await c.env.DB.prepare(
    "SELECT id, restaurant_id, status, address, phone, comment, subtotal, delivery_fee, discount, total, created_at FROM orders WHERE client_user_id = ?1 ORDER BY created_at DESC",
  )
    .bind(session.sub)
    .all<{
      id: string;
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
    }>();

  return c.json({
    orders: rows.results ?? [],
  });
});

app.get("/vendor/orders/active", async (c) => {
  const session = await requireAuth(c, ["vendor"]);
  const rows = await c.env.DB.prepare(
    `SELECT o.id, o.restaurant_id, r.name AS restaurant_name, o.status, o.address, o.phone, o.comment, o.subtotal, o.delivery_fee, o.discount, o.total, o.created_at
     FROM orders o
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     WHERE r.vendor_user_id = ?1 AND o.status IN ('NEW', 'ACCEPTED', 'PREPARING', 'READY')
     ORDER BY o.created_at DESC`,
  )
    .bind(session.sub)
    .all();

  return c.json({ orders: rows.results ?? [] });
});

app.post("/vendor/orders/:id/status", async (c) => {
  const session = await requireAuth(c, ["vendor"]);
  const orderId = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as StatusUpdateBody | null;
  const status = (body?.status ?? "").trim().toUpperCase();
  const allowed = new Set(["ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]);

  if (!allowed.has(status)) {
    throw new HTTPException(400, { message: "invalid status" });
  }

  const owned = await c.env.DB.prepare(
    `SELECT o.id
     FROM orders o
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.id = ?1 AND r.vendor_user_id = ?2
     LIMIT 1`,
  )
    .bind(orderId, session.sub)
    .first();

  if (!owned) {
    throw new HTTPException(404, { message: "order not found" });
  }

  await c.env.DB.prepare("UPDATE orders SET status = ?1 WHERE id = ?2").bind(status, orderId).run();

  return c.json({ id: orderId, status });
});

app.post("/admin/restaurants", async (c) => {
  await requireAuth(c, ["admin"]);
  const body = (await c.req.json().catch(() => null)) as Partial<{
    vendorUserId: string;
    name: string;
    isOpen: boolean;
    deliveryFee: number;
    minOrder: number;
    etaText: string | null;
  }> | null;

  if (!body?.vendorUserId || !body.name) {
    throw new HTTPException(400, { message: "vendorUserId and name are required" });
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO restaurants (id, vendor_user_id, name, is_open, delivery_fee, min_order, eta_text) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
  )
    .bind(
      id,
      body.vendorUserId,
      body.name,
      body.isOpen ? 1 : 0,
      Number(body.deliveryFee ?? 0),
      Number(body.minOrder ?? 0),
      body.etaText ?? null,
    )
    .run();

  return c.json({ id });
});

app.put("/admin/restaurants/:id", async (c) => {
  await requireAuth(c, ["admin"]);
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Partial<{
    vendorUserId: string;
    name: string;
    isOpen: boolean;
    deliveryFee: number;
    minOrder: number;
    etaText: string | null;
  }> | null;

  await c.env.DB.prepare(
    "UPDATE restaurants SET vendor_user_id = COALESCE(?1, vendor_user_id), name = COALESCE(?2, name), is_open = COALESCE(?3, is_open), delivery_fee = COALESCE(?4, delivery_fee), min_order = COALESCE(?5, min_order), eta_text = ?6 WHERE id = ?7",
  )
    .bind(
      body?.vendorUserId ?? null,
      body?.name ?? null,
      body?.isOpen === undefined ? null : body.isOpen ? 1 : 0,
      body?.deliveryFee ?? null,
      body?.minOrder ?? null,
      body?.etaText ?? null,
      id,
    )
    .run();

  return c.json({ id });
});

app.post("/admin/menu-items", async (c) => {
  await requireAuth(c, ["admin"]);
  const body = (await c.req.json().catch(() => null)) as Partial<{
    restaurantId: string;
    title: string;
    price: number;
    isAvailable: boolean;
    category: string | null;
  }> | null;

  if (!body?.restaurantId || !body.title || body.price === undefined) {
    throw new HTTPException(400, { message: "restaurantId, title, price are required" });
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO menu_items (id, restaurant_id, title, price, is_available, category) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  )
    .bind(id, body.restaurantId, body.title, Number(body.price), body.isAvailable === false ? 0 : 1, body.category ?? null)
    .run();

  return c.json({ id });
});

app.put("/admin/menu-items/:id", async (c) => {
  await requireAuth(c, ["admin"]);
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Partial<{
    restaurantId: string;
    title: string;
    price: number;
    isAvailable: boolean;
    category: string | null;
  }> | null;

  await c.env.DB.prepare(
    "UPDATE menu_items SET restaurant_id = COALESCE(?1, restaurant_id), title = COALESCE(?2, title), price = COALESCE(?3, price), is_available = COALESCE(?4, is_available), category = ?5 WHERE id = ?6",
  )
    .bind(
      body?.restaurantId ?? null,
      body?.title ?? null,
      body?.price ?? null,
      body?.isAvailable === undefined ? null : body.isAvailable ? 1 : 0,
      body?.category ?? null,
      id,
    )
    .run();

  return c.json({ id });
});

app.get("/admin/orders", async (c) => {
  await requireAuth(c, ["admin"]);
  const rows = await c.env.DB.prepare(
    `SELECT o.id, o.client_user_id, o.restaurant_id, r.name AS restaurant_name, o.status, o.address, o.phone, o.comment, o.subtotal, o.delivery_fee, o.discount, o.total, o.created_at
     FROM orders o
     INNER JOIN restaurants r ON r.id = o.restaurant_id
     ORDER BY o.created_at DESC`,
  ).all();

  return c.json({ orders: rows.results ?? [] });
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});

async function requireAuth(c: Context<{ Bindings: EnvBindings }>, roles: Role[]) {
  const auth = c.req.header("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "missing bearer token" });
  }

  const token = auth.slice("Bearer ".length).trim();
  let payload: SessionClaims;
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(c.env.JWT_SECRET), {
      algorithms: ["HS256"],
    });
    payload = verified.payload as unknown as SessionClaims;
  } catch {
    throw new HTTPException(401, { message: "invalid token" });
  }

  if (!roles.includes(payload.role)) {
    throw new HTTPException(403, { message: "forbidden" });
  }

  return payload;
}

async function signSessionJwt(secret: string, claims: SessionClaims, ttlSeconds: number) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(new TextEncoder().encode(secret));
}

function parseAdminTgIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

export default app;
