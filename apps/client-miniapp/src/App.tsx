import { useEffect, useMemo, useState } from "react";
import type { MenuItem, Restaurant } from "@nodex/domain";
import { createOrder, listMenu, listMyOrders, listRestaurants, telegramAuth } from "./api";

type Cart = Record<string, number>;

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: { id?: number | string } };
  ready?: () => void;
};

function readTelegramWebApp() {
  const tg = (window as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  tg?.ready?.();
  return tg ?? null;
}

export function App() {
  const DEV_MODE =
    import.meta.env.DEV ||
    import.meta.env.VITE_DEV_MODE === "1" ||
    import.meta.env.VITE_DEV_MODE === "true";
  const [authState, setAuthState] = useState<"loading" | "ready" | "blocked">("loading");
  const [manualInitData, setManualInitData] = useState("");
  const [tgUserId, setTgUserId] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [ordersJson, setOrdersJson] = useState("[]");
  const [error, setError] = useState<string | null>(null);

  const loadRestaurants = async () => {
    const data = await listRestaurants();
    setRestaurants(data.restaurants);
  };

  const loadMenu = async (restaurant: Restaurant) => {
    const data = await listMenu(restaurant.id);
    setSelectedRestaurant(restaurant);
    setMenu(data.items.filter((item) => item.isAvailable));
  };

  const cartLines = useMemo(
    () =>
      menu
        .filter((item) => cart[item.id])
        .map((item) => ({ item, qty: cart[item.id] })),
    [menu, cart],
  );

  const subtotal = cartLines.reduce((sum, line) => sum + line.item.price * line.qty, 0);
  const deliveryFee = selectedRestaurant?.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;

  const addToCart = (itemId: string) => {
    if (!selectedRestaurant) {
      return;
    }

    if (cartRestaurantId && cartRestaurantId !== selectedRestaurant.id) {
      setError("Cart can contain only one restaurant. Cart was reset.");
      setCart({});
    }

    setCartRestaurantId(selectedRestaurant.id);
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
  };

  const authAndLoad = async (initData: string) => {
    setAuthState("loading");
    setError(null);
    try {
      if (!initData.trim()) {
        throw new Error("Telegram initData is required");
      }
      await telegramAuth(initData);
      await loadRestaurants();
      setAuthState("ready");
    } catch (err) {
      setAuthState("blocked");
      setError(err instanceof Error ? err.message : "Auth failed");
    }
  };

  useEffect(() => {
    const tg = readTelegramWebApp();
    if (!tg) {
      setAuthState("blocked");
      setError("Open this app via Telegram bot menu button.");
      return;
    }

    const initData = tg.initData?.trim() ?? "";
    const unsafeUserId = tg.initDataUnsafe?.user?.id;
    if (unsafeUserId !== undefined && unsafeUserId !== null) {
      setTgUserId(String(unsafeUserId));
    }

    if (!initData) {
      setAuthState("blocked");
      setError("Open this app via Telegram bot menu button.");
      return;
    }

    void authAndLoad(initData);
  }, []);

  const submitOrder = async () => {
    setError(null);
    try {
      if (!selectedRestaurant) {
        throw new Error("Select restaurant");
      }
      if (!address.trim() || !phone.trim()) {
        throw new Error("address and phone are required");
      }
      if (cartLines.length === 0) {
        throw new Error("Cart is empty");
      }
      const created = await createOrder({
        restaurantId: selectedRestaurant.id,
        address,
        phone,
        comment,
        items: cartLines.map((line) => ({ menuItemId: line.item.id, qty: line.qty })),
      });
      setError(`Order created: ${created.id}`);
      setCart({});
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    }
  };

  const loadOrders = async () => {
    setError(null);
    try {
      const data = await listMyOrders();
      setOrdersJson(JSON.stringify(data.orders, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    }
  };

  if (authState === "loading") {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Nodex Client Mini App</h1>
          <p>Authenticating via Telegram...</p>
        </section>
      </main>
    );
  }

  if (authState === "blocked") {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Nodex Client Mini App</h1>
          <p>Open this app via Telegram bot menu button.</p>
          {tgUserId && <p>Detected Telegram user: {tgUserId}</p>}
          {error && <p className="error">{error}</p>}
        </section>
        {DEV_MODE && (
          <section className="panel">
            <h2>DEV fallback</h2>
            <p>Use manual initData only for local development.</p>
            <textarea
              value={manualInitData}
              onChange={(event) => setManualInitData(event.target.value)}
              rows={6}
              placeholder="Paste initData"
            />
            <button onClick={() => void authAndLoad(manualInitData.trim())}>Auth with initData</button>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="shell">
      <h1>Nodex Client Mini App</h1>
      <section className="panel">
        <h2>Restaurants</h2>
        <div className="list">
          {restaurants.map((restaurant) => (
            <button key={restaurant.id} onClick={() => void loadMenu(restaurant)}>
              {restaurant.name} | fee: {restaurant.deliveryFee} | min: {restaurant.minOrder}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Menu {selectedRestaurant ? `(${selectedRestaurant.name})` : ""}</h2>
        <div className="list">
          {menu.map((item) => (
            <button key={item.id} onClick={() => addToCart(item.id)}>
              + {item.title} ({item.price})
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Cart (single restaurant rule)</h2>
        <pre>{JSON.stringify(cartLines, null, 2)}</pre>
        <p>Subtotal: {subtotal}</p>
        <p>Delivery fee: {deliveryFee}</p>
        <p>Total: {total}</p>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment" />
        <button onClick={() => void submitOrder()}>Create order</button>
      </section>

      <section className="panel">
        <h2>My orders</h2>
        <button onClick={() => void loadOrders()}>Refresh</button>
        <pre>{ordersJson}</pre>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
