import { useEffect, useMemo, useState } from "react";
import {
  createMenuItem,
  getDashboard,
  getRestaurant,
  listActiveOrders,
  listMenu,
  listOrders,
  listPromotions,
  listReviews,
  telegramAuth,
  updateMenuItem,
  updateOrderStatus,
  VendorMenuItem,
  VendorOrder,
} from "./api/client";

type Tab = "overview" | "orders" | "menu" | "promos" | "finance" | "reviews";

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
  const DEBUG_AUTH = import.meta.env.VITE_DEBUG_AUTH === "1";

  const [tab, setTab] = useState<Tab>("overview");
  const [authState, setAuthState] = useState<"loading" | "ready" | "blocked">("loading");
  const [manualInitData, setManualInitData] = useState("");
  const [tgUserId, setTgUserId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState({
    hasWebApp: false,
    initDataLength: 0,
    hasHashParam: false,
  });

  const [vendorName, setVendorName] = useState("Vendor");
  const [dashboard, setDashboard] = useState({ revenue: 0, completed_count: 0, average_check: 0 });
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [menuItems, setMenuItems] = useState<VendorMenuItem[]>([]);
  const [promosMessage, setPromosMessage] = useState("Coming soon");
  const [reviewsMessage, setReviewsMessage] = useState("Coming soon");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newMenu, setNewMenu] = useState({
    title: "",
    price: "",
    category: "MAIN",
    isAvailable: true,
  });
  const [statusForm, setStatusForm] = useState({
    orderId: "",
    status: "ACCEPTED",
  });

  const activeOrders = useMemo(
    () =>
      orders.filter((order) =>
        ["NEW", "ACCEPTED", "COOKING", "ONWAY"].includes(order.status),
      ),
    [orders],
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [restaurantRes, dashboardRes, ordersRes, menuRes, promosRes, reviewsRes] = await Promise.all([
        getRestaurant(),
        getDashboard(),
        listOrders(),
        listMenu(),
        listPromotions(),
        listReviews(),
      ]);
      setVendorName(restaurantRes.restaurant.name);
      setDashboard(dashboardRes);
      setOrders(ordersRes.orders);
      setMenuItems(menuRes.items);
      setPromosMessage(promosRes.message ?? "Coming soon");
      setReviewsMessage(reviewsRes.message ?? "Coming soon");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load vendor data");
    } finally {
      setLoading(false);
    }
  };

  const login = async (initData: string) => {
    setAuthState("loading");
    setMessage(null);
    try {
      if (!initData.trim()) {
        throw new Error("Telegram initData is required");
      }
      await telegramAuth(initData);
      await loadAll();
      setAuthState("ready");
    } catch (err) {
      setAuthState("blocked");
      setMessage(err instanceof Error ? err.message : "Auth failed");
    }
  };

  useEffect(() => {
    const tg = readTelegramWebApp();
    const initDataRaw = tg?.initData ?? "";
    setDebugInfo({
      hasWebApp: Boolean(tg),
      initDataLength: initDataRaw.length,
      hasHashParam: initDataRaw.includes("hash="),
    });

    if (!tg) {
      setAuthState("blocked");
      setMessage("Open via bot menu button (bottom). If you opened from a link, close and open from the menu.");
      return;
    }

    const initData = initDataRaw.trim();
    const unsafeUserId = tg.initDataUnsafe?.user?.id;
    if (unsafeUserId !== undefined && unsafeUserId !== null) {
      setTgUserId(String(unsafeUserId));
    }

    if (!initData) {
      setAuthState("blocked");
      setMessage("Open via bot menu button (bottom). If you opened from a link, close and open from the menu.");
      return;
    }

    void login(initData);
  }, []);

  const submitStatus = async () => {
    setMessage(null);
    try {
      if (!statusForm.orderId.trim()) {
        throw new Error("order id is required");
      }
      await updateOrderStatus(statusForm.orderId.trim(), statusForm.status);
      await loadAll();
      setMessage("Order status updated");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const submitMenuCreate = async () => {
    setMessage(null);
    try {
      if (!newMenu.title.trim() || !newMenu.price.trim()) {
        throw new Error("title and price are required");
      }
      await createMenuItem({
        title: newMenu.title.trim(),
        price: Number(newMenu.price),
        category: newMenu.category || null,
        isAvailable: newMenu.isAvailable,
      });
      setNewMenu({ title: "", price: "", category: "MAIN", isAvailable: true });
      await loadAll();
      setMessage("Menu item created");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create menu item");
    }
  };

  const toggleMenuItem = async (item: VendorMenuItem) => {
    try {
      const current = item.isAvailable ?? Boolean(item.is_available);
      await updateMenuItem(item.id, { isAvailable: !current });
      await loadAll();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update menu");
    }
  };

  if (authState === "loading") {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Nodex Vendor Mini App</h1>
          <p>Authenticating via Telegram...</p>
        </section>
      </main>
    );
  }

  if (authState === "blocked") {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Nodex Vendor Mini App</h1>
          <p>Open via bot menu button (bottom). If you opened from a link, close and open from the menu.</p>
          {tgUserId && <p>Detected Telegram user: {tgUserId}</p>}
          {message && <p className="error">{message}</p>}
        </section>
        {DEBUG_AUTH && (
          <section className="panel">
            <h2>Auth debug</h2>
            <p>Telegram.WebApp exists: {String(debugInfo.hasWebApp)}</p>
            <p>initData length: {debugInfo.initDataLength}</p>
            <p>contains hash=: {String(debugInfo.hasHashParam)}</p>
            <button
              onClick={() =>
                void navigator.clipboard.writeText(
                  [
                    `Telegram.WebApp=${debugInfo.hasWebApp}`,
                    `initData.length=${debugInfo.initDataLength}`,
                    `initData.hasHash=${debugInfo.hasHashParam}`,
                  ].join("\n"),
                )
              }
            >
              Copy debug
            </button>
          </section>
        )}
        {DEV_MODE && (
          <section className="panel">
            <h2>DEV fallback</h2>
            <textarea
              value={manualInitData}
              onChange={(event) => setManualInitData(event.target.value)}
              rows={6}
              placeholder="Paste initData"
            />
            <button onClick={() => void login(manualInitData.trim())}>Auth with initData</button>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="page-top">
        <div>
          <h1>{vendorName}</h1>
          <p>Vendor mini app</p>
        </div>
        <button onClick={() => void loadAll()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <nav className="tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Orders</button>
        <button className={tab === "menu" ? "active" : ""} onClick={() => setTab("menu")}>Menu</button>
        <button className={tab === "promos" ? "active" : ""} onClick={() => setTab("promos")}>Promos</button>
        <button className={tab === "finance" ? "active" : ""} onClick={() => setTab("finance")}>Finance</button>
        <button className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>Reviews</button>
      </nav>

      {tab === "overview" && (
        <section className="panel grid">
          <div className="card">
            <strong>Revenue</strong>
            <div>{dashboard.revenue}</div>
          </div>
          <div className="card">
            <strong>Orders</strong>
            <div>{dashboard.completed_count}</div>
          </div>
          <div className="card">
            <strong>Avg check</strong>
            <div>{Math.round(dashboard.average_check)}</div>
          </div>
          <div className="card">
            <strong>Active now</strong>
            <div>{activeOrders.length}</div>
          </div>
        </section>
      )}

      {tab === "orders" && (
        <section className="panel">
          <h2>Orders</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Phone</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id.slice(0, 8)}</td>
                    <td>{order.status}</td>
                    <td>{order.total}</td>
                    <td>{order.phone}</td>
                    <td>{order.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="inline-form">
            <input
              value={statusForm.orderId}
              onChange={(event) => setStatusForm((prev) => ({ ...prev, orderId: event.target.value }))}
              placeholder="Order ID"
            />
            <select
              value={statusForm.status}
              onChange={(event) => setStatusForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="COOKING">COOKING</option>
              <option value="ONWAY">ONWAY</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <button onClick={() => void submitStatus()}>Update status</button>
          </div>
        </section>
      )}

      {tab === "menu" && (
        <section className="panel">
          <h2>Menu</h2>
          <div className="inline-form">
            <input
              value={newMenu.title}
              onChange={(event) => setNewMenu((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Title"
            />
            <input
              value={newMenu.price}
              onChange={(event) => setNewMenu((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="Price"
            />
            <input
              value={newMenu.category}
              onChange={(event) => setNewMenu((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="Category"
            />
            <button onClick={() => void submitMenuCreate()}>Add item</button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Available</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => {
                  const isAvailable = item.isAvailable ?? Boolean(item.is_available);
                  return (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.category ?? "-"}</td>
                      <td>{item.price}</td>
                      <td>{String(isAvailable)}</td>
                      <td>
                        <button onClick={() => void toggleMenuItem(item)}>
                          {isAvailable ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "promos" && (
        <section className="panel">
          <h2>Promos</h2>
          <p>{promosMessage}</p>
        </section>
      )}

      {tab === "finance" && (
        <section className="panel">
          <h2>Finance</h2>
          <p>Total revenue: {dashboard.revenue}</p>
          <p>Average check: {Math.round(dashboard.average_check)}</p>
        </section>
      )}

      {tab === "reviews" && (
        <section className="panel">
          <h2>Reviews</h2>
          <p>{reviewsMessage}</p>
        </section>
      )}

      {message && <p className="error">{message}</p>}
    </main>
  );
}
