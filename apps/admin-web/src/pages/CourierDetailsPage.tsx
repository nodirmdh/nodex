import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, Input, PageShell, Select } from "@nodex/ui";
import { formatDateTime, formatNumber, translateFulfillment, translateStatus } from "@nodex/i18n";
import { ApiClient, CourierDetails } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function CourierDetailsPage() {
  const { t } = useTranslation();
  const { courierId } = useParams();
  const [details, setDetails] = useState<CourierDetails | null>(null);
  const [form, setForm] = useState({
    login: "",
    password: "",
    full_name: "",
    phone: "",
    telegram_username: "",
    delivery_method: "",
    is_available: false,
    max_active_orders: "1",
    is_blocked: false,
  });
  const [financeRange, setFinanceRange] = useState("week");
  const [finance, setFinance] = useState<{
    completed_count: number;
    gross_earnings: number;
    average_per_order: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!courierId) {
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.getCourier(courierId);
        setDetails(data);
        setForm({
          login: data.login ?? "",
          password: "",
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          telegram_username: data.telegram_username ?? "",
          delivery_method: data.delivery_method ?? "",
          is_available: data.is_available ?? false,
          max_active_orders: data.max_active_orders?.toString() ?? "1",
          is_blocked: data.is_blocked ?? false,
        });
        const financeData = await client.getCourierFinance(courierId, financeRange);
        setFinance(financeData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("admin.couriers.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [courierId, financeRange, t]);

  if (isLoading) {
    return <p>{t("admin.couriers.loading")}</p>;
  }

  if (error || !details) {
    return (
      <section>
        <Link to="/couriers">{t("admin.couriers.back")}</Link>
        <p className="error-banner">{error ?? t("admin.couriers.notFound")}</p>
      </section>
    );
  }

  return (
    <PageShell
      title={t("admin.couriers.detailsTitle", { id: details.courier_id })}
      subtitle={t("admin.couriers.detailsSubtitle")}
      actions={
        <Link to="/couriers" className="text-sm text-sky-600">
          {t("admin.couriers.back")}
        </Link>
      }
    >
      <div className="details-grid">
        <div>
          <strong>{t("fields.id")}</strong>
          <div>{details.courier_id}</div>
        </div>
        <div>
          <strong>{t("admin.couriers.form.login")}</strong>
          <Input
            type="text"
            value={form.login}
            onChange={(event) => setForm({ ...form, login: event.target.value })}
          />
        </div>
        <div>
          <strong>{t("admin.couriers.form.password")}</strong>
          <Input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </div>
        <div>
          <strong>{t("admin.couriers.details.avatar")}</strong>
          {details.avatar_url ? (
            <img src={details.avatar_url} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div>-</div>
          )}
        </div>
        <div>
          <strong>{t("admin.couriers.form.fullName")}</strong>
          <Input
            type="text"
            value={form.full_name}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
          />
        </div>
        <div>
          <strong>{t("admin.couriers.form.phone")}</strong>
          <Input
            type="text"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </div>
        <div>
          <strong>{t("admin.couriers.form.telegram")}</strong>
          <Input
            type="text"
            value={form.telegram_username}
            onChange={(event) =>
              setForm({ ...form, telegram_username: event.target.value })
            }
          />
        </div>
        <div>
          <strong>{t("admin.couriers.form.deliveryMethod")}</strong>
          <Select
            value={form.delivery_method}
            onChange={(event) =>
              setForm({ ...form, delivery_method: event.target.value })
            }
          >
            <option value="WALK">{t("courier.methodWalk")}</option>
            <option value="BIKE">{t("courier.methodBike")}</option>
            <option value="MOTO">{t("courier.methodMoto")}</option>
            <option value="CAR">{t("courier.methodCar")}</option>
          </Select>
        </div>
        <div>
          <strong>{t("admin.couriers.form.availability")}</strong>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(event) =>
                setForm({ ...form, is_available: event.target.checked })
              }
            />
            {t("admin.couriers.form.available")}
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_blocked}
              onChange={(event) =>
                setForm({ ...form, is_blocked: event.target.checked })
              }
            />
            {t("admin.couriers.form.blocked")}
          </label>
          <Input
            type="number"
            value={form.max_active_orders}
            onChange={(event) =>
              setForm({ ...form, max_active_orders: event.target.value })
            }
          />
        </div>
        <div>
          <strong>{t("admin.couriers.details.createdAt")}</strong>
          <div>{details.created_at ? formatDateTime(details.created_at) : "-"}</div>
        </div>
        <div>
          <strong>{t("admin.couriers.stats.delivered")}</strong>
          <div>{formatNumber(details.delivered_count)}</div>
        </div>
        <div>
          <strong>{t("admin.couriers.stats.gross")}</strong>
          <div>{formatNumber(details.gross_earnings)}</div>
        </div>
        <div>
          <strong>{t("admin.couriers.stats.avg")}</strong>
          <div>{formatNumber(details.average_per_order)}</div>
        </div>
        <div>
          <strong>{t("admin.couriers.stats.activeStatus")}</strong>
          <div>{details.active_status ?? "-"}</div>
        </div>
        <div>
          <strong>{t("admin.couriers.stats.rating")}</strong>
          <div>
            {details.rating_avg !== null && details.rating_count !== null
              ? `${details.rating_avg.toFixed(1)} (${formatNumber(details.rating_count)})`
              : "-"}
          </div>
        </div>
      </div>

      <div className="page-header">
        <Button
          onClick={async () => {
            if (!courierId) return;
            setIsLoading(true);
            setError(null);
            try {
              await client.updateCourier(courierId, {
                login: form.login.trim() || null,
                password: form.password.trim() || null,
                full_name: form.full_name.trim() || null,
                phone: form.phone.trim() || null,
                telegram_username: form.telegram_username.trim() || null,
                delivery_method: form.delivery_method.trim() || null,
                is_available: form.is_available,
                max_active_orders: Number(form.max_active_orders) || 1,
                is_blocked: form.is_blocked,
              });
              const refreshed = await client.getCourier(courierId);
              setDetails(refreshed);
              setForm((prev) => ({ ...prev, password: "" }));
            } catch (err) {
              setError(err instanceof Error ? err.message : t("admin.couriers.updateFailed"));
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {t("common.save")}
        </Button>
      </div>

      <h2>{t("admin.couriers.finance.title")}</h2>
      <div className="inline">
        <Select
          value={financeRange}
          onChange={(event) => setFinanceRange(event.target.value)}
        >
          <option value="week">{t("admin.couriers.finance.lastWeek")}</option>
          <option value="month">{t("admin.couriers.finance.lastMonth")}</option>
        </Select>
      </div>
      {finance ? (
        <div className="details-grid">
          <div>
            <strong>{t("admin.couriers.finance.completed")}</strong>
            <div>{formatNumber(finance.completed_count)}</div>
          </div>
          <div>
            <strong>{t("admin.couriers.finance.gross")}</strong>
            <div>{formatNumber(finance.gross_earnings)}</div>
          </div>
          <div>
            <strong>{t("admin.couriers.finance.avg")}</strong>
            <div>{formatNumber(finance.average_per_order)}</div>
          </div>
        </div>
      ) : (
        <p>{t("admin.couriers.finance.empty")}</p>
      )}

      <h2>{t("admin.couriers.orders.title")}</h2>
      {details.orders.length === 0 ? (
        <p>{t("admin.couriers.orders.empty")}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("admin.couriers.orders.order")}</th>
              <th>{t("admin.couriers.orders.status")}</th>
              <th>{t("admin.couriers.orders.vendor")}</th>
              <th>{t("admin.couriers.orders.fulfillment")}</th>
              <th>{t("admin.couriers.orders.total")}</th>
              <th>{t("admin.couriers.orders.deliveryFee")}</th>
              <th>{t("admin.couriers.orders.created")}</th>
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
                <td>{order.delivery_fee ? formatNumber(order.delivery_fee) : "-"}</td>
                <td>{formatDateTime(order.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{t("admin.couriers.ratings.title")}</h2>
      {details.ratings.length === 0 ? (
        <p>{t("admin.couriers.ratings.empty")}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("admin.couriers.ratings.order")}</th>
              <th>{t("admin.couriers.ratings.stars")}</th>
              <th>{t("admin.couriers.ratings.comment")}</th>
              <th>{t("admin.couriers.ratings.created")}</th>
            </tr>
          </thead>
          <tbody>
            {details.ratings.map((rating) => (
              <tr key={rating.order_id}>
                <td>{rating.order_id}</td>
                <td>{rating.courier_stars ?? "-"}</td>
                <td>{rating.courier_comment ?? "-"}</td>
                <td>{formatDateTime(rating.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
