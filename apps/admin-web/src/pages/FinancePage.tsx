import { useEffect, useState } from "react";

import { ApiClient, FinanceSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function FinancePage() {
  const [range, setRange] = useState("week");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.getFinance(range);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [range]);

  return (
    <section>
      <div className="page-header">
        <h1>Finance</h1>
        <div className="inline">
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
          <button className="secondary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>Loading finance...</p>
      ) : summary ? (
        <>
          <div className="details-grid">
            <div>
              <strong>GMV</strong>
              <div>{summary.gmv}</div>
            </div>
            <div>
              <strong>Gross revenue</strong>
              <div>{summary.gross_revenue}</div>
            </div>
            <div>
              <strong>Service fees</strong>
              <div>{summary.service_fee_total}</div>
            </div>
            <div>
              <strong>Delivery fees</strong>
              <div>{summary.delivery_fee_total}</div>
            </div>
            <div>
              <strong>Promo discounts</strong>
              <div>{summary.promo_discounts_total}</div>
            </div>
            <div>
              <strong>Platform income</strong>
              <div>{summary.platform_income}</div>
            </div>
            <div>
              <strong>Vendor payouts</strong>
              <div>{summary.vendor_payouts}</div>
            </div>
            <div>
              <strong>Completed orders</strong>
              <div>{summary.completed_count}</div>
            </div>
          </div>

          <h2>By vendor</h2>
          {summary.by_vendor && summary.by_vendor.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>GMV</th>
                  <th>Orders</th>
                  <th>Platform income</th>
                  <th>Vendor owes</th>
                </tr>
              </thead>
              <tbody>
                {summary.by_vendor.map((row) => (
                  <tr key={row.vendor_id}>
                    <td>{row.vendor_name}</td>
                    <td>{row.gmv}</td>
                    <td>{row.completed_count}</td>
                    <td>{row.platform_income}</td>
                    <td>{row.vendor_owes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No finance data yet.</p>
          )}
        </>
      ) : (
        <p>No finance data.</p>
      )}
    </section>
  );
}
