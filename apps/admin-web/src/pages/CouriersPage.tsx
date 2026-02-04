import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiClient, CourierSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function CouriersPage() {
  const [couriers, setCouriers] = useState<CourierSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    courier_id: "",
    full_name: "",
    phone: "",
    telegram_username: "",
    delivery_method: "WALK",
    is_available: true,
    max_active_orders: "1",
  });

  const loadCouriers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listCouriers();
      setCouriers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load couriers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCouriers();
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1>Couriers</h1>
        <button className="secondary" onClick={() => void loadCouriers()}>
          Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>Loading couriers...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Courier ID</th>
              <th>Delivery method</th>
              <th>Phone</th>
              <th>Delivered</th>
              <th>Gross earnings</th>
              <th>Available</th>
              <th>Active status</th>
              <th>Rating</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {couriers.map((entry) => (
              <tr key={entry.courier_id}>
                <td>{entry.courier_id}</td>
                <td>{entry.delivery_method ?? "-"}</td>
                <td>{entry.phone ?? "-"}</td>
                <td>{entry.delivered_count}</td>
                <td>{entry.gross_earnings ?? 0}</td>
                <td>{entry.is_available ? "Yes" : "No"}</td>
                <td>{entry.active_status ?? "-"}</td>
                <td>
                  {entry.rating_avg !== null && entry.rating_count !== null
                    ? `${entry.rating_avg.toFixed(1)} (${entry.rating_count})`
                    : "-"}
                </td>
                <td>
                  <Link to={`/couriers/${entry.courier_id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className="primary" onClick={() => setShowModal(true)}>
        Create courier
      </button>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Create courier</h2>
            <label>
              Courier ID
              <input
                type="text"
                value={form.courier_id}
                onChange={(event) => setForm({ ...form, courier_id: event.target.value })}
              />
            </label>
            <label>
              Full name
              <input
                type="text"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              />
            </label>
            <label>
              Phone
              <input
                type="text"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </label>
            <label>
              Telegram username
              <input
                type="text"
                value={form.telegram_username}
                onChange={(event) => setForm({ ...form, telegram_username: event.target.value })}
              />
            </label>
            <label>
              Delivery method
              <select
                value={form.delivery_method}
                onChange={(event) =>
                  setForm({ ...form, delivery_method: event.target.value })
                }
              >
                <option value="WALK">WALK</option>
                <option value="BIKE">BIKE</option>
                <option value="MOTO">MOTO</option>
                <option value="CAR">CAR</option>
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(event) => setForm({ ...form, is_available: event.target.checked })}
              />
              Available
            </label>
            <label>
              Max active orders
              <input
                type="number"
                value={form.max_active_orders}
                onChange={(event) =>
                  setForm({ ...form, max_active_orders: event.target.value })
                }
              />
            </label>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={async () => {
                  if (!form.courier_id.trim()) {
                    setError("Courier ID is required.");
                    return;
                  }
                  setIsLoading(true);
                  setError(null);
                  try {
                    await client.createCourier({
                      courier_id: form.courier_id.trim(),
                      full_name: form.full_name.trim() || null,
                      phone: form.phone.trim() || null,
                      telegram_username: form.telegram_username.trim() || null,
                      delivery_method: form.delivery_method,
                      is_available: form.is_available,
                      max_active_orders: Number(form.max_active_orders) || 1,
                    });
                    setShowModal(false);
                    setForm({
                      courier_id: "",
                      full_name: "",
                      phone: "",
                      telegram_username: "",
                      delivery_method: "WALK",
                      is_available: true,
                      max_active_orders: "1",
                    });
                    await loadCouriers();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to create courier");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
