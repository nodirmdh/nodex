import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiClient, ClientSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listClients();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1>Clients</h1>
        <button className="secondary" onClick={() => void loadClients()}>
          Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>Loading clients...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Client ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Telegram</th>
              <th>Orders</th>
              <th>Total spent</th>
              <th>Promo codes</th>
              <th>Used</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clients.map((entry) => (
              <tr key={entry.client_id}>
                <td>{entry.client_id}</td>
                <td>{entry.full_name ?? "-"}</td>
                <td>{entry.phone ?? "-"}</td>
                <td>{entry.telegram_username ?? "-"}</td>
                <td>{entry.orders_count}</td>
                <td>{entry.total_spent}</td>
                <td>{entry.saved_promo_codes}</td>
                <td>{entry.used_promo_codes ?? 0}</td>
                <td>{entry.created_at ? new Date(entry.created_at).toLocaleString() : "-"}</td>
                <td>
                  <Link to={`/clients/${entry.client_id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
