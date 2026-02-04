import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";

import { ApiClient, MenuItem, VendorOrderDetails, VendorOrderSummary } from "./api/client";

const client = new ApiClient();

function AppLayout({
  children,
  vendorId,
  onVendorIdChange,
}: {
  children: React.ReactNode;
  vendorId: string;
  onVendorIdChange: (value: string) => void;
}) {
  useEffect(() => {
    client.setVendorId(vendorId || null);
  }, [vendorId]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">Nodex Vendor</div>
        <div className="vendor-select">
          <label>Vendor ID (DEV)</label>
          <input
            type="text"
            value={vendorId}
            onChange={(event) => onVendorIdChange(event.target.value)}
            placeholder="vendor uuid"
          />
        </div>
        <nav className="nav">
          <Link to="/dashboard">Home</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/promotions">Promotions</Link>
          <Link to="/stats">Statistics</Link>
          <Link to="/menu">Menu</Link>
          <Link to="/account">Account</Link>
          <Link to="/support">Support</Link>
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

export function App() {
  const [vendorId, setVendorId] = useState<string>(
    window.localStorage.getItem("nodex_vendor_id") ?? "",
  );

  useEffect(() => {
    if (vendorId) {
      window.localStorage.setItem("nodex_vendor_id", vendorId);
    }
  }, [vendorId]);

  return (
    <BrowserRouter>
      <AppLayout vendorId={vendorId} onVendorIdChange={setVendorId}>
        <Routes>
          <Route path="/" element={<DashboardPage vendorId={vendorId} />} />
          <Route path="/dashboard" element={<DashboardPage vendorId={vendorId} />} />
          <Route path="/orders" element={<OrdersPage vendorId={vendorId} />} />
          <Route path="/orders/:orderId" element={<OrderDetailsPage vendorId={vendorId} />} />
          <Route path="/promotions" element={<PromotionsPage vendorId={vendorId} />} />
          <Route path="/stats" element={<StatisticsPage vendorId={vendorId} />} />
          <Route path="/menu" element={<MenuPage vendorId={vendorId} />} />
          <Route path="/account" element={<AccountPage vendorId={vendorId} />} />
          <Route path="/support" element={<SupportPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

function OrdersPage({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<VendorOrderSummary[]>([]);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!vendorId) {
        setOrders([]);
        setIsLoading(false);
        return;
      }
      const data = await client.listOrders({ status: tab });
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [vendorId, tab]);

  return (
    <section>
      <div className="page-header">
        <h1>Orders</h1>
        <button className="secondary" onClick={() => void loadOrders()}>
          Refresh
        </button>
      </div>

      <div className="tabs">
        <button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>
          Active
        </button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!vendorId && <div className="error-banner">Set vendor ID to load orders.</div>}
      {isLoading ? (
        <p>Loading orders...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Fulfillment</th>
              <th>Total</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.order_id}>
                <td>{order.order_id}</td>
                <td>{order.status}</td>
                <td>{order.fulfillment_type}</td>
                <td>{order.total}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
                <td>
                  <Link to={`/orders/${order.order_id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function DashboardPage({ vendorId }: { vendorId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof client.getDashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!vendorId) {
          setData(null);
          setIsLoading(false);
          return;
        }
        const response = await client.getDashboard("7d");
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [vendorId]);

  return (
    <section>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!vendorId && <div className="error-banner">Set vendor ID to load dashboard.</div>}
      {isLoading ? (
        <p>Loading dashboard...</p>
      ) : data ? (
        <>
          <div className="details-grid">
            <div>
              <strong>Revenue</strong>
              <div>{data.revenue}</div>
            </div>
            <div>
              <strong>Completed</strong>
              <div>{data.completed_count}</div>
            </div>
            <div>
              <strong>Average check</strong>
              <div>{data.average_check}</div>
            </div>
            <div>
              <strong>Rating</strong>
              <div>
                {data.rating_avg.toFixed(1)} ({data.rating_count})
              </div>
            </div>
          </div>
          <h2>Last 7 days</h2>
          {data.daily.length === 0 ? (
            <p>No data.</p>
          ) : (
            <ul className="event-list">
              {data.daily.map((entry) => (
                <li key={entry.date}>
                  <span>{entry.date}</span>
                  <span>
                    {entry.revenue} / {entry.count} orders
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p>No data.</p>
      )}
    </section>
  );
}

function PromotionsPage({ vendorId }: { vendorId: string }) {
  const [promotions, setPromotions] = useState<
    Array<{
      promotion_id: string;
      promo_type: string;
      value_numeric: number;
      priority: number;
      is_active: boolean;
      starts_at: string | null;
      ends_at: string | null;
      items: string[];
      combo_items: Array<{ menu_item_id: string; quantity: number }>;
      buy_x_get_y: {
        buy_item_id: string;
        buy_quantity: number;
        get_item_id: string;
        get_quantity: number;
        discount_percent: number;
      } | null;
      gift: { gift_item_id: string; gift_quantity: number; min_order_amount: number } | null;
    }>
  >([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    promo_type: "PERCENT",
    value_numeric: "",
    priority: "0",
    is_active: true,
    starts_at: "",
    ends_at: "",
    items: [] as string[],
    combo_items: [] as Array<{ menu_item_id: string; quantity: number }>,
    buy_x_get_y: {
      buy_item_id: "",
      buy_quantity: "1",
      get_item_id: "",
      get_quantity: "1",
      discount_percent: "100",
    },
    gift: {
      gift_item_id: "",
      gift_quantity: "1",
      min_order_amount: "0",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      promo_type: "PERCENT",
      value_numeric: "",
      priority: "0",
      is_active: true,
      starts_at: "",
      ends_at: "",
      items: [],
      combo_items: [],
      buy_x_get_y: {
        buy_item_id: "",
        buy_quantity: "1",
        get_item_id: "",
        get_quantity: "1",
        discount_percent: "100",
      },
      gift: {
        gift_item_id: "",
        gift_quantity: "1",
        min_order_amount: "0",
      },
    });
  };

  const loadPromotions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!vendorId) {
        setPromotions([]);
        setMenuItems([]);
        setIsLoading(false);
        return;
      }
      const [promoData, menuData] = await Promise.all([
        client.listPromotions(),
        client.listMenu(),
      ]);
      setPromotions(promoData.promotions);
      setMenuItems(menuData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promotions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPromotions();
  }, [vendorId]);

  const filteredMenuItems = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return menuItems;
    return menuItems.filter(
      (item) =>
        item.title.toLowerCase().includes(value) ||
        (item.category ?? "").toLowerCase().includes(value),
    );
  }, [menuItems, search]);

  const buildSummary = (promo: (typeof promotions)[number]) => {
    switch (promo.promo_type) {
      case "PERCENT":
        return `${promo.value_numeric}% on ${promo.items.length} item(s)`;
      case "FIXED_PRICE":
        return `Fixed ${promo.value_numeric} for ${promo.items.length} item(s)`;
      case "COMBO":
        return `Combo ${promo.combo_items.length} item(s) for ${promo.value_numeric}`;
      case "BUY_X_GET_Y":
        return promo.buy_x_get_y
          ? `Buy ${promo.buy_x_get_y.buy_quantity} get ${promo.buy_x_get_y.get_quantity} (${promo.buy_x_get_y.discount_percent}%)`
          : "Buy X Get Y";
      case "GIFT":
        return promo.gift
          ? `Gift ${promo.gift.gift_quantity} over ${promo.gift.min_order_amount}`
          : "Gift";
      default:
        return promo.promo_type;
    }
  };

  const buildPayload = () => {
    const payload: {
      promo_type: string;
      value_numeric?: number;
      priority?: number;
      is_active?: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
      items?: string[];
      combo_items?: Array<{ menu_item_id: string; quantity: number }>;
      buy_x_get_y?: {
        buy_item_id: string;
        buy_quantity: number;
        get_item_id: string;
        get_quantity: number;
        discount_percent: number;
      } | null;
      gift?: { gift_item_id: string; gift_quantity: number; min_order_amount: number } | null;
    } = {
      promo_type: form.promo_type,
      priority: Number(form.priority) || 0,
      is_active: form.is_active,
      starts_at: form.starts_at ? form.starts_at : null,
      ends_at: form.ends_at ? form.ends_at : null,
    };

    if (form.promo_type === "PERCENT" || form.promo_type === "FIXED_PRICE") {
      payload.value_numeric = Number(form.value_numeric);
      payload.items = form.items;
    }
    if (form.promo_type === "COMBO") {
      payload.value_numeric = Number(form.value_numeric);
      payload.combo_items = form.combo_items;
    }
    if (form.promo_type === "BUY_X_GET_Y") {
      payload.value_numeric = 0;
      payload.buy_x_get_y = {
        buy_item_id: form.buy_x_get_y.buy_item_id,
        buy_quantity: Number(form.buy_x_get_y.buy_quantity),
        get_item_id: form.buy_x_get_y.get_item_id,
        get_quantity: Number(form.buy_x_get_y.get_quantity),
        discount_percent: Number(form.buy_x_get_y.discount_percent),
      };
    }
    if (form.promo_type === "GIFT") {
      payload.value_numeric = 0;
      payload.gift = {
        gift_item_id: form.gift.gift_item_id,
        gift_quantity: Number(form.gift.gift_quantity),
        min_order_amount: Number(form.gift.min_order_amount),
      };
    }

    return payload;
  };

  const validateForm = () => {
    if (form.promo_type === "PERCENT" || form.promo_type === "FIXED_PRICE") {
      if (!Number.isFinite(Number(form.value_numeric))) {
        return "Value is required.";
      }
      if (form.items.length === 0) {
        return "Select at least one menu item.";
      }
    }
    if (form.promo_type === "COMBO") {
      if (!Number.isFinite(Number(form.value_numeric))) {
        return "Combo price is required.";
      }
      if (form.combo_items.length === 0) {
        return "Add combo items.";
      }
    }
    if (form.promo_type === "BUY_X_GET_Y") {
      if (!form.buy_x_get_y.buy_item_id || !form.buy_x_get_y.get_item_id) {
        return "Select buy and get items.";
      }
    }
    if (form.promo_type === "GIFT") {
      if (!form.gift.gift_item_id) {
        return "Select gift item.";
      }
    }
    return null;
  };

  const startEdit = (promo: (typeof promotions)[number]) => {
    setEditingId(promo.promotion_id);
    setForm({
      promo_type: promo.promo_type,
      value_numeric: promo.value_numeric.toString(),
      priority: promo.priority.toString(),
      is_active: promo.is_active,
      starts_at: promo.starts_at ?? "",
      ends_at: promo.ends_at ?? "",
      items: promo.items ?? [],
      combo_items: promo.combo_items ?? [],
      buy_x_get_y: promo.buy_x_get_y
        ? {
            buy_item_id: promo.buy_x_get_y.buy_item_id,
            buy_quantity: promo.buy_x_get_y.buy_quantity.toString(),
            get_item_id: promo.buy_x_get_y.get_item_id,
            get_quantity: promo.buy_x_get_y.get_quantity.toString(),
            discount_percent: promo.buy_x_get_y.discount_percent.toString(),
          }
        : {
            buy_item_id: "",
            buy_quantity: "1",
            get_item_id: "",
            get_quantity: "1",
            discount_percent: "100",
          },
      gift: promo.gift
        ? {
            gift_item_id: promo.gift.gift_item_id,
            gift_quantity: promo.gift.gift_quantity.toString(),
            min_order_amount: promo.gift.min_order_amount.toString(),
          }
        : {
            gift_item_id: "",
            gift_quantity: "1",
            min_order_amount: "0",
          },
    });
  };

  return (
    <section>
      <div className="page-header">
        <h1>Promotions</h1>
        <button className="secondary" onClick={() => void loadPromotions()}>
          Refresh
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!vendorId && <div className="error-banner">Set vendor ID to manage promotions.</div>}

      <div className="panel">
        <h2>{editingId ? "Edit promotion" : "Create promotion"}</h2>
        <div className="details-grid">
          <label>
            Type
            <select
              value={form.promo_type}
              onChange={(event) => setForm({ ...form, promo_type: event.target.value })}
            >
              <option value="PERCENT">Percent</option>
              <option value="FIXED_PRICE">Fixed price</option>
              <option value="COMBO">Combo</option>
              <option value="BUY_X_GET_Y">Buy X Get Y</option>
              <option value="GIFT">Gift</option>
            </select>
          </label>
          <label>
            Priority
            <input
              type="number"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            Active
          </label>
          <label>
            Starts at
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
            />
          </label>
          <label>
            Ends at
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
            />
          </label>
        </div>

        {(form.promo_type === "PERCENT" || form.promo_type === "FIXED_PRICE") && (
          <div className="panel">
            <label>
              Value
              <input
                type="number"
                value={form.value_numeric}
                onChange={(event) => setForm({ ...form, value_numeric: event.target.value })}
              />
            </label>
            <div className="row">
              <input
                placeholder="Search menu items..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="grid-2">
              {filteredMenuItems.map((item) => (
                <label key={item.id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.items.includes(item.id)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...form.items, item.id]
                        : form.items.filter((id) => id !== item.id);
                      setForm({ ...form, items: next });
                    }}
                  />
                  {item.title}
                </label>
              ))}
            </div>
          </div>
        )}

        {form.promo_type === "COMBO" && (
          <div className="panel">
            <label>
              Combo price
              <input
                type="number"
                value={form.value_numeric}
                onChange={(event) => setForm({ ...form, value_numeric: event.target.value })}
              />
            </label>
            <div className="row">
              <input
                placeholder="Search menu items..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="grid-2">
              {filteredMenuItems.map((item) => {
                const entry = form.combo_items.find((combo) => combo.menu_item_id === item.id);
                const qty = entry?.quantity ?? 0;
                return (
                  <label key={item.id}>
                    {item.title}
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        const next = form.combo_items.filter((combo) => combo.menu_item_id !== item.id);
                        if (value > 0) {
                          next.push({ menu_item_id: item.id, quantity: value });
                        }
                        setForm({ ...form, combo_items: next });
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {form.promo_type === "BUY_X_GET_Y" && (
          <div className="panel">
            <div className="details-grid">
              <label>
                Buy item
                <select
                  value={form.buy_x_get_y.buy_item_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      buy_x_get_y: { ...form.buy_x_get_y, buy_item_id: event.target.value },
                    })
                  }
                >
                  <option value="">Select</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Buy quantity
                <input
                  type="number"
                  value={form.buy_x_get_y.buy_quantity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      buy_x_get_y: { ...form.buy_x_get_y, buy_quantity: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                Get item
                <select
                  value={form.buy_x_get_y.get_item_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      buy_x_get_y: { ...form.buy_x_get_y, get_item_id: event.target.value },
                    })
                  }
                >
                  <option value="">Select</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Get quantity
                <input
                  type="number"
                  value={form.buy_x_get_y.get_quantity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      buy_x_get_y: { ...form.buy_x_get_y, get_quantity: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                Discount %
                <input
                  type="number"
                  value={form.buy_x_get_y.discount_percent}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      buy_x_get_y: { ...form.buy_x_get_y, discount_percent: event.target.value },
                    })
                  }
                />
              </label>
            </div>
          </div>
        )}

        {form.promo_type === "GIFT" && (
          <div className="panel">
            <div className="details-grid">
              <label>
                Gift item
                <select
                  value={form.gift.gift_item_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      gift: { ...form.gift, gift_item_id: event.target.value },
                    })
                  }
                >
                  <option value="">Select</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Gift quantity
                <input
                  type="number"
                  value={form.gift.gift_quantity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      gift: { ...form.gift, gift_quantity: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                Min order amount
                <input
                  type="number"
                  value={form.gift.min_order_amount}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      gift: { ...form.gift, min_order_amount: event.target.value },
                    })
                  }
                />
              </label>
            </div>
          </div>
        )}

        <div className="row">
          <button
            className="primary"
            onClick={async () => {
              const validationError = validateForm();
              if (validationError) {
                setError(validationError);
                return;
              }
              setIsLoading(true);
              setError(null);
              try {
                const payload = buildPayload();
                if (editingId) {
                  await client.updatePromotion(editingId, payload);
                } else {
                  await client.createPromotion(payload);
                }
                resetForm();
                await loadPromotions();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save promotion");
              } finally {
                setIsLoading(false);
              }
            }}
          >
            {editingId ? "Save changes" : "Create"}
          </button>
          {editingId && (
            <button className="secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p>Loading promotions...</p>
      ) : promotions.length === 0 ? (
        <p>No promotions yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Summary</th>
              <th>Priority</th>
              <th>Active</th>
              <th>Starts</th>
              <th>Ends</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => (
              <tr key={promo.promotion_id}>
                <td>{promo.promo_type}</td>
                <td>{buildSummary(promo)}</td>
                <td>{promo.priority}</td>
                <td>{promo.is_active ? "Yes" : "No"}</td>
                <td>{promo.starts_at ? new Date(promo.starts_at).toLocaleString() : "-"}</td>
                <td>{promo.ends_at ? new Date(promo.ends_at).toLocaleString() : "-"}</td>
                <td>
                  <button className="secondary" onClick={() => startEdit(promo)}>
                    Edit
                  </button>
                  <button
                    className="secondary"
                    onClick={async () => {
                      await client.updatePromotion(promo.promotion_id, {
                        is_active: !promo.is_active,
                      });
                      await loadPromotions();
                    }}
                  >
                    {promo.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="link danger"
                    onClick={async () => {
                      await client.deletePromotion(promo.promotion_id);
                      await loadPromotions();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function StatisticsPage({ vendorId }: { vendorId: string }) {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof client.getDashboard>> | null>(null);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof client.listReviews>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!vendorId) {
          setDashboard(null);
          setReviews([]);
          setIsLoading(false);
          return;
        }
        const [dash, rev] = await Promise.all([client.getDashboard("7d"), client.listReviews()]);
        setDashboard(dash);
        setReviews(rev);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [vendorId]);

  return (
    <section>
      <h1>Statistics</h1>
      {error && <div className="error-banner">{error}</div>}
      {!vendorId && <div className="error-banner">Set vendor ID to view statistics.</div>}
      {isLoading ? (
        <p>Loading stats...</p>
      ) : dashboard ? (
        <>
          <div className="details-grid">
            <div>
              <strong>Gross revenue</strong>
              <div>{dashboard.revenue}</div>
            </div>
            <div>
              <strong>Service fee total</strong>
              <div>{dashboard.service_fee_total}</div>
            </div>
            <div>
              <strong>Vendor owes</strong>
              <div>{dashboard.vendor_owes}</div>
            </div>
          </div>
          <h2>Latest reviews</h2>
          {reviews.length === 0 ? (
            <p>No reviews.</p>
          ) : (
            <ul className="event-list">
              {reviews.map((review) => (
                <li key={review.order_id}>
                  <span>{review.order_id}</span>
                  <span>
                    {review.vendor_stars} ★ — {review.vendor_comment ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p>No data.</p>
      )}
    </section>
  );
}

function AccountPage({ vendorId }: { vendorId: string }) {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof client.getProfile>> | null>(null);
  const [form, setForm] = useState({
    name: "",
    owner_full_name: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    inn: "",
    address_text: "",
    opening_hours: "",
    supports_pickup: false,
    lat: "",
    lng: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!vendorId) {
          setProfile(null);
          setIsLoading(false);
          return;
        }
        const data = await client.getProfile();
        setProfile(data);
        setForm({
          name: data.name ?? "",
          owner_full_name: data.owner_full_name ?? "",
          phone1: data.phone1 ?? data.phone ?? "",
          phone2: data.phone2 ?? "",
          phone3: data.phone3 ?? "",
          email: data.email ?? "",
          inn: data.inn ?? "",
          address_text: data.address_text ?? "",
          opening_hours: data.opening_hours ?? "",
          supports_pickup: data.supports_pickup,
          lat: data.geo.lat.toString(),
          lng: data.geo.lng.toString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [vendorId]);

  return (
    <section>
      <h1>Account</h1>
      {error && <div className="error-banner">{error}</div>}
      {!vendorId && <div className="error-banner">Set vendor ID to edit profile.</div>}
      {isLoading ? (
        <p>Loading profile...</p>
      ) : (
        <div className="panel">
          <div className="details-grid">
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Owner full name
              <input
                value={form.owner_full_name}
                onChange={(e) => setForm({ ...form, owner_full_name: e.target.value })}
              />
            </label>
            <label>
              Phone 1
              <input value={form.phone1} onChange={(e) => setForm({ ...form, phone1: e.target.value })} />
            </label>
            <label>
              Phone 2
              <input value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
            </label>
            <label>
              Phone 3
              <input value={form.phone3} onChange={(e) => setForm({ ...form, phone3: e.target.value })} />
            </label>
            <label>
              Email
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              INN
              <input value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })} />
            </label>
            <label>
              Address
              <input value={form.address_text} onChange={(e) => setForm({ ...form, address_text: e.target.value })} />
            </label>
            <label>
              Opening hours
              <input value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.supports_pickup}
                onChange={(e) => setForm({ ...form, supports_pickup: e.target.checked })}
              />
              Supports pickup
            </label>
            <label>
              Lat
              <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </label>
            <label>
              Lng
              <input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </label>
          </div>
          <button
            className="primary"
            onClick={async () => {
              setIsLoading(true);
              setError(null);
              try {
                const updated = await client.updateProfile({
                  name: form.name,
                  owner_full_name: form.owner_full_name || null,
                  phone1: form.phone1 || null,
                  phone2: form.phone2 || null,
                  phone3: form.phone3 || null,
                  email: form.email || null,
                  inn: form.inn || null,
                  address_text: form.address_text || null,
                  opening_hours: form.opening_hours || null,
                  supports_pickup: form.supports_pickup,
                  geo: { lat: Number(form.lat), lng: Number(form.lng) },
                });
                setProfile(updated);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save profile");
              } finally {
                setIsLoading(false);
              }
            }}
          >
            Save
          </button>
        </div>
      )}
    </section>
  );
}

function SupportPage() {
  const username = import.meta.env.VITE_SUPPORT_TG_USERNAME as string | undefined;
  const link = username ? `https://t.me/${username}` : "https://t.me/";
  return (
    <section>
      <h1>Support</h1>
      <button className="primary" onClick={() => window.open(link, "_blank")}>
        Open Telegram support
      </button>
    </section>
  );
}

function OrderDetailsPage({ vendorId }: { vendorId: string }) {
  const { orderId } = useParams();
  const [order, setOrder] = useState<VendorOrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !vendorId) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.getOrder(orderId);
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [orderId, vendorId]);

  if (isLoading) {
    return <p>Loading order...</p>;
  }

  if (!vendorId) {
    return (
      <section>
        <Link to="/orders">← Back to orders</Link>
        <p className="error-banner">Set vendor ID to load order details.</p>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section>
        <Link to="/orders">← Back to orders</Link>
        <p className="error-banner">{error ?? "Order not found"}</p>
      </section>
    );
  }

  const canAccept = order.status === "NEW";
  const canCooking = order.status === "ACCEPTED";
  const canReady = order.status === "COOKING";

  return (
    <section>
      <Link to="/orders">← Back to orders</Link>
      <div className="page-header">
        <h1>Order {order.order_id}</h1>
        <div className="inline">
          <button
            className="secondary"
            disabled={!canAccept}
            onClick={async () => {
              if (!orderId) return;
              setActionError(null);
              try {
                await client.acceptOrder(orderId);
                const updated = await client.getOrder(orderId);
                setOrder(updated);
              } catch (err) {
                setActionError(
                  err instanceof Error ? err.message : "Failed to accept order",
                );
              }
            }}
          >
            Accept
          </button>
          <button
            className="secondary"
            disabled={!canCooking}
            onClick={async () => {
              if (!orderId) return;
              setActionError(null);
              try {
                await client.updateOrderStatus(orderId, "COOKING");
                const updated = await client.getOrder(orderId);
                setOrder(updated);
              } catch (err) {
                setActionError(
                  err instanceof Error ? err.message : "Failed to update status",
                );
              }
            }}
          >
            Cooking
          </button>
          <button
            className="primary"
            disabled={!canReady}
            onClick={async () => {
              if (!orderId) return;
              setActionError(null);
              try {
                const response = await client.updateOrderStatus(orderId, "READY");
                setPickupCode(response.pickup_code ?? null);
                const updated = await client.getOrder(orderId);
                setOrder(updated);
              } catch (err) {
                setActionError(
                  err instanceof Error ? err.message : "Failed to update status",
                );
              }
            }}
          >
            Ready
          </button>
        </div>
      </div>

      {actionError && <div className="error-banner">{actionError}</div>}
      {pickupCode && (
        <div className="error-banner">
          Pickup code: <strong>{pickupCode}</strong>
        </div>
      )}

      <div className="details-grid">
        <div>
          <strong>Status</strong>
          <div>{order.status}</div>
        </div>
        <div>
          <strong>Courier</strong>
          <div>{order.courier_id ?? "-"}</div>
        </div>
        <div>
          <strong>Fulfillment</strong>
          <div>{order.fulfillment_type}</div>
        </div>
        <div>
          <strong>Delivery comment</strong>
          <div>{order.delivery_comment ?? "-"}</div>
        </div>
        <div>
          <strong>Vendor comment</strong>
          <div>{order.vendor_comment ?? "-"}</div>
        </div>
        <div>
          <strong>Utensils</strong>
          <div>{order.utensils_count}</div>
        </div>
        <div>
          <strong>Receiver phone</strong>
          <div>{order.receiver_phone ?? "-"}</div>
        </div>
        <div>
          <strong>Payment</strong>
          <div>{order.payment_method ?? "-"}</div>
        </div>
        <div>
          <strong>Change for</strong>
          <div>{order.change_for_amount ?? "-"}</div>
        </div>
        <div>
          <strong>Address</strong>
          <div>{order.address_text ?? "-"}</div>
        </div>
        <div>
          <strong>Entrance / Apt</strong>
          <div>
            {order.address_entrance ?? "-"} / {order.address_apartment ?? "-"}
          </div>
        </div>
      </div>


      <h2>Items</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Menu Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Discount</th>
            <th>Gift</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.menu_item_id}>
              <td>
                <div>{item.title ?? item.menu_item_id}</div>
                {item.weight_value && item.weight_unit && (
                  <div className="muted">
                    {item.weight_value} {item.weight_unit}
                  </div>
                )}
              </td>
              <td>{item.quantity}</td>
              <td>{item.price}</td>
              <td>{item.discount_amount}</td>
              <td>{item.is_gift ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Rating</h2>
      {order.rating ? (
        <div className="details-grid">
          <div>
            <strong>Vendor stars</strong>
            <div>{order.rating.vendor_stars}</div>
          </div>
          <div>
            <strong>Vendor comment</strong>
            <div>{order.rating.vendor_comment ?? "-"}</div>
          </div>
          <div>
            <strong>Courier stars</strong>
            <div>{order.rating.courier_stars ?? "-"}</div>
          </div>
          <div>
            <strong>Courier comment</strong>
            <div>{order.rating.courier_comment ?? "-"}</div>
          </div>
        </div>
      ) : (
        <p>No rating yet.</p>
      )}
    </section>
  );
}

function MenuPage({ vendorId }: { vendorId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    weight_value: "",
    weight_unit: "",
    price: "",
    is_available: true,
    category: "",
    image_url: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!vendorId) {
        setItems([]);
        setIsLoading(false);
        return;
      }
      const data = await client.listMenu();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [vendorId]);

  const handleSave = async () => {
    if (!vendorId) {
      setError("Set vendor ID to manage menu.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price)) {
      setError("Price is required.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let updated: MenuItem;
      if (editingId) {
        updated = await client.updateMenuItem(editingId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          weight_value: form.weight_value ? Number(form.weight_value) : null,
          weight_unit: form.weight_unit.trim() || null,
          price,
          is_available: form.is_available,
          category: form.category.trim() || null,
          image_url: form.image_url.trim() || null,
        });
        setItems(items.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        updated = await client.createMenuItem({
          title: form.title.trim(),
          description: form.description.trim() || null,
          weight_value: form.weight_value ? Number(form.weight_value) : null,
          weight_unit: form.weight_unit.trim() || null,
          price,
          is_available: form.is_available,
          category: form.category.trim() || null,
          image_url: form.image_url.trim() || null,
        });
        setItems([updated, ...items]);
      }
      setEditingId(null);
      setForm({
        title: "",
        description: "",
        weight_value: "",
        weight_unit: "",
        price: "",
        is_available: true,
        category: "",
        image_url: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save menu item");
    } finally {
      setIsLoading(false);
    }
  };

  const formTitle = useMemo(
    () => (editingId ? "Edit menu item" : "New menu item"),
    [editingId],
  );

  return (
    <section>
      <div className="page-header">
        <h1>Menu</h1>
        <button className="secondary" onClick={() => void loadItems()}>
          Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!vendorId && <div className="error-banner">Set vendor ID to manage menu.</div>}

      <div className="panel">
        <h2>{formTitle}</h2>
        <div className="details-grid">
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label>
            Description
            <input
              type="text"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label>
            Weight value
            <input
              type="number"
              value={form.weight_value}
              onChange={(event) => setForm({ ...form, weight_value: event.target.value })}
            />
          </label>
          <label>
            Weight unit
            <input
              type="text"
              value={form.weight_unit}
              onChange={(event) => setForm({ ...form, weight_unit: event.target.value })}
            />
          </label>
          <label>
            Price
            <input
              type="number"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(event) =>
                setForm({ ...form, is_available: event.target.checked })
              }
            />
            Available
          </label>
          <label>
            Category
            <input
              type="text"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          </label>
          <label>
            Image URL
            <input
              type="text"
              value={form.image_url}
              onChange={(event) => setForm({ ...form, image_url: event.target.value })}
            />
          </label>
        </div>
        <div className="inline">
          <button className="primary" onClick={handleSave}>
            {editingId ? "Update item" : "Create item"}
          </button>
          {editingId && (
            <button
              className="secondary"
              onClick={() => {
                  setEditingId(null);
                  setForm({
                    title: "",
                    description: "",
                    weight_value: "",
                    weight_unit: "",
                    price: "",
                    is_available: true,
                    category: "",
                    image_url: "",
                  });
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p>Loading menu...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Weight</th>
              <th>Price</th>
              <th>Available</th>
              <th>Category</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.weight_value ? `${item.weight_value} ${item.weight_unit ?? ""}` : "-"}</td>
                <td>{item.price}</td>
                <td>{item.is_available ? "Yes" : "No"}</td>
                <td>{item.category ?? "-"}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm({
                        title: item.title,
                        description: item.description ?? "",
                        weight_value: item.weight_value ? String(item.weight_value) : "",
                        weight_unit: item.weight_unit ?? "",
                        price: item.price.toString(),
                        is_available: item.is_available,
                        category: item.category ?? "",
                        image_url: item.image_url ?? "",
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="link danger"
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        await client.deleteMenuItem(item.id);
                        setItems(items.filter((row) => row.id !== item.id));
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to delete");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>No menu items yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
