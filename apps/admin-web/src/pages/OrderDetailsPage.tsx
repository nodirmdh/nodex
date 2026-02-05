import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Button,
  Input,
  PageShell,
  StatusBadge,
  Textarea,
  toast,
} from "@nodex/ui";
import { formatDateTime, formatNumber, translateFulfillment, translatePayment, translateStatus } from "@nodex/i18n";
import { ApiClient, OrderDetails } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function OrderDetailsPage() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [statusInput, setStatusInput] = useState("");
  const [deliveryComment, setDeliveryComment] = useState("");
  const [vendorComment, setVendorComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.getOrder(orderId);
        setOrder(data);
        setStatusInput(data.status);
        setDeliveryComment(data.delivery_comment ?? "");
        setVendorComment(data.vendor_comment ?? "");
      } catch (err) {
        const message = err instanceof Error ? err.message : t("errors.loadOrder");
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [orderId, t]);

  if (isLoading) {
    return <p>{t("admin.orderDetails.loading")}</p>;
  }

  if (error || !order) {
    return (
      <section>
        <Link to="/orders">{t("admin.orderDetails.backToOrders")}</Link>
        <p className="error-banner">{error ?? t("admin.orderDetails.notFound")}</p>
      </section>
    );
  }

  return (
    <PageShell
      title={t("admin.orderDetails.title", { id: order.order_id })}
      subtitle={t("admin.orderDetails.subtitle")}
      actions={
        <Link to="/orders" className="text-sm text-sky-600">
          {t("admin.orderDetails.backToOrders")}
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={order.status} />
        <Input
          value={statusInput}
          onChange={(event) => setStatusInput(event.target.value)}
          placeholder={t("admin.orderDetails.statusPlaceholder")}
        />
        <Button
          onClick={async () => {
            if (!orderId) return;
            setIsLoading(true);
            setError(null);
            try {
              const updated = await client.updateOrder(orderId, {
                status: statusInput || undefined,
                delivery_comment: deliveryComment,
                vendor_comment: vendorComment,
              });
              const refreshed = await client.getOrder(orderId);
              setOrder(refreshed);
              setStatusInput(updated.status);
              toast.success(t("admin.orderDetails.updated"));
            } catch (err) {
              const message = err instanceof Error ? err.message : t("admin.orderDetails.updateFailed");
              setError(message);
              toast.error(message);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {t("admin.orderDetails.update")}
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            if (!orderId) return;
            setIsLoading(true);
            setError(null);
            try {
              await client.cancelOrder(orderId, "admin_cancel");
              const refreshed = await client.getOrder(orderId);
              setOrder(refreshed);
              setStatusInput(refreshed.status);
              toast.success(t("admin.orderDetails.cancelled"));
            } catch (err) {
              const message = err instanceof Error ? err.message : t("admin.orderDetails.cancelFailed");
              setError(message);
              toast.error(message);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {t("admin.orderDetails.cancel")}
        </Button>
      </div>
      <div className="details-grid">
        <div>
          <strong>{t("fields.status")}</strong>
          <div>{translateStatus(order.status)}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.vendor")}</strong>
          <div>{order.vendor_name ?? order.vendor_id}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.client")}</strong>
          <div>{order.client_id ?? "-"}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.courier")}</strong>
          <div>
            {order.courier
              ? `${order.courier.full_name ?? "-"} (${order.courier.id})`
              : order.courier_id ?? "-"}
          </div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.fulfillment")}</strong>
          <div>{translateFulfillment(order.fulfillment_type)}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.deliveryComment")}</strong>
          <Textarea value={deliveryComment} onChange={(event) => setDeliveryComment(event.target.value)} />
        </div>
        <div>
          <strong>{t("admin.orderDetails.vendorComment")}</strong>
          <Textarea value={vendorComment} onChange={(event) => setVendorComment(event.target.value)} />
        </div>
        <div>
          <strong>{t("admin.orderDetails.utensils")}</strong>
          <div>{order.utensils_count}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.receiverPhone")}</strong>
          <div>{order.receiver_phone ?? "-"}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.payment")}</strong>
          <div>{order.payment_method ? translatePayment(order.payment_method) : "-"}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.changeFor")}</strong>
          <div>{order.change_for_amount ?? "-"}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.address")}</strong>
          <div>{order.address_text ?? "-"}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.entranceApt")}</strong>
          <div>
            {order.address_entrance ?? "-"} / {order.address_apartment ?? "-"}
          </div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.promoCode")}</strong>
          <div>{order.promo_code ?? "-"}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.promoDiscount")}</strong>
          <div>{formatNumber(order.promo_code_discount ?? 0)}</div>
        </div>
      </div>

      <h2>{t("admin.orderDetails.itemsTitle")}</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("admin.orderDetails.items.menuItem")}</th>
            <th>{t("admin.orderDetails.items.qty")}</th>
            <th>{t("admin.orderDetails.items.price")}</th>
            <th>{t("admin.orderDetails.items.discount")}</th>
            <th>{t("admin.orderDetails.items.gift")}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.menu_item_id}>
              <td>
                <div>{item.title ?? item.menu_item_id}</div>
                {item.weight_value && item.weight_unit && (
                  <div className="muted">
                    {item.weight_value} {item.weight_unit}
                  </div>
                )}
              </td>
              <td>{item.quantity}</td>
              <td>{formatNumber(item.price)}</td>
              <td>{formatNumber(item.discount_amount)}</td>
              <td>{item.is_gift ? t("common.yes") : t("common.no")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary-grid">
        <div>
          <strong>{t("admin.orderDetails.summary.subtotal")}</strong>
          <div>{formatNumber(order.items_subtotal)}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.summary.discount")}</strong>
          <div>{formatNumber(order.discount_total)}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.summary.promoDiscount")}</strong>
          <div>{formatNumber(order.promo_code_discount ?? 0)}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.summary.serviceFee")}</strong>
          <div>{formatNumber(order.service_fee)}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.summary.deliveryFee")}</strong>
          <div>{formatNumber(order.delivery_fee)}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.summary.total")}</strong>
          <div>{formatNumber(order.total)}</div>
        </div>
      </div>

      <h2>{t("admin.orderDetails.timelineTitle")}</h2>
      {order.events.length === 0 ? (
        <p>{t("admin.orderDetails.noEvents")}</p>
      ) : (
        <ul className="event-list">
          {order.events.map((event, index) => (
            <li key={`${event.event_type}-${index}`}>
              <span>{formatDateTime(event.created_at)}</span>
              <span>{event.event_type}</span>
            </li>
          ))}
        </ul>
      )}

      <h2>{t("admin.orderDetails.ratingTitle")}</h2>
      {order.rating ? (
        <div className="details-grid">
          <div>
            <strong>{t("admin.orderDetails.rating.vendorStars")}</strong>
            <div>{order.rating.vendor_stars}</div>
          </div>
          <div>
            <strong>{t("admin.orderDetails.rating.vendorComment")}</strong>
            <div>{order.rating.vendor_comment ?? "-"}</div>
          </div>
          <div>
            <strong>{t("admin.orderDetails.rating.courierStars")}</strong>
            <div>{order.rating.courier_stars ?? "-"}</div>
          </div>
          <div>
            <strong>{t("admin.orderDetails.rating.courierComment")}</strong>
            <div>{order.rating.courier_comment ?? "-"}</div>
          </div>
        </div>
      ) : (
        <p>{t("admin.orderDetails.ratingEmpty")}</p>
      )}

      <h2>{t("admin.orderDetails.trackingTitle")}</h2>
      {order.tracking.length === 0 ? (
        <p>{t("admin.orderDetails.trackingEmpty")}</p>
      ) : (
        <ul className="event-list">
          {order.tracking.map((entry, index) => (
            <li key={`${entry.courier_id}-${index}`}>
              <span>{formatDateTime(entry.created_at)}</span>
              <span>
                {entry.location.lat}, {entry.location.lng}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
