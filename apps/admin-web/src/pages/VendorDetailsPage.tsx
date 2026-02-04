import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ApiClient,
  FinanceSummary,
  MenuItem,
  OrderSummary,
  Vendor,
  VendorDashboard,
  VendorReview,
} from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function VendorDetailsPage() {
  const { vendorId } = useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dashboard, setDashboard] = useState<VendorDashboard | null>(null);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [promotions, setPromotions] = useState<
    Array<{
      promotion_id: string;
      promo_type: string;
      value_numeric: number;
      priority?: number;
      is_active: boolean;
      starts_at: string | null;
      ends_at: string | null;
    }>
  >([]);
  const [menuForm, setMenuForm] = useState({
    title: "",
    description: "",
    price: "",
    is_available: true,
    category: "",
    image_url: "",
  });
  const [menuEditingId, setMenuEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "menu" | "promotions" | "finance" | "reviews"
  >("overview");
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [financeRange, setFinanceRange] = useState("week");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    owner_full_name: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    inn: "",
    category: "RESTAURANTS",
    supports_pickup: false,
    address_text: "",
    is_active: true,
    opening_hours: "",
    payout_details: "",
    lat: "",
    lng: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) {
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [
          vendorData,
          ordersData,
          dashboardData,
          reviewsData,
          promotionsData,
          financeData,
        ] = await Promise.all([
          client.getVendor(vendorId),
          client.listOrders({ vendor_id: vendorId }),
          client.getVendorDashboard(vendorId),
          client.getVendorReviews(vendorId),
          client.getVendorPromotions(vendorId),
          client.getVendorFinance(vendorId, financeRange),
        ]);
        const itemsData = await client.listMenuItems(vendorId);
        setVendor(vendorData);
        setOrders(ordersData);
        setMenuItems(itemsData);
        setDashboard(dashboardData);
        setReviews(reviewsData);
        setPromotions(promotionsData);
        setFinance(financeData);
        setForm({
          name: vendorData.name,
          owner_full_name: vendorData.owner_full_name ?? "",
          phone1: vendorData.phone1 ?? vendorData.phone ?? "",
          phone2: vendorData.phone2 ?? "",
          phone3: vendorData.phone3 ?? "",
          email: vendorData.email ?? "",
          inn: vendorData.inn ?? "",
          category: vendorData.category,
          supports_pickup: vendorData.supports_pickup,
          address_text: vendorData.address_text ?? "",
          is_active: vendorData.is_active,
          opening_hours: vendorData.opening_hours ?? "",
          payout_details: vendorData.payout_details
            ? JSON.stringify(vendorData.payout_details, null, 2)
            : "",
          lat: vendorData.geo.lat.toString(),
          lng: vendorData.geo.lng.toString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load vendor");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [vendorId, financeRange]);

  const handleSave = async () => {
    if (!vendorId) {
      return;
    }
    if (!form.name.trim()) {
      setError("Vendor name is required.");
      return;
    }
    if (form.payout_details.trim()) {
      try {
        JSON.parse(form.payout_details);
      } catch {
        setError("Payout details must be valid JSON.");
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        owner_full_name: form.owner_full_name.trim() || null,
        phone1: form.phone1.trim() || null,
        phone2: form.phone2.trim() || null,
        phone3: form.phone3.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone1.trim() || null,
        inn: form.inn.trim() || null,
        category: form.category,
        supports_pickup: form.supports_pickup,
        address_text: form.address_text.trim() || null,
        is_active: form.is_active,
        opening_hours: form.opening_hours.trim() || null,
        payout_details: form.payout_details.trim()
          ? JSON.parse(form.payout_details)
          : null,
        geo: {
          lat: Number(form.lat),
          lng: Number(form.lng),
        },
      };
      const updated = await client.updateVendor(vendorId, payload);
      setVendor(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vendor");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <p>Loading vendor...</p>;
  }

  if (error || !vendor) {
    return (
      <section>
        <Link to="/vendors">← Back to vendors</Link>
        <p className="error-banner">{error ?? "Vendor not found"}</p>
      </section>
    );
  }

  return (
    <section>
      <Link to="/vendors">← Back to vendors</Link>
      <div className="page-header">
        <h1>{vendor.name}</h1>
        <button className="primary" onClick={handleSave}>
          Save changes
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          Orders
        </button>
        <button
          className={activeTab === "menu" ? "active" : ""}
          onClick={() => setActiveTab("menu")}
        >
          Menu
        </button>
        <button
          className={activeTab === "promotions" ? "active" : ""}
          onClick={() => setActiveTab("promotions")}
        >
          Promotions
        </button>
        <button
          className={activeTab === "finance" ? "active" : ""}
          onClick={() => setActiveTab("finance")}
        >
          Finance
        </button>
        <button
          className={activeTab === "reviews" ? "active" : ""}
          onClick={() => setActiveTab("reviews")}
        >
          Reviews
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="details-grid">
            <label>
              Name
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              Owner full name
              <input
                type="text"
                value={form.owner_full_name}
                onChange={(event) => setForm({ ...form, owner_full_name: event.target.value })}
              />
            </label>
            <label>
              Phone 1
              <input
                type="text"
                value={form.phone1}
                onChange={(event) => setForm({ ...form, phone1: event.target.value })}
              />
            </label>
            <label>
              Phone 2
              <input
                type="text"
                value={form.phone2}
                onChange={(event) => setForm({ ...form, phone2: event.target.value })}
              />
            </label>
            <label>
              Phone 3
              <input
                type="text"
                value={form.phone3}
                onChange={(event) => setForm({ ...form, phone3: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="text"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              INN
              <input
                type="text"
                value={form.inn}
                onChange={(event) => setForm({ ...form, inn: event.target.value })}
              />
            </label>
            <label>
              Category
              <input
                type="text"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
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
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.supports_pickup}
                onChange={(event) =>
                  setForm({ ...form, supports_pickup: event.target.checked })
                }
              />
              Supports pickup
            </label>
            <label>
              Address
              <input
                type="text"
                value={form.address_text}
                onChange={(event) => setForm({ ...form, address_text: event.target.value })}
              />
            </label>
            <label>
              Opening hours
              <input
                type="text"
                value={form.opening_hours}
                onChange={(event) =>
                  setForm({ ...form, opening_hours: event.target.value })
                }
              />
            </label>
            <label>
              Latitude
              <input
                type="number"
                value={form.lat}
                onChange={(event) => setForm({ ...form, lat: event.target.value })}
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                value={form.lng}
                onChange={(event) => setForm({ ...form, lng: event.target.value })}
              />
            </label>
          </div>

          <label>
            Payout details (JSON)
            <textarea
              rows={6}
              value={form.payout_details}
              onChange={(event) =>
                setForm({ ...form, payout_details: event.target.value })
              }
            />
          </label>

          <h2>Weekly dashboard</h2>
          {dashboard ? (
            <div className="details-grid">
              <div>
                <strong>Revenue</strong>
                <div>{dashboard.revenue}</div>
              </div>
              <div>
                <strong>Completed</strong>
                <div>{dashboard.completed_count}</div>
              </div>
              <div>
                <strong>Average check</strong>
                <div>{dashboard.average_check}</div>
              </div>
              <div>
                <strong>Rating</strong>
                <div>
                  {dashboard.rating_avg.toFixed(1)} ({dashboard.rating_count})
                </div>
              </div>
              <div>
                <strong>Vendor owes</strong>
                <div>{dashboard.vendor_owes}</div>
              </div>
            </div>
          ) : (
            <p>No dashboard data.</p>
          )}

        </>
      )}

      {activeTab === "orders" && (
        <>
          <div className="filters">
            <label>
              Status
              <input
                type="text"
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value)}
                placeholder="NEW, READY..."
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                if (!vendorId) return;
                setIsLoading(true);
                setError(null);
                try {
                  const data = await client.listOrders({
                    vendor_id: vendorId,
                    status: orderStatusFilter || undefined,
                  });
                  setOrders(data);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to load orders");
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              Apply
            </button>
          </div>

          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>{order.order_id}</td>
                    <td>{order.status}</td>
                    <td>{order.total}</td>
                    <td>{new Date(order.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "promotions" && (
        <>
          {promotions.length === 0 ? (
            <p>No promotions.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Priority</th>
                  <th>Active</th>
                  <th>Starts</th>
                  <th>Ends</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr key={promo.promotion_id}>
                    <td>{promo.promo_type}</td>
                    <td>{promo.value_numeric}</td>
                    <td>{promo.priority ?? 0}</td>
                    <td>{promo.is_active ? "Yes" : "No"}</td>
                    <td>{promo.starts_at ? new Date(promo.starts_at).toLocaleString() : "-"}</td>
                    <td>{promo.ends_at ? new Date(promo.ends_at).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "finance" && (
        <>
          <div className="inline">
            <select
              value={financeRange}
              onChange={(event) => setFinanceRange(event.target.value)}
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </div>
          {finance ? (
            <div className="details-grid">
              <div>
                <strong>GMV</strong>
                <div>{finance.gmv}</div>
              </div>
              <div>
                <strong>Gross revenue</strong>
                <div>{finance.gross_revenue}</div>
              </div>
              <div>
                <strong>Service fees</strong>
                <div>{finance.service_fee_total}</div>
              </div>
              <div>
                <strong>Promo discounts</strong>
                <div>{finance.promo_discounts_total}</div>
              </div>
              <div>
                <strong>Vendor owes</strong>
                <div>{finance.vendor_owes}</div>
              </div>
            </div>
          ) : (
            <p>No finance data.</p>
          )}
        </>
      )}

      {activeTab === "reviews" && (
        <>
          {reviews.length === 0 ? (
            <p>No reviews.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Vendor stars</th>
                  <th>Vendor comment</th>
                  <th>Courier stars</th>
                  <th>Courier comment</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.order_id}>
                    <td>{review.order_id}</td>
                    <td>{review.vendor_stars}</td>
                    <td>{review.vendor_comment ?? "-"}</td>
                    <td>{review.courier_stars ?? "-"}</td>
                    <td>{review.courier_comment ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "menu" && (
        <>
          <div className="details-grid">
            <label>
              Title
              <input
                type="text"
                value={menuForm.title}
                onChange={(event) => setMenuForm({ ...menuForm, title: event.target.value })}
              />
            </label>
            <label>
              Description
              <input
                type="text"
                value={menuForm.description}
                onChange={(event) =>
                  setMenuForm({ ...menuForm, description: event.target.value })
                }
              />
            </label>
            <label>
              Price
              <input
                type="number"
                value={menuForm.price}
                onChange={(event) => setMenuForm({ ...menuForm, price: event.target.value })}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={menuForm.is_available}
                onChange={(event) =>
                  setMenuForm({ ...menuForm, is_available: event.target.checked })
                }
              />
              Available
            </label>
            <label>
              Category
              <input
                type="text"
                value={menuForm.category}
                onChange={(event) =>
                  setMenuForm({ ...menuForm, category: event.target.value })
                }
              />
            </label>
            <label>
              Image URL
              <input
                type="text"
                value={menuForm.image_url}
                onChange={(event) =>
                  setMenuForm({ ...menuForm, image_url: event.target.value })
                }
              />
            </label>
          </div>
          <div className="page-header">
            <button
              className="primary"
              onClick={async () => {
                if (!vendorId) {
                  return;
                }
                if (!menuForm.title.trim()) {
                  setError("Menu item title is required.");
                  return;
                }
                const price = Number(menuForm.price);
                if (!Number.isFinite(price)) {
                  setError("Menu item price is required.");
                  return;
                }
                setIsLoading(true);
                try {
                  let updatedItems: MenuItem[];
                  if (menuEditingId) {
                    const updated = await client.updateMenuItem(menuEditingId, {
                      title: menuForm.title.trim(),
                      description: menuForm.description.trim() || null,
                      price,
                      is_available: menuForm.is_available,
                      category: menuForm.category.trim() || null,
                      image_url: menuForm.image_url.trim() || null,
                    });
                    updatedItems = menuItems.map((item) =>
                      item.id === updated.id ? updated : item,
                    );
                  } else {
                    const created = await client.createMenuItem({
                      vendor_id: vendorId,
                      title: menuForm.title.trim(),
                      description: menuForm.description.trim() || null,
                      price,
                      is_available: menuForm.is_available,
                      category: menuForm.category.trim() || null,
                      image_url: menuForm.image_url.trim() || null,
                    });
                    updatedItems = [created, ...menuItems];
                  }
                  setMenuItems(updatedItems);
                  setMenuEditingId(null);
                  setMenuForm({
                    title: "",
                    description: "",
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
              }}
            >
              {menuEditingId ? "Update item" : "Add item"}
            </button>
            {menuEditingId && (
              <button
                className="secondary"
                onClick={() => {
                  setMenuEditingId(null);
                  setMenuForm({
                    title: "",
                    description: "",
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
          {menuItems.length === 0 ? (
            <p>No menu items yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Available</th>
                  <th>Category</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.price}</td>
                    <td>{item.is_available ? "Yes" : "No"}</td>
                    <td>{item.category ?? "-"}</td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => {
                          setMenuEditingId(item.id);
                          setMenuForm({
                            title: item.title,
                            description: item.description ?? "",
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
                            setMenuItems(menuItems.filter((row) => row.id !== item.id));
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Failed to delete item",
                            );
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
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
