import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiClient, ClientDetails } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function ClientDetailsPage() {
  const { clientId } = useParams();
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "orders" | "promo" | "ratings">("profile");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.getClient(clientId);
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load client");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [clientId]);

  if (isLoading) {
    return <p>Loading client...</p>;
  }

  if (error || !details) {
    return (
      <section>
        <Link to="/clients">← Back to clients</Link>
        <p className="error-banner">{error ?? "Client not found"}</p>
      </section>
    );
  }

  return (
    <section>
      <Link to="/clients">← Back to clients</Link>
      <h1>Client {details.client_id}</h1>

      <div className="tabs">
        {(["profile", "addresses", "orders", "promo", "ratings"] as const).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <>
          {details.profile ? (
            <div className="details-grid">
              <div>
                <strong>Name</strong>
                <div>{details.profile.full_name ?? "-"}</div>
              </div>
              <div>
                <strong>Phone</strong>
                <div>{details.profile.phone ?? "-"}</div>
              </div>
              <div>
                <strong>Telegram</strong>
                <div>{details.profile.telegram_username ?? "-"}</div>
              </div>
              <div>
                <strong>About</strong>
                <div>{details.profile.about ?? "-"}</div>
              </div>
            </div>
          ) : (
            <p>No profile data.</p>
          )}
        </>
      )}

      {activeTab === "addresses" && (
        <>
          {details.addresses.length === 0 ? (
            <p>No saved addresses.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Address</th>
                  <th>Entrance</th>
                  <th>Apartment</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {details.addresses.map((address) => (
                  <tr key={address.id}>
                    <td>{address.type}</td>
                    <td>{address.address_text}</td>
                    <td>{address.entrance ?? "-"}</td>
                    <td>{address.apartment ?? "-"}</td>
                    <td>{new Date(address.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "orders" && (
        <>
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
                    <td>{new Date(order.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "promo" && (
        <>
          {details.promo_codes.length === 0 ? (
            <p>No saved promo codes.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Active</th>
                  <th>Status</th>
                  <th>Used</th>
                </tr>
              </thead>
              <tbody>
                {details.promo_codes.map((promo) => (
                  <tr key={promo.id}>
                    <td>{promo.code}</td>
                    <td>{promo.type}</td>
                    <td>{promo.value}</td>
                    <td>{promo.is_active ? "Yes" : "No"}</td>
                    <td>{promo.status ?? "-"}</td>
                    <td>{promo.used ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "ratings" && (
        <>
          {details.ratings.length === 0 ? (
            <p>No ratings yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Vendor Stars</th>
                  <th>Vendor Comment</th>
                  <th>Courier Stars</th>
                  <th>Courier Comment</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {details.ratings.map((rating) => (
                  <tr key={rating.order_id}>
                    <td>{rating.order_id}</td>
                    <td>{rating.vendor_stars}</td>
                    <td>{rating.vendor_comment ?? "-"}</td>
                    <td>{rating.courier_stars ?? "-"}</td>
                    <td>{rating.courier_comment ?? "-"}</td>
                    <td>{new Date(rating.created_at).toLocaleString()}</td>
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
