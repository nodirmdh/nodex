import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiClient, OrderSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    vendor_id: "",
    fulfillment_type: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listOrders({
        status: filters.status || undefined,
        vendor_id: filters.vendor_id || undefined,
        fulfillment_type: filters.fulfillment_type || undefined,
      });
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1>Orders</h1>
        <button className="secondary" onClick={() => void loadOrders()}>
          Refresh
        </button>
      </div>

      <div className="filters">
        <label>
          Status
          <input
            type="text"
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            placeholder="READY, DELIVERED…"
          />
        </label>
        <label>
          Vendor ID
          <input
            type="text"
            value={filters.vendor_id}
            onChange={(event) => setFilters({ ...filters, vendor_id: event.target.value })}
            placeholder="vendor uuid"
          />
        </label>
        <label>
          Fulfillment
          <input
            type="text"
            value={filters.fulfillment_type}
            onChange={(event) =>
              setFilters({ ...filters, fulfillment_type: event.target.value })
            }
            placeholder="DELIVERY / PICKUP"
          />
        </label>
        <button className="primary" onClick={() => void loadOrders()}>
          Apply filters
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>Loading orders…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Vendor</th>
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
                <td>{order.vendor_id}</td>
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
