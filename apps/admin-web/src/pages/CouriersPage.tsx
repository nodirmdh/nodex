import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Button,
  DialogContent,
  DialogRoot,
  DialogTitle,
  Input,
  PageShell,
  Select,
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@nodex/ui";
import { formatNumber } from "@nodex/i18n";
import { ApiClient, CourierSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function CouriersPage() {
  const { t } = useTranslation();
  const [couriers, setCouriers] = useState<CourierSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    courier_id: "",
    login: "",
    password: "",
    full_name: "",
    phone: "",
    telegram_username: "",
    delivery_method: "WALK",
    is_available: true,
    max_active_orders: "1",
    is_blocked: false,
  });

  const loadCouriers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listCouriers();
      setCouriers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.couriers.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCouriers();
  }, []);

  return (
    <PageShell
      title={t("admin.couriers.title")}
      subtitle={t("admin.couriers.subtitle")}
      actions={
        <Button variant="secondary" onClick={() => void loadCouriers()}>
          {t("common.refresh")}
        </Button>
      }
    >
      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>{t("admin.couriers.loading")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("admin.couriers.table.courierId")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.couriers.table.deliveryMethod")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.couriers.table.phone")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.couriers.table.delivered")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.couriers.table.gross")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.couriers.table.available")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.couriers.table.activeStatus")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.couriers.table.rating")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <tbody>
            {couriers.map((entry) => (
              <TableRow key={entry.courier_id}>
                <TableCell>{entry.courier_id}</TableCell>
                <TableCell>{entry.delivery_method ?? "-"}</TableCell>
                <TableCell>{entry.phone ?? "-"}</TableCell>
                <TableCell>{formatNumber(entry.delivered_count)}</TableCell>
                <TableCell>{formatNumber(entry.gross_earnings ?? 0)}</TableCell>
                <TableCell>{entry.is_available ? t("common.yes") : t("common.no")}</TableCell>
                <TableCell>{entry.active_status ?? "-"}</TableCell>
                <TableCell>
                  {entry.rating_avg !== null && entry.rating_count !== null
                    ? `${entry.rating_avg.toFixed(1)} (${formatNumber(entry.rating_count)})`
                    : "-"}
                </TableCell>
                <TableCell>
                  <Link to={`/couriers/${entry.courier_id}`}>{t("common.view")}</Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}

      <Button className="mt-6" onClick={() => setShowModal(true)}>
        {t("admin.couriers.create")}
      </Button>

      <DialogRoot open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogTitle>{t("admin.couriers.createTitle")}</DialogTitle>
          <div className="grid gap-3">
            <label>
              {t("admin.couriers.form.courierId")}
              <Input
                type="text"
                value={form.courier_id}
                onChange={(event) => setForm({ ...form, courier_id: event.target.value })}
              />
            </label>
            <label>
              {t("admin.couriers.form.login")}
              <Input
                type="text"
                value={form.login}
                onChange={(event) => setForm({ ...form, login: event.target.value })}
              />
            </label>
            <label>
              {t("admin.couriers.form.password")}
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
            <label>
              {t("admin.couriers.form.fullName")}
              <Input
                type="text"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              />
            </label>
            <label>
              {t("admin.couriers.form.phone")}
              <Input
                type="text"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </label>
            <label>
              {t("admin.couriers.form.telegram")}
              <Input
                type="text"
                value={form.telegram_username}
                onChange={(event) => setForm({ ...form, telegram_username: event.target.value })}
              />
            </label>
            <label>
              {t("admin.couriers.form.deliveryMethod")}
              <Select
                value={form.delivery_method}
                onChange={(event) => setForm({ ...form, delivery_method: event.target.value })}
              >
                <option value="WALK">{t("courier.methodWalk")}</option>
                <option value="BIKE">{t("courier.methodBike")}</option>
                <option value="MOTO">{t("courier.methodMoto")}</option>
                <option value="CAR">{t("courier.methodCar")}</option>
              </Select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(event) => setForm({ ...form, is_available: event.target.checked })}
              />
              {t("admin.couriers.form.available")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_blocked}
                onChange={(event) => setForm({ ...form, is_blocked: event.target.checked })}
              />
              {t("admin.couriers.form.blocked")}
            </label>
            <label>
              {t("admin.couriers.form.maxActive")}
              <Input
                type="number"
                value={form.max_active_orders}
                onChange={(event) => setForm({ ...form, max_active_orders: event.target.value })}
              />
            </label>
          </div>
          {error && <div className="mt-2 text-sm text-rose-500">{error}</div>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={async () => {
                setIsLoading(true);
                setError(null);
                try {
                  await client.createCourier({
                    courier_id: form.courier_id.trim() || undefined,
                    login: form.login.trim() || null,
                    password: form.password || null,
                    full_name: form.full_name.trim() || null,
                    phone: form.phone.trim() || null,
                    telegram_username: form.telegram_username.trim() || null,
                    delivery_method: form.delivery_method,
                    is_available: form.is_available,
                    max_active_orders: Number(form.max_active_orders) || 1,
                    is_blocked: form.is_blocked,
                  });
                  setShowModal(false);
                  setForm({
                    courier_id: "",
                    login: "",
                    password: "",
                    full_name: "",
                    phone: "",
                    telegram_username: "",
                    delivery_method: "WALK",
                    is_available: true,
                    max_active_orders: "1",
                    is_blocked: false,
                  });
                  await loadCouriers();
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("admin.couriers.createFailed"));
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              {t("common.create")}
            </Button>
          </div>
        </DialogContent>
      </DialogRoot>
    </PageShell>
  );
}
