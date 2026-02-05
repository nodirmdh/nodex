import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PageShell, TabsList, TabsRoot, TabsTrigger } from "@nodex/ui";
import { formatDateTime, formatNumber, translateFulfillment, translateStatus } from "@nodex/i18n";
import { ApiClient, ClientDetails } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function ClientDetailsPage() {
  const { t } = useTranslation();
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
        setError(err instanceof Error ? err.message : t("admin.clients.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [clientId, t]);

  if (isLoading) {
    return <p>{t("admin.clients.loading")}</p>;
  }

  if (error || !details) {
    return (
      <section>
        <Link to="/clients">{t("admin.clients.back")}</Link>
        <p className="error-banner">{error ?? t("admin.clients.notFound")}</p>
      </section>
    );
  }

  return (
    <PageShell
      title={t("admin.clients.detailsTitle", { id: details.client_id })}
      subtitle={t("admin.clients.detailsSubtitle")}
      actions={
        <Link to="/clients" className="text-sm text-sky-600">
          {t("admin.clients.back")}
        </Link>
      }
    >
      <TabsRoot value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="profile">{t("admin.clients.tabs.profile")}</TabsTrigger>
          <TabsTrigger value="addresses">{t("admin.clients.tabs.addresses")}</TabsTrigger>
          <TabsTrigger value="orders">{t("admin.clients.tabs.orders")}</TabsTrigger>
          <TabsTrigger value="promo">{t("admin.clients.tabs.promo")}</TabsTrigger>
          <TabsTrigger value="ratings">{t("admin.clients.tabs.ratings")}</TabsTrigger>
        </TabsList>
      </TabsRoot>

      {activeTab === "profile" && (
        <>
          {details.profile ? (
            <div className="details-grid">
              <div>
                <strong>{t("admin.clients.profile.name")}</strong>
                <div>{details.profile.full_name ?? "-"}</div>
              </div>
              <div>
                <strong>{t("admin.clients.profile.phone")}</strong>
                <div>{details.profile.phone ?? "-"}</div>
              </div>
              <div>
                <strong>{t("admin.clients.profile.telegram")}</strong>
                <div>{details.profile.telegram_username ?? "-"}</div>
              </div>
              <div>
                <strong>{t("admin.clients.profile.about")}</strong>
                <div>{details.profile.about ?? "-"}</div>
              </div>
            </div>
          ) : (
            <p>{t("admin.clients.profile.empty")}</p>
          )}
        </>
      )}

      {activeTab === "addresses" && (
        <>
          {details.addresses.length === 0 ? (
            <p>{t("admin.clients.addresses.empty")}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.clients.addresses.type")}</th>
                  <th>{t("admin.clients.addresses.address")}</th>
                  <th>{t("admin.clients.addresses.entrance")}</th>
                  <th>{t("admin.clients.addresses.apartment")}</th>
                  <th>{t("admin.clients.addresses.created")}</th>
                </tr>
              </thead>
              <tbody>
                {details.addresses.map((address) => (
                  <tr key={address.id}>
                    <td>{address.type}</td>
                    <td>{address.address_text}</td>
                    <td>{address.entrance ?? "-"}</td>
                    <td>{address.apartment ?? "-"}</td>
                    <td>{formatDateTime(address.created_at)}</td>
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
            <p>{t("admin.clients.orders.empty")}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.clients.orders.order")}</th>
                  <th>{t("admin.clients.orders.status")}</th>
                  <th>{t("admin.clients.orders.vendor")}</th>
                  <th>{t("admin.clients.orders.fulfillment")}</th>
                  <th>{t("admin.clients.orders.total")}</th>
                  <th>{t("admin.clients.orders.created")}</th>
                </tr>
              </thead>
              <tbody>
                {details.orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>{order.order_id}</td>
                    <td>{translateStatus(order.status)}</td>
                    <td>{order.vendor_id}</td>
                    <td>{translateFulfillment(order.fulfillment_type)}</td>
                    <td>{formatNumber(order.total)}</td>
                    <td>{formatDateTime(order.created_at)}</td>
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
            <p>{t("admin.clients.promo.empty")}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.clients.promo.code")}</th>
                  <th>{t("admin.clients.promo.type")}</th>
                  <th>{t("admin.clients.promo.value")}</th>
                  <th>{t("admin.clients.promo.active")}</th>
                  <th>{t("admin.clients.promo.status")}</th>
                  <th>{t("admin.clients.promo.used")}</th>
                </tr>
              </thead>
              <tbody>
                {details.promo_codes.map((promo) => (
                  <tr key={promo.id}>
                    <td>{promo.code}</td>
                    <td>{promo.type}</td>
                    <td>{formatNumber(promo.value)}</td>
                    <td>{promo.is_active ? t("common.yes") : t("common.no")}</td>
                    <td>{promo.status ?? "-"}</td>
                    <td>{promo.used ? t("common.yes") : t("common.no")}</td>
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
            <p>{t("admin.clients.ratings.empty")}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.clients.ratings.order")}</th>
                  <th>{t("admin.clients.ratings.vendorStars")}</th>
                  <th>{t("admin.clients.ratings.vendorComment")}</th>
                  <th>{t("admin.clients.ratings.courierStars")}</th>
                  <th>{t("admin.clients.ratings.courierComment")}</th>
                  <th>{t("admin.clients.ratings.created")}</th>
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
                    <td>{formatDateTime(rating.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </PageShell>
  );
}
