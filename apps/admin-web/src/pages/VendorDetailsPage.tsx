import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useTranslation } from "react-i18next";

import { formatDateTime, formatNumber } from "@nodex/i18n";
import { StatusBadge } from "@nodex/ui";

import {
  ApiClient,
  FinanceSummary,
  MenuItem,
  OrderSummary,
  Vendor,
  VendorDashboard,
  VendorReview,
} from "../api/client";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

const DEFAULT_CENTER = { lat: 42.842, lng: 59.012 };
const DEFAULT_ZOOM = 13;
const WEEKDAYS: Array<ScheduleEntry["weekday"]> = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

type ScheduleEntry = {
  weekday: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
  is24h: boolean;
};

function buildDefaultSchedule(): ScheduleEntry[] {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    open_time: "09:00",
    close_time: "21:00",
    closed: false,
    is24h: false,
  }));
}

function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (next: { lat: number; lng: number }) => void;
}) {
  const position = lat !== null && lng !== null ? { lat, lng } : DEFAULT_CENTER;

  function ClickHandler() {
    useMapEvents({
      click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }),
    });
    return null;
  }

  return (
    <div className="map-picker">
      <MapContainer center={position} zoom={DEFAULT_ZOOM} className="map-container">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler />
        {lat !== null && lng !== null && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}

export function VendorDetailsPage() {
  const { t } = useTranslation();
  const { vendorId } = useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dashboard, setDashboard] = useState<VendorDashboard | null>(null);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [promotions, setPromotions] = useState<
    Array<{
      promotion_id: string;
      promo_type: string;
      value_numeric: number;
      priority?: number;
      is_active: boolean;
      starts_at: string | null;
      ends_at: string | null;
    }>
  >([]);
  const [menuForm, setMenuForm] = useState({
    title: "",
    description: "",
    price: "",
    is_available: true,
    category: "",
    image_url: "",
  });
  const [menuEditingId, setMenuEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "menu" | "promotions" | "finance" | "reviews"
  >("overview");
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [financeRange, setFinanceRange] = useState("week");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [form, setForm] = useState({
    login: "",
    password: "",
    name: "",
    owner_full_name: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    inn: "",
    category: "RESTAURANTS",
    supports_pickup: false,
    delivers_self: false,
    address_text: "",
    is_active: true,
    is_blocked: false,
    opening_hours: "",
    payout_details: "",
    main_image_url: "",
    gallery_images: [] as string[],
    timezone: "Asia/Tashkent",
    lat: "",
    lng: "",
  });
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(buildDefaultSchedule());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!vendorId) {
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [
          vendorData,
          ordersData,
          dashboardData,
          reviewsData,
          promotionsData,
          financeData,
        ] = await Promise.all([
          client.getVendor(vendorId),
          client.listOrders({ vendor_id: vendorId }),
          client.getVendorDashboard(vendorId),
          client.getVendorReviews(vendorId),
          client.getVendorPromotions(vendorId),
          client.getVendorFinance(vendorId, financeRange),
        ]);
        const itemsData = await client.listMenuItems(vendorId);
        setVendor(vendorData);
        setOrders(ordersData);
        setMenuItems(itemsData);
        setDashboard(dashboardData);
        setReviews(reviewsData);
        setPromotions(promotionsData);
        setFinance(financeData);
        setForm({
          login: vendorData.login ?? "",
          password: "",
          name: vendorData.name,
          owner_full_name: vendorData.owner_full_name ?? "",
          phone1: vendorData.phone1 ?? vendorData.phone ?? "",
          phone2: vendorData.phone2 ?? "",
          phone3: vendorData.phone3 ?? "",
          email: vendorData.email ?? "",
          inn: vendorData.inn ?? "",
          category: vendorData.category,
          supports_pickup: vendorData.supports_pickup,
          delivers_self: vendorData.delivers_self ?? false,
          address_text: vendorData.address_text ?? "",
          is_active: vendorData.is_active,
          is_blocked: vendorData.is_blocked ?? false,
          opening_hours: vendorData.opening_hours ?? "",
          payout_details: vendorData.payout_details
            ? JSON.stringify(vendorData.payout_details, null, 2)
            : "",
          main_image_url: vendorData.main_image_url ?? "",
          gallery_images: vendorData.gallery_images ?? [],
          timezone: vendorData.timezone ?? "Asia/Tashkent",
          lat: vendorData.geo.lat.toString(),
          lng: vendorData.geo.lng.toString(),
        });
        setSchedule(
          vendorData.schedule && vendorData.schedule.length > 0
            ? vendorData.schedule.map((entry) => ({
                weekday: entry.weekday as ScheduleEntry["weekday"],
                open_time: entry.open_time ?? null,
                close_time: entry.close_time ?? null,
                closed: entry.closed,
                is24h: entry.is24h,
              }))
            : buildDefaultSchedule(),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.loadVendor"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [vendorId, financeRange, t]);

  const handleSave = async () => {
    if (!vendorId) {
      return;
    }
    if (!form.name.trim()) {
      setError(t("errors.vendorNameRequired"));
      return;
    }
    if (form.payout_details.trim()) {
      try {
        JSON.parse(form.payout_details);
      } catch {
        setError(t("errors.payoutJson"));
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      const loginValue = form.login.trim();
      const passwordValue = form.password.trim();
      if (loginValue && !passwordValue) {
        setError(t("admin.vendors.form.passwordRequired"));
        setIsLoading(false);
        return;
      }
      const payload = {
        name: form.name.trim(),
        ...(loginValue && passwordValue
          ? { login: loginValue, password: passwordValue }
          : {}),
        owner_full_name: form.owner_full_name.trim() || null,
        phone1: form.phone1.trim() || null,
        phone2: form.phone2.trim() || null,
        phone3: form.phone3.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone1.trim() || null,
        inn: form.inn.trim() || null,
        category: form.category,
        supports_pickup: form.supports_pickup,
        delivers_self: form.delivers_self,
        address_text: form.address_text.trim() || null,
        is_active: form.is_active,
        is_blocked: form.is_blocked,
        opening_hours: form.opening_hours.trim() || null,
        payout_details: form.payout_details.trim()
          ? JSON.parse(form.payout_details)
          : null,
        main_image_url: form.main_image_url.trim() || null,
        gallery_images: form.gallery_images,
        timezone: form.timezone.trim() || "Asia/Tashkent",
        schedule,
        geo: {
          lat: Number(form.lat),
          lng: Number(form.lng),
        },
      };
      const updated = await client.updateVendor(vendorId, payload);
      setVendor(updated);
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.vendors.updateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <p>{t("admin.vendors.loading")}</p>;
  }

  if (error || !vendor) {
    return (
      <section>
        <Link to="/vendors">{t("admin.vendors.back")}</Link>
        <p className="error-banner">{error ?? t("admin.vendors.notFound")}</p>
      </section>
    );
  }

  return (
    <section>
      <Link to="/vendors">{t("admin.vendors.back")}</Link>
      <div className="page-header">
        <h1>{vendor.name}</h1>
        <button className="primary" onClick={handleSave}>
          {t("common.save")}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          {t("admin.vendors.tabs.overview")}
        </button>
        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          {t("admin.vendors.tabs.orders")}
        </button>
        <button
          className={activeTab === "menu" ? "active" : ""}
          onClick={() => setActiveTab("menu")}
        >
          {t("admin.vendors.tabs.menu")}
        </button>
        <button
          className={activeTab === "promotions" ? "active" : ""}
          onClick={() => setActiveTab("promotions")}
        >
          {t("admin.vendors.tabs.promotions")}
        </button>
        <button
          className={activeTab === "finance" ? "active" : ""}
          onClick={() => setActiveTab("finance")}
        >
          {t("admin.vendors.tabs.finance")}
        </button>
        <button
          className={activeTab === "reviews" ? "active" : ""}
          onClick={() => setActiveTab("reviews")}
        >
          {t("admin.vendors.tabs.reviews")}
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="details-grid">
            <label>
              {t("admin.vendors.form.login")}
              <input
                type="text"
                value={form.login}
                onChange={(event) => setForm({ ...form, login: event.target.value })}
              />
            </label>
            <label>
              {t("admin.vendors.form.password")}
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
            <label>
              {t("fields.name")}
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              {t("fields.ownerFullName")}
              <input
                type="text"
                value={form.owner_full_name}
                onChange={(event) => setForm({ ...form, owner_full_name: event.target.value })}
              />
            </label>
            <label>
              {t("fields.phone1")}
              <input
                type="text"
                value={form.phone1}
                onChange={(event) => setForm({ ...form, phone1: event.target.value })}
              />
            </label>
            <label>
              {t("fields.phone2")}
              <input
                type="text"
                value={form.phone2}
                onChange={(event) => setForm({ ...form, phone2: event.target.value })}
              />
            </label>
            <label>
              {t("fields.phone3")}
              <input
                type="text"
                value={form.phone3}
                onChange={(event) => setForm({ ...form, phone3: event.target.value })}
              />
            </label>
            <label>
              {t("fields.email")}
              <input
                type="text"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              {t("fields.inn")}
              <input
                type="text"
                value={form.inn}
                onChange={(event) => setForm({ ...form, inn: event.target.value })}
              />
            </label>
            <label>
              {t("fields.category")}
              <input
                type="text"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              {t("fields.active")}
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.is_blocked}
                onChange={(event) => setForm({ ...form, is_blocked: event.target.checked })}
              />
              {t("fields.blocked")}
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.supports_pickup}
                onChange={(event) =>
                  setForm({ ...form, supports_pickup: event.target.checked })
                }
              />
              {t("fields.pickup")}
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.delivers_self}
                onChange={(event) =>
                  setForm({ ...form, delivers_self: event.target.checked })
                }
              />
              {t("fields.deliversSelf")}
            </label>
            <label>
              {t("fields.address")}
              <input
                type="text"
                value={form.address_text}
                onChange={(event) => setForm({ ...form, address_text: event.target.value })}
              />
            </label>
            <label>
              {t("fields.openingHours")}
              <input
                type="text"
                value={form.opening_hours}
                onChange={(event) =>
                  setForm({ ...form, opening_hours: event.target.value })
                }
              />
            </label>
            <label>
              {t("fields.timezone")}
              <input
                type="text"
                value={form.timezone}
                onChange={(event) =>
                  setForm({ ...form, timezone: event.target.value })
                }
              />
            </label>
            <label>
              {t("fields.latitude")}
              <input
                type="number"
                value={form.lat}
                onChange={(event) => setForm({ ...form, lat: event.target.value })}
              />
            </label>
            <label>
              {t("fields.longitude")}
              <input
                type="number"
                value={form.lng}
                onChange={(event) => setForm({ ...form, lng: event.target.value })}
              />
            </label>
            <div className="full-width">
              <div className="field-header">
                <span>{t("fields.mainImage")}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setIsUploading(true);
                    try {
                      const result = await client.uploadFile(file);
                      setForm((prev) => ({ ...prev, main_image_url: result.public_url }));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : t("errors.uploadFailed"));
                    } finally {
                      setIsUploading(false);
                      event.target.value = "";
                    }
                  }}
                  disabled={isUploading}
                />
              </div>
              {form.main_image_url ? (
                <div className="image-preview">
                  <img src={resolveAssetUrl(form.main_image_url)} alt={t("fields.mainImage")} />
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => setForm((prev) => ({ ...prev, main_image_url: "" }))}
                  >
                    {t("common.remove")}
                  </button>
                </div>
              ) : (
                <div className="muted">{t("empty.noImage")}</div>
              )}
            </div>
            <div className="full-width">
              <div className="field-header">
                <span>{t("fields.gallery")}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length === 0) return;
                    setIsUploading(true);
                    try {
                      const uploaded: string[] = [];
                      for (const file of files) {
                        const result = await client.uploadFile(file);
                        uploaded.push(result.public_url);
                      }
                      setForm((prev) => ({
                        ...prev,
                        gallery_images: [...prev.gallery_images, ...uploaded],
                      }));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : t("errors.uploadFailed"));
                    } finally {
                      setIsUploading(false);
                      event.target.value = "";
                    }
                  }}
                  disabled={isUploading}
                />
              </div>
              {form.gallery_images.length === 0 ? (
                <div className="muted">{t("empty.noGallery")}</div>
              ) : (
                <div className="image-grid">
                  {form.gallery_images.map((url) => (
                    <div key={url} className="image-item">
                      <img src={resolveAssetUrl(url)} alt={t("fields.gallery")} />
                      <button
                        type="button"
                        className="link danger"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            gallery_images: prev.gallery_images.filter((item) => item !== url),
                          }))
                        }
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="full-width">
              <div className="field-header">
                <span>{t("fields.location")}</span>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      alert(t("errors.geolocationUnavailable"));
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setForm((prev) => ({
                          ...prev,
                          lat: pos.coords.latitude.toFixed(6),
                          lng: pos.coords.longitude.toFixed(6),
                        }));
                      },
                      () => alert(t("errors.geolocationFailed")),
                    );
                  }}
                >
                  {t("client.useMyLocation")}
                </button>
              </div>
              <LocationPicker
                lat={Number.isFinite(Number(form.lat)) ? Number(form.lat) : null}
                lng={Number.isFinite(Number(form.lng)) ? Number(form.lng) : null}
                onChange={(next) =>
                  setForm((prev) => ({
                    ...prev,
                    lat: next.lat.toFixed(6),
                    lng: next.lng.toFixed(6),
                  }))
                }
              />
            </div>
          </div>

          <div className="schedule-editor">
            <div className="field-header">
              <span>{t("vendor.schedule")}</span>
              <button
                className="secondary"
                type="button"
                onClick={() =>
                  setSchedule((prev) =>
                    prev.map((entry) => ({
                      ...entry,
                      open_time: prev[0]?.open_time ?? entry.open_time,
                      close_time: prev[0]?.close_time ?? entry.close_time,
                      closed: prev[0]?.closed ?? entry.closed,
                      is24h: prev[0]?.is24h ?? entry.is24h,
                    })),
                  )
                }
              >
                {t("vendor.copyToAll")}
              </button>
            </div>
            {schedule.map((entry) => (
              <div key={entry.weekday} className="schedule-row">
                <div className="weekday">{t(`weekday.${entry.weekday}`)}</div>
                <input
                  type="time"
                  value={entry.open_time ?? ""}
                  onChange={(event) =>
                    setSchedule((prev) =>
                      prev.map((item) =>
                        item.weekday === entry.weekday
                          ? { ...item, open_time: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  type="time"
                  value={entry.close_time ?? ""}
                  onChange={(event) =>
                    setSchedule((prev) =>
                      prev.map((item) =>
                        item.weekday === entry.weekday
                          ? { ...item, close_time: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={entry.closed}
                    onChange={(event) =>
                      setSchedule((prev) =>
                        prev.map((item) =>
                          item.weekday === entry.weekday
                            ? { ...item, closed: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  {t("vendor.closed")}
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={entry.is24h}
                    onChange={(event) =>
                      setSchedule((prev) =>
                        prev.map((item) =>
                          item.weekday === entry.weekday
                            ? { ...item, is24h: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  {t("vendor.is24h")}
                </label>
              </div>
            ))}
          </div>

          <label>
            {t("fields.payoutDetails")}
            <textarea
              rows={6}
              value={form.payout_details}
              onChange={(event) =>
                setForm({ ...form, payout_details: event.target.value })
              }
            />
          </label>

          <h2>{t("admin.vendors.weeklyDashboard")}</h2>
          {dashboard ? (
            <div className="details-grid">
              <div>
                <strong>{t("admin.vendors.stats.revenue")}</strong>
                <div>{formatNumber(dashboard.revenue)}</div>
              </div>
              <div>
                <strong>{t("admin.vendors.stats.completed")}</strong>
                <div>{formatNumber(dashboard.completed_count)}</div>
              </div>
              <div>
                <strong>{t("admin.vendors.stats.averageCheck")}</strong>
                <div>{formatNumber(dashboard.average_check)}</div>
              </div>
              <div>
                <strong>{t("admin.vendors.stats.rating")}</strong>
                <div>
                  {dashboard.rating_avg.toFixed(1)} ({formatNumber(dashboard.rating_count)})
                </div>
              </div>
              <div>
                <strong>{t("admin.vendors.stats.vendorOwes")}</strong>
                <div>{formatNumber(dashboard.vendor_owes)}</div>
              </div>
            </div>
          ) : (
            <p>{t("admin.vendors.stats.empty")}</p>
          )}
        </>
      )}

      {activeTab === "orders" && (
        <>
          <div className="filters">
            <label>
              {t("admin.vendors.orders.filterStatus")}
              <input
                type="text"
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value)}
                placeholder={t("admin.vendors.orders.filterPlaceholder")}
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                if (!vendorId) return;
                setIsLoading(true);
                setError(null);
                try {
                  const data = await client.listOrders({
                    vendor_id: vendorId,
                    status: orderStatusFilter || undefined,
                  });
                  setOrders(data);
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("errors.loadOrders"));
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              {t("admin.vendors.orders.apply")}
            </button>
          </div>

          {orders.length === 0 ? (
            <p>{t("admin.vendors.orders.empty")}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.vendors.orders.order")}</th>
                  <th>{t("admin.vendors.orders.status")}</th>
                  <th>{t("admin.vendors.orders.total")}</th>
                  <th>{t("admin.vendors.orders.created")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>{order.order_id}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{formatNumber(order.total)}</td>
                    <td>{formatDateTime(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "promotions" && (
        <>
          {promotions.length === 0 ? (
            <p>{t("admin.vendors.promotions.empty")}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.vendors.promotions.type")}</th>
                  <th>{t("admin.vendors.promotions.value")}</th>
                  <th>{t("admin.vendors.promotions.priority")}</th>
                  <th>{t("admin.vendors.promotions.active")}</th>
                  <th>{t("admin.vendors.promotions.starts")}</th>
                  <th>{t("admin.vendors.promotions.ends")}</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr key={promo.promotion_id}>
                    <td>{promo.promo_type}</td>
                    <td>{formatNumber(promo.value_numeric ?? 0)}</td>
                    <td>{formatNumber(promo.priority ?? 0)}</td>
                    <td>{promo.is_active ? t("common.yes") : t("common.no")}</td>
                    <td>{promo.starts_at ? formatDateTime(promo.starts_at) : "-"}</td>
                    <td>{promo.ends_at ? formatDateTime(promo.ends_at) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "finance" && (
        <>
          <div className="inline">
            <select
              value={financeRange}
              onChange={(event) => setFinanceRange(event.target.value)}
            >
              <option value="week">{t("admin.vendors.finance.lastWeek")}</option>
              <option value="month">{t("admin.vendors.finance.lastMonth")}</option>
            </select>
          </div>
          {finance ? (
            <div className="details-grid">
              <div>
                <strong>{t("admin.vendors.finance.gmv")}</strong>
                <div>{formatNumber(finance.gmv)}</div>
              </div>
              <div>
                <strong>{t("admin.vendors.finance.grossRevenue")}</strong>
                <div>{formatNumber(finance.gross_revenue)}</div>
              </div>
              <div>
                <strong>{t("admin.vendors.finance.serviceFees")}</strong>
                <div>{formatNumber(finance.service_fee_total)}</div>
              </div>
              <div>
                <strong>{t("admin.vendors.finance.promoDiscounts")}</strong>
                <div>{formatNumber(finance.promo_discounts_total)}</div>
              </div>
              <div>
                <strong>{t("admin.vendors.finance.vendorOwes")}</strong>
                <div>{formatNumber(finance.vendor_owes)}</div>
              </div>
            </div>
          ) : (
            <p>{t("admin.vendors.finance.empty")}</p>
          )}
        </>
      )}

      {activeTab === "reviews" && (
        <>
          {reviews.length === 0 ? (
            <p>{t("admin.vendors.reviews.empty")}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.vendors.reviews.order")}</th>
                  <th>{t("admin.vendors.reviews.vendorStars")}</th>
                  <th>{t("admin.vendors.reviews.vendorComment")}</th>
                  <th>{t("admin.vendors.reviews.courierStars")}</th>
                  <th>{t("admin.vendors.reviews.courierComment")}</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.order_id}>
                    <td>{review.order_id}</td>
                    <td>{review.vendor_stars}</td>
                    <td>{review.vendor_comment ?? "-"}</td>
                    <td>{review.courier_stars ?? "-"}</td>
                    <td>{review.courier_comment ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "menu" && (
        <>
          <div className="details-grid">
            <label>
              {t("admin.vendors.menu.title")}
              <input
                type="text"
                value={menuForm.title}
                onChange={(event) => setMenuForm({ ...menuForm, title: event.target.value })}
              />
            </label>
            <label>
              {t("admin.vendors.menu.description")}
              <input
                type="text"
                value={menuForm.description}
                onChange={(event) =>
                  setMenuForm({ ...menuForm, description: event.target.value })
                }
              />
            </label>
            <label>
              {t("admin.vendors.menu.price")}
              <input
                type="number"
                value={menuForm.price}
                onChange={(event) => setMenuForm({ ...menuForm, price: event.target.value })}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={menuForm.is_available}
                onChange={(event) =>
                  setMenuForm({ ...menuForm, is_available: event.target.checked })
                }
              />
              {t("admin.vendors.menu.available")}
            </label>
            <label>
              {t("admin.vendors.menu.category")}
              <input
                type="text"
                value={menuForm.category}
                onChange={(event) =>
                  setMenuForm({ ...menuForm, category: event.target.value })
                }
              />
            </label>
            <label>
              {t("admin.vendors.menu.image")}
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setIsUploading(true);
                  try {
                    const result = await client.uploadFile(file);
                    setMenuForm((prev) => ({ ...prev, image_url: result.public_url }));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : t("errors.uploadFailed"));
                  } finally {
                    setIsUploading(false);
                    event.target.value = "";
                  }
                }}
                disabled={isUploading}
              />
              {menuForm.image_url ? (
                <div className="image-preview">
                  <img src={resolveAssetUrl(menuForm.image_url)} alt={t("admin.vendors.menu.image")} />
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => setMenuForm((prev) => ({ ...prev, image_url: "" }))}
                  >
                    {t("common.remove")}
                  </button>
                </div>
              ) : (
                <div className="muted">{t("empty.noImage")}</div>
              )}
            </label>
          </div>
          <div className="page-header">
            <button
              className="primary"
              onClick={async () => {
                if (!vendorId) {
                  return;
                }
                if (!menuForm.title.trim()) {
                  setError(t("admin.vendors.menu.titleRequired"));
                  return;
                }
                const price = Number(menuForm.price);
                if (!Number.isFinite(price)) {
                  setError(t("admin.vendors.menu.priceRequired"));
                  return;
                }
                setIsLoading(true);
                try {
                  let updatedItems: MenuItem[];
                  if (menuEditingId) {
                    const updated = await client.updateMenuItem(menuEditingId, {
                      title: menuForm.title.trim(),
                      description: menuForm.description.trim() || null,
                      price,
                      is_available: menuForm.is_available,
                      category: menuForm.category.trim() || null,
                      image_url: menuForm.image_url.trim() || null,
                    });
                    updatedItems = menuItems.map((item) =>
                      item.id === updated.id ? updated : item,
                    );
                  } else {
                    const created = await client.createMenuItem({
                      vendor_id: vendorId,
                      title: menuForm.title.trim(),
                      description: menuForm.description.trim() || null,
                      price,
                      is_available: menuForm.is_available,
                      category: menuForm.category.trim() || null,
                      image_url: menuForm.image_url.trim() || null,
                    });
                    updatedItems = [created, ...menuItems];
                  }
                  setMenuItems(updatedItems);
                  setMenuEditingId(null);
                  setMenuForm({
                    title: "",
                    description: "",
                    price: "",
                    is_available: true,
                    category: "",
                    image_url: "",
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("admin.vendors.menu.saveFailed"));
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              {menuEditingId ? t("admin.vendors.menu.updateItem") : t("admin.vendors.menu.addItem")}
            </button>
            {menuEditingId && (
              <button
                className="secondary"
                onClick={() => {
                  setMenuEditingId(null);
                  setMenuForm({
                    title: "",
                    description: "",
                    price: "",
                    is_available: true,
                    category: "",
                    image_url: "",
                  });
                }}
              >
                {t("admin.vendors.menu.cancelEdit")}
              </button>
            )}
          </div>
          {menuItems.length === 0 ? (
            <p>{t("admin.vendors.menu.empty")}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.vendors.menu.image")}</th>
                  <th>{t("admin.vendors.menu.title")}</th>
                  <th>{t("admin.vendors.menu.price")}</th>
                  <th>{t("admin.vendors.menu.available")}</th>
                  <th>{t("admin.vendors.menu.category")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.image_url ? (
                        <img className="thumb" src={resolveAssetUrl(item.image_url)} alt={item.title} />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{item.title}</td>
                    <td>{formatNumber(item.price)}</td>
                    <td>{item.is_available ? t("common.yes") : t("common.no")}</td>
                    <td>{item.category ?? "-"}</td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => {
                          setMenuEditingId(item.id);
                          setMenuForm({
                            title: item.title,
                            description: item.description ?? "",
                            price: item.price.toString(),
                            is_available: item.is_available,
                            category: item.category ?? "",
                            image_url: item.image_url ?? "",
                          });
                        }}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        className="link danger"
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            await client.deleteMenuItem(item.id);
                            setMenuItems(menuItems.filter((row) => row.id !== item.id));
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : t("admin.vendors.menu.deleteFailed"),
                            );
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        {t("common.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
