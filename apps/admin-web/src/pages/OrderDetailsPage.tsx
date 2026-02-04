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
  const [statusInput, setStatusInput] = useState("");
  const [deliveryComment, setDeliveryComment] = useState("");
  const [vendorComment, setVendorComment] = useState("");
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
        setStatusInput(data.status);
        setDeliveryComment(data.delivery_comment ?? "");
        setVendorComment(data.vendor_comment ?? "");
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
      <div className="page-header">
        <div className="inline">
          <input
            type="text"
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
            placeholder="Status"
          />
          <button
            className="primary"
            onClick={async () => {
              if (!orderId) return;
              setIsLoading(true);
              setError(null);
              try {
                const updated = await client.updateOrder(orderId, {
                  status: statusInput || undefined,
                  delivery_comment: deliveryComment,
                  vendor_comment: vendorComment,
                });
                const refreshed = await client.getOrder(orderId);
                setOrder(refreshed);
                setStatusInput(updated.status);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update order");
              } finally {
                setIsLoading(false);
              }
            }}
          >
            Update
          </button>
          <button
            className="secondary"
            onClick={async () => {
              if (!orderId) return;
              setIsLoading(true);
              setError(null);
              try {
                await client.cancelOrder(orderId, "admin_cancel");
                const refreshed = await client.getOrder(orderId);
                setOrder(refreshed);
                setStatusInput(refreshed.status);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to cancel order");
              } finally {
                setIsLoading(false);
              }
            }}
          >
            Cancel order
          </button>
        </div>
      </div>
      <div className="details-grid">
        <div>
          <strong>Status</strong>
          <div>{order.status}</div>
        </div>
        <div>
          <strong>Vendor</strong>
          <div>{order.vendor_name ?? order.vendor_id}</div>
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
          <div>
            <textarea
              className="input"
              value={deliveryComment}
              onChange={(event) => setDeliveryComment(event.target.value)}
            />
          </div>
        </div>
        <div>
          <strong>Vendor comment</strong>
          <div>
            <textarea
              className="input"
              value={vendorComment}
              onChange={(event) => setVendorComment(event.target.value)}
            />
          </div>
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
        <div>
          <strong>Promo code</strong>
          <div>{order.promo_code ?? "-"}</div>
        </div>
        <div>
          <strong>Promo discount</strong>
          <div>{order.promo_code_discount ?? 0}</div>
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
          <strong>Promo code discount</strong>
          <div>{order.promo_code_discount ?? 0}</div>
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
