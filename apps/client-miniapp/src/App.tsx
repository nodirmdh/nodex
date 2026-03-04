import { useEffect, useMemo, useState } from "react";
import type { MenuItem, Restaurant } from "@nodex/domain";
import { createOrder, listMenu, listMyOrders, listRestaurants, telegramAuth } from "./api";

type Cart = Record<string, number>;

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
};

function readTelegramInitData() {
  const tg = (window as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  tg?.ready?.();
  return tg?.initData ?? "";
}

export function App() {
  const [initData, setInitData] = useState("");
  const [authed, setAuthed] = useState(false);
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

  useEffect(() => {
    setInitData(readTelegramInitData());
  }, []);

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

  const authAndLoad = async () => {
    setError(null);
    try {
      if (!initData.trim()) {
        throw new Error("Telegram initData is required");
      }
      await telegramAuth(initData.trim());
      setAuthed(true);
      await loadRestaurants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    }
  };

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

  if (!authed) {
    return (
      <main className="shell">
        <h1>Nodex Client Mini App</h1>
        <p>Authenticate with Telegram WebApp initData</p>
        <textarea
          value={initData}
          onChange={(event) => setInitData(event.target.value)}
          rows={6}
          placeholder="initData"
        />
        <button onClick={() => void authAndLoad()}>Login via Telegram</button>
        {error && <p className="error">{error}</p>}
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
