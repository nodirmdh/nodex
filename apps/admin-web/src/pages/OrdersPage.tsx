import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Button,
  Input,
  PageShell,
  StatusBadge,
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  toast,
} from "@nodex/ui";
import { formatDateTime, formatNumber, translateFulfillment } from "@nodex/i18n";
import { ApiClient, OrderSummary } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [filters, setFilters] = useState({
    order_id: "",
    status: "",
    vendor_id: "",
    vendor_name: "",
    client_id: "",
    receiver_phone: "",
    fulfillment_type: "",
    from: "",
    to: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listOrders({
        order_id: filters.order_id || undefined,
        status: filters.status || undefined,
        vendor_id: filters.vendor_id || undefined,
        vendor_name: filters.vendor_name || undefined,
        client_id: filters.client_id || undefined,
        receiver_phone: filters.receiver_phone || undefined,
        fulfillment_type: filters.fulfillment_type || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setOrders(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.loadOrders");
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <PageShell
      title={t("admin.orders.title")}
      subtitle={t("admin.orders.subtitle")}
      actions={
        <Button variant="secondary" onClick={() => void loadOrders()}>
          {t("common.refresh")}
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-4">
        <Input
          placeholder={t("admin.orders.filters.orderId")}
          value={filters.order_id}
          onChange={(event) => setFilters({ ...filters, order_id: event.target.value })}
        />
        <Input
          placeholder={t("admin.orders.filters.status")}
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
        />
        <Input
          placeholder={t("admin.orders.filters.vendorId")}
          value={filters.vendor_id}
          onChange={(event) => setFilters({ ...filters, vendor_id: event.target.value })}
        />
        <Input
          placeholder={t("admin.orders.filters.vendorName")}
          value={filters.vendor_name}
          onChange={(event) => setFilters({ ...filters, vendor_name: event.target.value })}
        />
        <Input
          placeholder={t("admin.orders.filters.clientId")}
          value={filters.client_id}
          onChange={(event) => setFilters({ ...filters, client_id: event.target.value })}
        />
        <Input
          placeholder={t("admin.orders.filters.receiverPhone")}
          value={filters.receiver_phone}
          onChange={(event) => setFilters({ ...filters, receiver_phone: event.target.value })}
        />
        <Input
          placeholder={t("admin.orders.filters.fulfillment")}
          value={filters.fulfillment_type}
          onChange={(event) => setFilters({ ...filters, fulfillment_type: event.target.value })}
        />
        <Input
          placeholder={t("admin.orders.filters.from")}
          value={filters.from}
          onChange={(event) => setFilters({ ...filters, from: event.target.value })}
        />
        <Input
          placeholder={t("admin.orders.filters.to")}
          value={filters.to}
          onChange={(event) => setFilters({ ...filters, to: event.target.value })}
        />
        <Button onClick={() => void loadOrders()}>{t("admin.orders.applyFilters")}</Button>
      </div>

      {isLoading ? (
        <p>{t("admin.orders.loading")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("admin.orders.table.order")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.orders.table.status")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.orders.table.vendor")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.orders.table.fulfillment")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.orders.table.total")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.orders.table.created")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <tbody>
            {orders.map((order) => (
              <TableRow key={order.order_id}>
                <TableCell>{order.order_id}</TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell>{order.vendor_name ?? order.vendor_id}</TableCell>
                <TableCell>{translateFulfillment(order.fulfillment_type)}</TableCell>
                <TableCell>{formatNumber(order.total)}</TableCell>
                <TableCell>{formatDateTime(order.created_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2 text-xs text-sky-600">
                    <Link to={`/orders/${order.order_id}`}>{t("common.view")}</Link>
                    {order.vendor_id && <Link to={`/vendors/${order.vendor_id}`}>{t("admin.orders.links.vendor")}</Link>}
                    {order.client_id && <Link to={`/clients/${order.client_id}`}>{t("admin.orders.links.client")}</Link>}
                    {order.courier_id && <Link to={`/couriers/${order.courier_id}`}>{t("admin.orders.links.courier")}</Link>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
      {error && <p className="error-banner">{error}</p>}
    </PageShell>
  );
}
