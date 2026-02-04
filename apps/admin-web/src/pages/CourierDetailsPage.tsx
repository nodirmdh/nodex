import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiClient, CourierDetails } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function CourierDetailsPage() {
  const { courierId } = useParams();
  const [details, setDetails] = useState<CourierDetails | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    telegram_username: "",
    delivery_method: "",
    is_available: false,
    max_active_orders: "1",
  });
  const [financeRange, setFinanceRange] = useState("week");
  const [finance, setFinance] = useState<{
    completed_count: number;
    gross_earnings: number;
    average_per_order: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!courierId) {
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.getCourier(courierId);
        setDetails(data);
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          telegram_username: data.telegram_username ?? "",
          delivery_method: data.delivery_method ?? "",
          is_available: data.is_available ?? false,
          max_active_orders: data.max_active_orders?.toString() ?? "1",
        });
        const financeData = await client.getCourierFinance(courierId, financeRange);
        setFinance(financeData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load courier");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [courierId, financeRange]);

  if (isLoading) {
    return <p>Loading courier...</p>;
  }

  if (error || !details) {
    return (
      <section>
        <Link to="/couriers">← Back to couriers</Link>
        <p className="error-banner">{error ?? "Courier not found"}</p>
      </section>
    );
  }

  return (
    <section>
      <Link to="/couriers">← Back to couriers</Link>
      <h1>Courier {details.courier_id}</h1>

      <div className="details-grid">
        <div>
          <strong>Full name</strong>
          <input
            type="text"
            value={form.full_name}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
          />
        </div>
        <div>
          <strong>Phone</strong>
          <input
            type="text"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </div>
        <div>
          <strong>Telegram</strong>
          <input
            type="text"
            value={form.telegram_username}
            onChange={(event) =>
              setForm({ ...form, telegram_username: event.target.value })
            }
          />
        </div>
        <div>
          <strong>Delivery method</strong>
          <input
            type="text"
            value={form.delivery_method}
            onChange={(event) =>
              setForm({ ...form, delivery_method: event.target.value })
            }
          />
        </div>
        <div>
          <strong>Availability</strong>
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
          <input
            type="number"
            value={form.max_active_orders}
            onChange={(event) =>
              setForm({ ...form, max_active_orders: event.target.value })
            }
          />
        </div>
        <div>
          <strong>Delivered</strong>
          <div>{details.delivered_count}</div>
        </div>
        <div>
          <strong>Gross earnings</strong>
          <div>{details.gross_earnings}</div>
        </div>
        <div>
          <strong>Average per order</strong>
          <div>{details.average_per_order}</div>
        </div>
        <div>
          <strong>Active status</strong>
          <div>{details.active_status ?? "-"}</div>
        </div>
        <div>
          <strong>Rating</strong>
          <div>
            {details.rating_avg !== null && details.rating_count !== null
              ? `${details.rating_avg.toFixed(1)} (${details.rating_count})`
              : "-"}
          </div>
        </div>
      </div>

      <div className="page-header">
        <button
          className="primary"
          onClick={async () => {
            if (!courierId) return;
            setIsLoading(true);
            setError(null);
            try {
              await client.updateCourier(courierId, {
                full_name: form.full_name.trim() || null,
                phone: form.phone.trim() || null,
                telegram_username: form.telegram_username.trim() || null,
                delivery_method: form.delivery_method.trim() || null,
                is_available: form.is_available,
                max_active_orders: Number(form.max_active_orders) || 1,
              });
              const refreshed = await client.getCourier(courierId);
              setDetails(refreshed);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to update courier");
            } finally {
              setIsLoading(false);
            }
          }}
        >
          Save changes
        </button>
      </div>

      <h2>Finance</h2>
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
            <strong>Completed</strong>
            <div>{finance.completed_count}</div>
          </div>
          <div>
            <strong>Gross earnings</strong>
            <div>{finance.gross_earnings}</div>
          </div>
          <div>
            <strong>Average per order</strong>
            <div>{finance.average_per_order}</div>
          </div>
        </div>
      ) : (
        <p>No finance data.</p>
      )}

      <h2>Orders</h2>
      {details.orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Vendor</th>
              <th>Fulfillment</th>
              <th>Total</th>
              <th>Delivery fee</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {details.orders.map((order) => (
              <tr key={order.order_id}>
                <td>{order.order_id}</td>
                <td>{order.status}</td>
                <td>{order.vendor_id}</td>
                <td>{order.fulfillment_type}</td>
                <td>{order.total}</td>
                <td>{order.delivery_fee ?? "-"}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Ratings</h2>
      {details.ratings.length === 0 ? (
        <p>No ratings yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Stars</th>
              <th>Comment</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {details.ratings.map((rating) => (
              <tr key={rating.order_id}>
                <td>{rating.order_id}</td>
                <td>{rating.courier_stars ?? "-"}</td>
                <td>{rating.courier_comment ?? "-"}</td>
                <td>{new Date(rating.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
