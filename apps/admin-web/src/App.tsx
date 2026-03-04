import { useState } from "react";
import {
  createMenuItem,
  createRestaurant,
  getAdminToken,
  listAdminOrders,
  setAdminToken,
  updateMenuItem,
  updateRestaurant,
} from "./api";

export function App() {
  const [tokenInput, setTokenInput] = useState(getAdminToken() ?? "");
  const [ordersJson, setOrdersJson] = useState("[]");
  const [message, setMessage] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState("");
  const [restaurantVendorUserId, setRestaurantVendorUserId] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantFee, setRestaurantFee] = useState("5000");
  const [restaurantMinOrder, setRestaurantMinOrder] = useState("20000");

  const [menuItemId, setMenuItemId] = useState("");
  const [menuRestaurantId, setMenuRestaurantId] = useState("");
  const [menuTitle, setMenuTitle] = useState("");
  const [menuPrice, setMenuPrice] = useState("0");

  const saveToken = () => {
    setAdminToken(tokenInput.trim() || null);
    setMessage("Admin JWT saved in localStorage");
  };

  const refreshOrders = async () => {
    setMessage(null);
    try {
      const data = await listAdminOrders();
      setOrdersJson(JSON.stringify(data.orders, null, 2));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load orders");
    }
  };

  const submitRestaurant = async () => {
    setMessage(null);
    try {
      const payload = {
        vendorUserId: restaurantVendorUserId,
        name: restaurantName,
        deliveryFee: Number(restaurantFee),
        minOrder: Number(restaurantMinOrder),
      };
      const data = restaurantId
        ? await updateRestaurant(restaurantId, payload)
        : await createRestaurant(payload);
      setMessage(`Restaurant saved: ${data.id}`);
      if (!restaurantId) {
        setRestaurantId(data.id);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save restaurant");
    }
  };

  const submitMenuItem = async () => {
    setMessage(null);
    try {
      const payload = {
        restaurantId: menuRestaurantId,
        title: menuTitle,
        price: Number(menuPrice),
      };
      const data = menuItemId
        ? await updateMenuItem(menuItemId, payload)
        : await createMenuItem(payload);
      setMessage(`Menu item saved: ${data.id}`);
      if (!menuItemId) {
        setMenuItemId(data.id);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save menu item");
    }
  };

  return (
    <main className="shell">
      <h1>Nodex Admin Web</h1>

      <section className="panel">
        <h2>Admin JWT (localStorage)</h2>
        <textarea
          rows={4}
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          placeholder="Paste admin JWT"
        />
        <button onClick={saveToken}>Save token</button>
      </section>

      <section className="panel">
        <h2>Create / Update Restaurant</h2>
        <input value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} placeholder="Restaurant ID (empty for create)" />
        <input value={restaurantVendorUserId} onChange={(e) => setRestaurantVendorUserId(e.target.value)} placeholder="Vendor User ID" />
        <input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} placeholder="Name" />
        <input value={restaurantFee} onChange={(e) => setRestaurantFee(e.target.value)} placeholder="Delivery fee" />
        <input value={restaurantMinOrder} onChange={(e) => setRestaurantMinOrder(e.target.value)} placeholder="Min order" />
        <button onClick={() => void submitRestaurant()}>Save restaurant</button>
      </section>

      <section className="panel">
        <h2>Create / Update Menu Item</h2>
        <input value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} placeholder="Menu Item ID (empty for create)" />
        <input value={menuRestaurantId} onChange={(e) => setMenuRestaurantId(e.target.value)} placeholder="Restaurant ID" />
        <input value={menuTitle} onChange={(e) => setMenuTitle(e.target.value)} placeholder="Title" />
        <input value={menuPrice} onChange={(e) => setMenuPrice(e.target.value)} placeholder="Price" />
        <button onClick={() => void submitMenuItem()}>Save menu item</button>
      </section>

      <section className="panel">
        <h2>Orders</h2>
        <button onClick={() => void refreshOrders()}>Refresh /admin/orders</button>
        <pre>{ordersJson}</pre>
      </section>

      {message && <p className="message">{message}</p>}
    </main>
  );
}
