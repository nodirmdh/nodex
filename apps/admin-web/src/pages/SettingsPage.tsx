import { useTranslation } from "react-i18next";

import { PageShell } from "@nodex/ui";

export function SettingsPage() {
  const { t } = useTranslation();
  const devMode = import.meta.env.VITE_DEV_MODE === "true" || import.meta.env.VITE_DEV_MODE === "1";

  return (
    <PageShell title={t("admin.settings.title")} subtitle={t("admin.settings.subtitle")}>
      <h2>{t("admin.settings.financeConstants")}</h2>
      <div className="details-grid">
        <div>
          <strong>{t("admin.settings.serviceFee")}</strong>
          <div>3000</div>
        </div>
        <div>
          <strong>{t("admin.settings.deliveryFee")}</strong>
          <div>{t("admin.settings.deliveryFormula")}</div>
        </div>
      </div>

      <h2>{t("admin.settings.environment")}</h2>
      <div className="details-grid">
        <div>
          <strong>DEV_MODE</strong>
          <div>{devMode ? t("admin.settings.devOn") : t("admin.settings.devOff")}</div>
        </div>
      </div>
    </PageShell>
  );
}
