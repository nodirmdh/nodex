import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiClient, OrderDetails } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function OrderDetailsPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
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
  }, [orderId]);

  if (isLoading) {
    return <p>Loading order…</p>;
  }

  if (error || !order) {
    return (
      <section>
        <Link to="/orders">← Back to orders</Link>
        <p className="error-banner">{error ?? "Order not found"}</p>
      </section>
    );
  }

  return (
    <section>
      <Link to="/orders">← Back to orders</Link>
      <h1>Order {order.order_id}</h1>
      <div className="details-grid">
        <div>
          <strong>Status</strong>
          <div>{order.status}</div>
        </div>
        <div>
          <strong>Vendor</strong>
          <div>{order.vendor_id}</div>
        </div>
        <div>
          <strong>Client</strong>
          <div>{order.client_id ?? "-"}</div>
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
              <td>{item.menu_item_id}</td>
              <td>{item.quantity}</td>
              <td>{item.price}</td>
              <td>{item.discount_amount}</td>
              <td>{item.is_gift ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary-grid">
        <div>
          <strong>Subtotal</strong>
          <div>{order.items_subtotal}</div>
        </div>
        <div>
          <strong>Discount</strong>
          <div>{order.discount_total}</div>
        </div>
        <div>
          <strong>Service fee</strong>
          <div>{order.service_fee}</div>
        </div>
        <div>
          <strong>Delivery fee</strong>
          <div>{order.delivery_fee}</div>
        </div>
        <div>
          <strong>Total</strong>
          <div>{order.total}</div>
        </div>
      </div>

      <h2>Status timeline</h2>
      {order.events.length === 0 ? (
        <p>No events recorded.</p>
      ) : (
        <ul className="event-list">
          {order.events.map((event, index) => (
            <li key={`${event.event_type}-${index}`}>
              <span>{new Date(event.created_at).toLocaleString()}</span>
              <span>{event.event_type}</span>
            </li>
          ))}
        </ul>
      )}

      <h2>Tracking history</h2>
      {order.tracking.length === 0 ? (
        <p>No tracking updates.</p>
      ) : (
        <ul className="event-list">
          {order.tracking.map((entry, index) => (
            <li key={`${entry.courier_id}-${index}`}>
              <span>{new Date(entry.created_at).toLocaleString()}</span>
              <span>
                {entry.location.lat}, {entry.location.lng}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
