import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, PageShell, Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@nodex/ui";
import { formatDateTime, formatNumber } from "@nodex/i18n";
import { ApiClient, ClientSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function ClientsPage() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("admin.clients.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  return (
    <PageShell
      title={t("admin.clients.title")}
      subtitle={t("admin.clients.subtitle")}
      actions={
        <Button variant="secondary" onClick={() => void loadClients()}>
          {t("common.refresh")}
        </Button>
      }
    >
      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>{t("admin.clients.loading")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("admin.clients.table.clientId")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.clients.table.name")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.clients.table.phone")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.clients.table.telegram")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.clients.table.orders")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.clients.table.totalSpent")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.clients.table.savedPromo")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.clients.table.usedPromo")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.clients.table.created")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <tbody>
            {clients.map((entry) => (
              <TableRow key={entry.client_id}>
                <TableCell>{entry.client_id}</TableCell>
                <TableCell>{entry.full_name ?? "-"}</TableCell>
                <TableCell>{entry.phone ?? "-"}</TableCell>
                <TableCell>{entry.telegram_username ?? "-"}</TableCell>
                <TableCell>{formatNumber(entry.orders_count)}</TableCell>
                <TableCell>{formatNumber(entry.total_spent)}</TableCell>
                <TableCell>{formatNumber(entry.saved_promo_codes)}</TableCell>
                <TableCell>{formatNumber(entry.used_promo_codes ?? 0)}</TableCell>
                <TableCell>{entry.created_at ? formatDateTime(entry.created_at) : "-"}</TableCell>
                <TableCell>
                  <Link to={`/clients/${entry.client_id}`}>{t("common.view")}</Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </PageShell>
  );
}
