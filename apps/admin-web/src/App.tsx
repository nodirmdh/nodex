import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  BadgeDollarSign,
  Building2,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MenuSquare,
  Percent,
  ReceiptText,
  Search,
  Shield,
  Star,
} from "lucide-react";

import {
  createMenuItem,
  createRestaurant,
  getAdminToken,
  loginAdmin,
  listAdminOrders,
  listMenuItems,
  listRestaurants,
  MenuItemDto,
  OrderDto,
  RestaurantDto,
  setAdminToken,
  updateMenuItem,
  updateRestaurant,
} from "./api";

function AuthGate({ children }: { children: React.ReactNode }) {
  const token = getAdminToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo-wrap">
          <Shield size={18} />
          <div>
            <div className="logo-title">Nodex Admin</div>
            <div className="logo-subtitle">Cloudflare Free MVP</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/overview" className="side-link">
            <LayoutDashboard size={16} /> Overview
          </NavLink>
          <NavLink to="/restaurants" className="side-link">
            <Building2 size={16} /> Restaurants
          </NavLink>
          <NavLink to="/orders" className="side-link">
            <ListOrdered size={16} /> Orders
          </NavLink>
          <NavLink to="/menu" className="side-link">
            <MenuSquare size={16} /> Menu
          </NavLink>
          <NavLink to="/promos" className="side-link">
            <Percent size={16} /> Promos
          </NavLink>
          <NavLink to="/finance" className="side-link">
            <BadgeDollarSign size={16} /> Finance
          </NavLink>
          <NavLink to="/reviews" className="side-link">
            <Star size={16} /> Reviews
          </NavLink>
        </nav>

        <button
          className="logout-btn"
          onClick={() => {
            setAdminToken(null);
            navigate("/login", { replace: true });
          }}
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/*"
          element={
            <AuthGate>
              <ShellLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route path="/overview" element={<OverviewPage />} />
                  <Route path="/restaurants" element={<RestaurantsPage />} />
                  <Route path="/restaurants/:id" element={<RestaurantDetailsPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:id" element={<OrderDetailsPage />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/promos" element={<PromosPage />} />
                  <Route path="/finance" element={<FinancePage />} />
                  <Route path="/reviews" element={<ReviewsPage />} />
                </Routes>
              </ShellLayout>
            </AuthGate>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function LoginScreen() {
  const navigate = useNavigate();
  const [token, setToken] = useState(getAdminToken() ?? "");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="login-layer">
      <div className="login-card">
        <h1>Admin Login</h1>
        <p>Вход через Worker secrets или вставка JWT.</p>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Admin username"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Admin password"
        />
        <button
          className="primary"
          onClick={async () => {
            try {
              setError(null);
              await loginAdmin(username.trim(), password);
              navigate("/overview", { replace: true });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed");
            }
          }}
        >
          Login with password
        </button>
        <p>или вставьте готовый JWT:</p>
        <textarea
          rows={5}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste JWT token"
        />
        <button
          className="primary"
          onClick={() => {
            const value = token.trim();
            if (!value) return;
            setAdminToken(value);
            navigate("/overview", { replace: true });
          }}
        >
          Continue
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

function OverviewPage() {
  const [restaurants, setRestaurants] = useState<RestaurantDto[]>([]);
  const [orders, setOrders] = useState<OrderDto[]>([]);

  useEffect(() => {
    void Promise.all([listRestaurants(), listAdminOrders()]).then(([r, o]) => {
      setRestaurants(r.restaurants);
      setOrders(o.orders);
    });
  }, []);

  const openCount = restaurants.filter((r) => r.isOpen).length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <section className="page">
      <header className="page-head">
        <h2>Overview</h2>
      </header>
      <div className="kpis">
        <Kpi label="Restaurants" value={restaurants.length} />
        <Kpi label="Open now" value={openCount} />
        <Kpi label="Orders" value={orders.length} />
        <Kpi label="Revenue" value={totalRevenue} />
      </div>
      <div className="split-card">
        <div>
          <h3>Latest Orders</h3>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Restaurant</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((order) => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}</td>
                  <td>{order.restaurant_name}</td>
                  <td>{order.status}</td>
                  <td>{order.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="map-box">
          <h3>Map Section</h3>
          <p>Здесь можно разместить operational map (v2).</p>
          <iframe
            title="map"
            src="https://www.openstreetmap.org/export/embed.html?bbox=69.15%2C41.20%2C69.35%2C41.37&amp;layer=mapnik"
          />
        </div>
      </div>
    </section>
  );
}

function RestaurantsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RestaurantDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    id: "",
    vendorUserId: "",
    name: "",
    deliveryFee: "5000",
    minOrder: "25000",
    etaText: "25-35 min",
    isOpen: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await listRestaurants();
      setRows(data.restaurants);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q) || row.id.includes(q));
  }, [rows, query]);

  const save = async () => {
    const payload = {
      vendorUserId: form.vendorUserId,
      name: form.name,
      deliveryFee: Number(form.deliveryFee),
      minOrder: Number(form.minOrder),
      etaText: form.etaText,
      isOpen: form.isOpen,
    };

    if (form.id) {
      await updateRestaurant(form.id, payload);
    } else {
      await createRestaurant(payload);
    }

    await load();
    setForm({
      id: "",
      vendorUserId: "",
      name: "",
      deliveryFee: "5000",
      minOrder: "25000",
      etaText: "25-35 min",
      isOpen: true,
    });
  };

  return (
    <section className="page">
      <header className="page-head">
        <h2>Restaurants</h2>
      </header>

      <div className="toolbar">
        <label className="search-box">
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by id/name" />
        </label>
      </div>

      <div className="card form-grid">
        <h3>{form.id ? "Edit restaurant" : "Create restaurant"}</h3>
        <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="Restaurant ID (for update)" />
        <input value={form.vendorUserId} onChange={(e) => setForm({ ...form, vendorUserId: e.target.value })} placeholder="Vendor user ID" />
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
        <input value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} placeholder="Delivery fee" />
        <input value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="Min order" />
        <input value={form.etaText} onChange={(e) => setForm({ ...form, etaText: e.target.value })} placeholder="ETA text" />
        <label className="checkbox-line">
          <input type="checkbox" checked={form.isOpen} onChange={(e) => setForm({ ...form, isOpen: e.target.checked })} />
          Open
        </label>
        <button className="primary" onClick={() => void save()}>Save restaurant</button>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Delivery fee</th>
                <th>Min order</th>
                <th>ETA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.isOpen ? "OPEN" : "CLOSED"}</td>
                  <td>{row.deliveryFee}</td>
                  <td>{row.minOrder}</td>
                  <td>{row.etaText ?? "-"}</td>
                  <td>
                    <button className="link" onClick={() => navigate(`/restaurants/${row.id}`)}>Overview</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function RestaurantDetailsPage() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<"overview" | "orders" | "menu" | "promos" | "finance" | "reviews">("overview");
  const [restaurant, setRestaurant] = useState<RestaurantDto | null>(null);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [menu, setMenu] = useState<MenuItemDto[]>([]);
  const [menuForm, setMenuForm] = useState({
    id: "",
    title: "",
    price: "",
    category: "",
    isAvailable: true,
  });

  const load = async () => {
    const [restaurantsData, ordersData, menuData] = await Promise.all([
      listRestaurants(),
      listAdminOrders(),
      listMenuItems(id),
    ]);
    setRestaurant(restaurantsData.restaurants.find((item) => item.id === id) ?? null);
    setOrders(ordersData.orders.filter((item) => item.restaurant_id === id));
    setMenu(menuData.items);
  };

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id]);

  const saveMenu = async () => {
    const payload = {
      restaurantId: id,
      title: menuForm.title,
      price: Number(menuForm.price),
      category: menuForm.category || null,
      isAvailable: menuForm.isAvailable,
    };
    if (menuForm.id) {
      await updateMenuItem(menuForm.id, payload);
    } else {
      await createMenuItem(payload);
    }
    await load();
    setMenuForm({ id: "", title: "", price: "", category: "", isAvailable: true });
  };

  const totalRevenue = orders.reduce((sum, item) => sum + item.total, 0);

  return (
    <section className="page">
      <header className="page-head">
        <h2>{restaurant?.name ?? "Restaurant"}</h2>
      </header>

      <div className="tabs">
        {[
          ["overview", "Overview"],
          ["orders", "Orders"],
          ["menu", "Menu"],
          ["promos", "Promos"],
          ["finance", "Finance"],
          ["reviews", "Reviews"],
        ].map(([value, label]) => (
          <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value as typeof tab)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="split-card">
          <div className="card">
            <h3>Restaurant card</h3>
            <p><strong>ID:</strong> {restaurant?.id}</p>
            <p><strong>Status:</strong> {restaurant?.isOpen ? "OPEN" : "CLOSED"}</p>
            <p><strong>Delivery fee:</strong> {restaurant?.deliveryFee ?? 0}</p>
            <p><strong>Min order:</strong> {restaurant?.minOrder ?? 0}</p>
            <p><strong>ETA:</strong> {restaurant?.etaText ?? "-"}</p>
          </div>
          <div className="map-box">
            <h3>Map section</h3>
            <p>Geo map block placeholder.</p>
            <iframe
              title="map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=69.15%2C41.20%2C69.35%2C41.37&amp;layer=mapnik"
            />
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Address</th>
                <th>Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.status}</td>
                  <td>{order.address}</td>
                  <td>{order.total}</td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "menu" && (
        <>
          <div className="card form-grid">
            <h3>{menuForm.id ? "Edit item" : "Create item"}</h3>
            <input value={menuForm.id} onChange={(e) => setMenuForm({ ...menuForm, id: e.target.value })} placeholder="Menu item id (for update)" />
            <input value={menuForm.title} onChange={(e) => setMenuForm({ ...menuForm, title: e.target.value })} placeholder="Title" />
            <input value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="Price" />
            <input value={menuForm.category} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })} placeholder="Category" />
            <label className="checkbox-line">
              <input type="checkbox" checked={menuForm.isAvailable} onChange={(e) => setMenuForm({ ...menuForm, isAvailable: e.target.checked })} />
              Available
            </label>
            <button className="primary" onClick={() => void saveMenu()}>Save menu item</button>
          </div>

          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {menu.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.price}</td>
                    <td>{item.category ?? "-"}</td>
                    <td>{item.isAvailable ? "AVAILABLE" : "HIDDEN"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "promos" && (
        <div className="card">
          <h3>Promos</h3>
          <p>Promo management UI placeholder. Worker promo endpoints can be connected later.</p>
        </div>
      )}

      {tab === "finance" && (
        <div className="kpis">
          <Kpi label="Orders" value={orders.length} />
          <Kpi label="Revenue" value={totalRevenue} />
          <Kpi label="Avg check" value={orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0} />
        </div>
      )}

      {tab === "reviews" && (
        <div className="card">
          <h3>Reviews</h3>
          <p>Отзывы пока не подключены в Worker v1.</p>
        </div>
      )}
    </section>
  );
}

function OrdersPage() {
  const [rows, setRows] = useState<OrderDto[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void listAdminOrders().then((data) => setRows(data.orders));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.id.includes(q) || row.restaurant_name.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <section className="page">
      <header className="page-head">
        <h2>Orders</h2>
      </header>
      <div className="toolbar">
        <label className="search-box">
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or restaurant" />
        </label>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Restaurant</th>
              <th>Status</th>
              <th>Total</th>
              <th>Address</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.restaurant_name}</td>
                <td>{order.status}</td>
                <td>{order.total}</td>
                <td>{order.address}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderDetailsPage() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<OrderDto | null>(null);

  useEffect(() => {
    void listAdminOrders().then((data) => {
      setOrder(data.orders.find((item) => item.id === id) ?? null);
    });
  }, [id]);

  if (!order) {
    return <section className="page"><h2>Order not found</h2></section>;
  }

  return (
    <section className="page">
      <header className="page-head">
        <h2>Order {order.id}</h2>
      </header>
      <div className="card details-grid">
        <p><strong>Restaurant:</strong> {order.restaurant_name}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Client ID:</strong> {order.client_user_id}</p>
        <p><strong>Phone:</strong> {order.phone}</p>
        <p><strong>Address:</strong> {order.address}</p>
        <p><strong>Comment:</strong> {order.comment ?? "-"}</p>
        <p><strong>Subtotal:</strong> {order.subtotal}</p>
        <p><strong>Delivery:</strong> {order.delivery_fee}</p>
        <p><strong>Discount:</strong> {order.discount}</p>
        <p><strong>Total:</strong> {order.total}</p>
      </div>
    </section>
  );
}

function MenuPage() {
  const [restaurants, setRestaurants] = useState<RestaurantDto[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [items, setItems] = useState<MenuItemDto[]>([]);
  const [form, setForm] = useState({
    id: "",
    title: "",
    price: "",
    category: "",
    isAvailable: true,
  });

  const load = async () => {
    const data = await listRestaurants();
    setRestaurants(data.restaurants);
    const fallback = data.restaurants[0]?.id ?? "";
    const chosen = selectedRestaurant || fallback;
    setSelectedRestaurant(chosen);
    if (chosen) {
      const menu = await listMenuItems(chosen);
      setItems(menu.items);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const reloadMenu = async (restaurantId: string) => {
    if (!restaurantId) {
      setItems([]);
      return;
    }
    const menu = await listMenuItems(restaurantId);
    setItems(menu.items);
  };

  const save = async () => {
    if (!selectedRestaurant) return;
    const payload = {
      restaurantId: selectedRestaurant,
      title: form.title,
      price: Number(form.price),
      category: form.category || null,
      isAvailable: form.isAvailable,
    };
    if (form.id) {
      await updateMenuItem(form.id, payload);
    } else {
      await createMenuItem(payload);
    }
    await reloadMenu(selectedRestaurant);
    setForm({ id: "", title: "", price: "", category: "", isAvailable: true });
  };

  return (
    <section className="page">
      <header className="page-head">
        <h2>Menu CRUD</h2>
      </header>

      <div className="card form-grid">
        <h3>Restaurant</h3>
        <select
          value={selectedRestaurant}
          onChange={async (event) => {
            const id = event.target.value;
            setSelectedRestaurant(id);
            await reloadMenu(id);
          }}
        >
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
          ))}
        </select>
      </div>

      <div className="card form-grid">
        <h3>{form.id ? "Edit item" : "Create item"}</h3>
        <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="Menu item id (for update)" />
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
        <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" />
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" />
        <label className="checkbox-line">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
          Available
        </label>
        <button className="primary" onClick={() => void save()}>Save</button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Price</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.title}</td>
                <td>{item.price}</td>
                <td>{item.category ?? "-"}</td>
                <td>{item.isAvailable ? "AVAILABLE" : "HIDDEN"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PromosPage() {
  return (
    <section className="page">
      <header className="page-head">
        <h2>Promos</h2>
      </header>
      <div className="card">
        <p>Promo module UI restored. Backend promo endpoints are not included in current Worker v1 schema.</p>
      </div>
    </section>
  );
}

function FinancePage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);

  useEffect(() => {
    void listAdminOrders().then((data) => setOrders(data.orders));
  }, []);

  const gross = orders.reduce((sum, order) => sum + order.total, 0);
  const delivery = orders.reduce((sum, order) => sum + order.delivery_fee, 0);
  const discount = orders.reduce((sum, order) => sum + order.discount, 0);

  return (
    <section className="page">
      <header className="page-head">
        <h2>Finance</h2>
      </header>
      <div className="kpis">
        <Kpi label="Orders" value={orders.length} />
        <Kpi label="Gross" value={gross} />
        <Kpi label="Delivery fees" value={delivery} />
        <Kpi label="Discounts" value={discount} />
      </div>
    </section>
  );
}

function ReviewsPage() {
  return (
    <section className="page">
      <header className="page-head">
        <h2>Reviews</h2>
      </header>
      <div className="card">
        <p>Reviews dashboard placeholder (will be connected when review endpoints are added in Worker).</p>
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value.toLocaleString()}</div>
    </div>
  );
}

