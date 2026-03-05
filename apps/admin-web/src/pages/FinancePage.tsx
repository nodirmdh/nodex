import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, PageShell, Select, Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@nodex/ui";
import { formatNumber } from "@nodex/i18n";
import { ApiClient, FinanceSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function FinancePage() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("admin.finance.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [range]);

  return (
    <PageShell
      title={t("admin.finance.title")}
      subtitle={t("admin.finance.subtitle")}
      actions={
        <div className="inline flex items-center gap-2">
          <Select value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="week">{t("admin.finance.lastWeek")}</option>
            <option value="month">{t("admin.finance.lastMonth")}</option>
          </Select>
          <Button variant="secondary" onClick={() => void load()}>
            {t("common.refresh")}
          </Button>
        </div>
      }
    >
      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>{t("admin.finance.loading")}</p>
      ) : summary ? (
        <>
          <div className="details-grid">
            <div>
              <strong>{t("admin.finance.gmv")}</strong>
              <div>{formatNumber(summary.gmv)}</div>
            </div>
            <div>
              <strong>{t("admin.finance.grossRevenue")}</strong>
              <div>{formatNumber(summary.gross_revenue)}</div>
            </div>
            <div>
              <strong>{t("admin.finance.serviceFees")}</strong>
              <div>{formatNumber(summary.service_fee_total)}</div>
            </div>
            <div>
              <strong>{t("admin.finance.deliveryFees")}</strong>
              <div>{formatNumber(summary.delivery_fee_total)}</div>
            </div>
            <div>
              <strong>{t("admin.finance.promoDiscounts")}</strong>
              <div>{formatNumber(summary.promo_discounts_total)}</div>
            </div>
            <div>
              <strong>{t("admin.finance.platformIncome")}</strong>
              <div>{formatNumber(summary.platform_income)}</div>
            </div>
            <div>
              <strong>{t("admin.finance.vendorPayouts")}</strong>
              <div>{formatNumber(summary.vendor_payouts)}</div>
            </div>
            <div>
              <strong>{t("admin.finance.completedOrders")}</strong>
              <div>{formatNumber(summary.completed_count)}</div>
            </div>
          </div>

          <h2>{t("admin.finance.byVendor")}</h2>
          {summary.by_vendor && summary.by_vendor.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("admin.finance.vendor")}</TableHeaderCell>
                  <TableHeaderCell>{t("admin.finance.gmv")}</TableHeaderCell>
                  <TableHeaderCell>{t("admin.finance.orders")}</TableHeaderCell>
                  <TableHeaderCell>{t("admin.finance.platformIncome")}</TableHeaderCell>
                  <TableHeaderCell>{t("admin.finance.vendorOwes")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <tbody>
                {summary.by_vendor.map((row) => (
                  <TableRow key={row.vendor_id}>
                    <TableCell>{row.vendor_name}</TableCell>
                    <TableCell>{formatNumber(row.gmv)}</TableCell>
                    <TableCell>{formatNumber(row.completed_count)}</TableCell>
                    <TableCell>{formatNumber(row.platform_income)}</TableCell>
                    <TableCell>{formatNumber(row.vendor_owes)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>{t("admin.finance.empty")}</p>
          )}
        </>
      ) : (
        <p>{t("admin.finance.empty")}</p>
      )}
    </PageShell>
  );
}
