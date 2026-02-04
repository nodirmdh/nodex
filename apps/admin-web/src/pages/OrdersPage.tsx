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
    order_id: "",
    status: "",
    vendor_id: "",
    vendor_name: "",
    client_id: "",
    receiver_phone: "",
    fulfillment_type: "",
    from: "",
    to: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listOrders({
        order_id: filters.order_id || undefined,
        status: filters.status || undefined,
        vendor_id: filters.vendor_id || undefined,
        vendor_name: filters.vendor_name || undefined,
        client_id: filters.client_id || undefined,
        receiver_phone: filters.receiver_phone || undefined,
        fulfillment_type: filters.fulfillment_type || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
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
          Order ID
          <input
            type="text"
            value={filters.order_id}
            onChange={(event) => setFilters({ ...filters, order_id: event.target.value })}
            placeholder="order uuid"
          />
        </label>
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
          Vendor name
          <input
            type="text"
            value={filters.vendor_name}
            onChange={(event) => setFilters({ ...filters, vendor_name: event.target.value })}
            placeholder="Vendor name"
          />
        </label>
        <label>
          Client ID
          <input
            type="text"
            value={filters.client_id}
            onChange={(event) => setFilters({ ...filters, client_id: event.target.value })}
            placeholder="client id"
          />
        </label>
        <label>
          Receiver phone
          <input
            type="text"
            value={filters.receiver_phone}
            onChange={(event) =>
              setFilters({ ...filters, receiver_phone: event.target.value })
            }
            placeholder="+998..."
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
        <label>
          From (ISO)
          <input
            type="text"
            value={filters.from}
            onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            placeholder="2026-02-01"
          />
        </label>
        <label>
          To (ISO)
          <input
            type="text"
            value={filters.to}
            onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            placeholder="2026-02-05"
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
                <td>{order.vendor_name ?? order.vendor_id}</td>
                <td>{order.fulfillment_type}</td>
                <td>{order.total}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
                <td>
                  <Link to={`/orders/${order.order_id}`}>View</Link>
                  {order.vendor_id && (
                    <span className="inline">
                      <Link to={`/vendors/${order.vendor_id}`}>Vendor</Link>
                    </span>
                  )}
                  {order.client_id && (
                    <span className="inline">
                      <Link to={`/clients/${order.client_id}`}>Client</Link>
                    </span>
                  )}
                  {order.courier_id && (
                    <span className="inline">
                      <Link to={`/couriers/${order.courier_id}`}>Courier</Link>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
