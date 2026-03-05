import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Input, PageShell, Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@nodex/ui";
import { formatNumber } from "@nodex/i18n";
import { ApiClient, PromotionSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function PromotionsPage() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("errors.loadPromotions"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPromotions();
  }, []);

  return (
    <PageShell
      title={t("admin.promotions.title")}
      subtitle={t("admin.promotions.subtitle")}
      actions={
        <Button variant="secondary" onClick={() => void loadPromotions()}>
          {t("common.refresh")}
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          type="text"
          value={vendorId}
          onChange={(event) => setVendorId(event.target.value)}
          placeholder={t("admin.promotions.vendorPlaceholder")}
        />
        <Button onClick={() => void loadPromotions()}>
          {t("admin.promotions.applyFilters")}
        </Button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>{t("admin.promotions.loading")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("fields.id")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.promotions.table.vendor")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.type")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.promotions.table.value")}</TableHeaderCell>
              <TableHeaderCell>{t("promo.priority")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.active")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.promotions.table.items")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <tbody>
            {promotions.map((promo) => (
              <TableRow key={promo.promotion_id}>
                <TableCell>{promo.promotion_id}</TableCell>
                <TableCell>{promo.vendor_id}</TableCell>
                <TableCell>{promo.promo_type}</TableCell>
                <TableCell>{formatNumber(promo.value_numeric ?? 0)}</TableCell>
                <TableCell>{formatNumber(promo.priority ?? 0)}</TableCell>
                <TableCell>{promo.is_active ? t("common.yes") : t("common.no")}</TableCell>
                <TableCell>{promo.items?.join(", ") || "-"}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </PageShell>
  );
}
