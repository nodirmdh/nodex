import { useEffect, useState } from "react";

import { ApiClient, PromotionSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionSummary[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPromotions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listPromotions(vendorId || undefined);
      setPromotions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promotions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPromotions();
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1>Promotions</h1>
        <button className="secondary" onClick={() => void loadPromotions()}>
          Refresh
        </button>
      </div>

      <div className="filters">
        <label>
          Vendor ID
          <input
            type="text"
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            placeholder="vendor uuid"
          />
        </label>
        <button className="primary" onClick={() => void loadPromotions()}>
          Apply filters
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>Loading promotions…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vendor</th>
              <th>Type</th>
              <th>Value</th>
              <th>Priority</th>
              <th>Active</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => (
              <tr key={promo.promotion_id}>
                <td>{promo.promotion_id}</td>
                <td>{promo.vendor_id}</td>
                <td>{promo.promo_type}</td>
                <td>{promo.value_numeric}</td>
                <td>{promo.priority ?? 0}</td>
                <td>{promo.is_active ? "Yes" : "No"}</td>
                <td>{promo.items?.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
