import { useEffect, useState, type FormEvent } from "react";
import { NavigationMap } from "@nodex/navigation";
import { Button, Card, EmptyState, Input, Select, Skeleton, StatusBadge, toast } from "@nodex/ui";
import { ClipboardList, Home, Star, User, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, formatCurrency, formatDateTime, formatNumber, getLanguage, setLanguage, translatePayment, translateStatus } from "@nodex/i18n";

import {
  acceptOrder,
  confirmPickup,
  getCourierBalance,
  getCourierOrder,
  getCourierProfile,
  getCourierToken,
  listCourierHistory,
  listCourierRatings,
  listAvailableOrders,
  loginCourier,
  sendLocation,
  setCourierToken,
  submitDelivery,
  submitHandoff,
  uploadFile,
  updateCourierProfile,
} from "./api/client";
import type {
  AvailableOrder,
  CourierBalance,
  CourierHistoryOrder,
  CourierOrderDetails,
  CourierProfile,
} from "./api/types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { getTelegramWebApp } from "./telegram";
import { resolveAssetUrl } from "./utils/resolveAssetUrl";

type Screen = "home" | "history" | "balance" | "rating" | "profile";

export function App() {
  const { t } = useTranslation();
  const [authToken, setAuthTokenState] = useState<string | null>(getCourierToken());
  const [screen, setScreen] = useState<Screen>("home");
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [activeOrderId, setActiveOrderId] = useLocalStorage<string | null>(
    "nodex_courier_active_order_id",
    null,
  );
  const [activeOrder, setActiveOrder] = useState<CourierOrderDetails | null>(null);
  const [historyOrders, setHistoryOrders] = useState<CourierHistoryOrder[]>([]);
  const [balance, setBalance] = useState<CourierBalance | null>(null);
  const [balanceRange, setBalanceRange] = useState<"today" | "week" | "month">("week");
  const [pickupCode, setPickupCode] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastTrackingStatus, setLastTrackingStatus] = useState<string | null>(null);
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    telegram_username: "",
    avatar_url: "",
    avatar_file_id: "",
    delivery_method: "WALK",
    is_available: true,
    max_active_orders: "1",
  });
  const [ratings, setRatings] = useState<CourierProfile["ratings"]>([]);
  const [mapPreviewOrder, setMapPreviewOrder] = useState<AvailableOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canAccess = Boolean(authToken);

  useEffect(() => {
    document.body.classList.toggle("modal-open", Boolean(mapPreviewOrder));
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [mapPreviewOrder]);

  useEffect(() => {
    getTelegramWebApp()?.ready?.();
    if (canAccess) {
      void loadAvailable();
      void loadProfile();
    }
  }, [canAccess]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (!activeOrderId) {
      setActiveOrder(null);
      return;
    }
    void refreshActive(activeOrderId);
  }, [activeOrderId]);

  useEffect(() => {
    if (!activeOrderId || !activeOrder || !trackingEnabled) {
      return;
    }
    const interval = window.setInterval(() => {
      void pushLocation(activeOrderId);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [activeOrderId, activeOrder, trackingEnabled]);

  const loadAvailable = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAvailableOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadOrders"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCourierProfile();
      setProfile(data);
      setProfileForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        telegram_username: data.telegram_username ?? "",
        avatar_url: data.avatar_url ?? "",
        avatar_file_id: data.avatar_file_id ?? "",
        delivery_method: data.delivery_method ?? "WALK",
        is_available: data.is_available,
        max_active_orders: data.max_active_orders.toString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadProfile"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listCourierHistory();
      setHistoryOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadHistory"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCourierBalance({ range: balanceRange });
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadBalance"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadRatings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listCourierRatings();
      setRatings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadRatings"));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshActive = async (orderId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCourierOrder(orderId);
      setActiveOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadOrder"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await acceptOrder(orderId);
      setActiveOrderId(orderId);
      setTrackingEnabled(true);
      await loadAvailable();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.acceptOrder"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandoff = async () => {
    if (!activeOrderId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await submitHandoff(activeOrderId, pickupCode.trim());
      setPickupCode("");
      await refreshActive(activeOrderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.pickupFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const resetSessionState = () => {
    setActiveOrderId(null);
    setActiveOrder(null);
    setTrackingEnabled(false);
    setPickupCode("");
    setDeliveryCode("");
    setLastLocation(null);
    setLastCoords(null);
    setLastTrackingStatus(null);
  };

  const setAuthToken = (token: string | null) => {
    resetSessionState();
    setCourierToken(token);
    setAuthTokenState(token);
  };

  const handlePickupConfirm = async () => {
    if (!activeOrderId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await confirmPickup(activeOrderId);
      await refreshActive(activeOrderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.pickupFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!activeOrderId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await submitDelivery(activeOrderId, deliveryCode.trim());
      setDeliveryCode("");
      await refreshActive(activeOrderId);
      setActiveOrderId(null);
      setTrackingEnabled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.deliveryFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const pushLocation = async (orderId: string) => {
    if (!navigator.geolocation) {
      setLastTrackingStatus(t("courier.trackingGeoUnavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const response = await sendLocation(orderId, pos.coords.latitude, pos.coords.longitude);
          setLastLocation(
            `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
          );
          setLastCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLastTrackingStatus(`Sent (${response.status})`);
        } catch {
          setLastTrackingStatus(t("courier.trackingSendFailed"));
          return;
        }
      },
      () => {
        setLastTrackingStatus(t("courier.trackingPermissionDenied"));
        return;
      },
    );
  };

  const estimateDistance = (order: AvailableOrder) => {
    if (!navigator.geolocation) {
      return Promise.resolve(null);
    }
    if (!order.vendor_geo) {
      return Promise.resolve(null);
    }
    return new Promise<string | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const distance = haversineKm(
            pos.coords.latitude,
            pos.coords.longitude,
            order.vendor_geo.lat,
            order.vendor_geo.lng,
          );
          resolve(`${distance.toFixed(1)} km`);
        },
        () => resolve(null),
      );
    });
  };

  const remainingSlots = profile ? profile.remaining_slots : null;

  if (!canAccess) {
    return (
      <CourierLogin
        onSuccess={(token) => {
          setAuthToken(token);
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">{t("courier.title")}</div>
        <nav className="tabs">
          <button className={screen === "home" ? "active" : ""} onClick={() => setScreen("home")}>
            <Home size={16} /> {t("nav.home")}
          </button>
          <button className={screen === "history" ? "active" : ""} onClick={() => setScreen("history")}>
            <ClipboardList size={16} /> {t("nav.orders")}
          </button>
          <button className={screen === "balance" ? "active" : ""} onClick={() => setScreen("balance")}>
            <Wallet size={16} /> {t("nav.balance")}
          </button>
          <button className={screen === "rating" ? "active" : ""} onClick={() => setScreen("rating")}>
            <Star size={16} /> {t("nav.rating")}
          </button>
          <button className={screen === "profile" ? "active" : ""} onClick={() => setScreen("profile")}>
            <User size={16} /> {t("nav.profile")}
          </button>
        </nav>
        <button
          className="ghost"
          onClick={() => {
            setAuthToken(null);
            toast.success(t("courier.logoutSuccess"));
          }}
        >
          {t("courier.logout")}
        </button>
      </header>

      {error && <div className="error">{error}</div>}
      {isLoading && <div className="loading">{t("common.loading")}</div>}

      {screen === "home" && (
        <section className="panel">
          <div className="inline">
            <button className="secondary" onClick={() => void loadAvailable()}>
              {t("courier.refreshAvailable")}
            </button>
            {activeOrderId && (
              <button className="primary" onClick={() => void refreshActive(activeOrderId)}>
                {t("courier.refreshActive")}
              </button>
            )}
            <button className="secondary" onClick={() => void loadProfile()}>
              {t("courier.refreshProfile")}
            </button>
          </div>

          {profile && (
            <div className="card">
              <div className="card-title">{t("courier.availability")}</div>
              <div className="card-meta">
                {t("courier.remainingSlots")}: {remainingSlots !== null ? formatNumber(remainingSlots) : "-"}
              </div>
              <div className="inline">
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={profileForm.is_available}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, is_available: event.target.checked })
                    }
                  />
                  {t("courier.available")}
                </label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={profileForm.max_active_orders}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, max_active_orders: event.target.value })
                  }
                />
                <button
                  className="secondary"
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);
                    try {
                      const updated = await updateCourierProfile({
                        is_available: profileForm.is_available,
                        max_active_orders: Number(profileForm.max_active_orders) || 0,
                      });
                      setProfile(updated);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : t("errors.updateAvailability"));
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {t("courier.saveAvailability")}
                </button>
              </div>
            </div>
          )}

          {activeOrderId && activeOrder && (
            <div className="card">
              {activeOrder.fulfillment_type === "PICKUP" && (
                <div className="card-meta">{t("courier.pickupNoAction")}</div>
              )}
              <div className="card-title">{t("courier.activeOrder")}</div>
              <div className="card-meta">{t("courier.order")}: {activeOrder.order_id}</div>
              <div className="card-meta">{t("common.status")}: {translateStatus(activeOrder.status)}</div>
              <div className="card-meta">
                {t("courier.vendor")}: {activeOrder.vendor_name ?? activeOrder.vendor_id}
              </div>
              <div className="card-meta">
                {t("courier.vendorAddress")}: {activeOrder.vendor_address ?? "-"}
              </div>
              <div className="card-meta">
                {t("client.address")}: {activeOrder.address_text ?? "-"}
              </div>
              <div className="card-meta">
                {t("client.entranceApt")}: {activeOrder.address_entrance ?? "-"} /{" "}
                {activeOrder.address_apartment ?? "-"}
              </div>
              <div className="card-meta">
                {t("courier.deliveryLocation")}:{" "}
                {activeOrder.delivery_location
                  ? `${activeOrder.delivery_location.lat}, ${activeOrder.delivery_location.lng}`
                  : "-"}
              </div>
              <div className="card-meta">
                {t("client.receiverPhone")}: {activeOrder.receiver_phone ?? "-"}
              </div>
              <div className="card-meta">
                {t("client.deliveryComment")}: {activeOrder.delivery_comment ?? "-"}
              </div>
              <div className="card-meta">
                {t("client.payment")}: {activeOrder.payment_method ? translatePayment(activeOrder.payment_method) : "-"}{" "}
                {activeOrder.change_for_amount ? `(${t("client.change")} ${formatNumber(activeOrder.change_for_amount)})` : ""}
              </div>
              <div className="card-meta">
                {t("client.utensils")}: {formatNumber(activeOrder.utensils_count)}
              </div>
              <div className="card-meta">{t("common.total")}: {formatCurrency(activeOrder.total)}</div>
              <div className="card-meta">{t("courier.courierFee")}: {formatCurrency(activeOrder.courier_fee)}</div>
              {activeOrder.fulfillment_type === "DELIVERY" && (
                <div className="stepper">
                  <div
                    className={`step ${
                      ["HANDOFF_CONFIRMED", "PICKED_UP", "DELIVERED", "COMPLETED"].includes(activeOrder.status)
                        ? "done"
                        : activeOrder.status === "READY"
                          ? "active"
                          : ""
                    }`}
                  >
                    {t("courier.handoff")}
                  </div>
                  <div
                    className={`step ${
                      ["PICKED_UP", "DELIVERED", "COMPLETED"].includes(activeOrder.status)
                        ? "done"
                        : activeOrder.status === "HANDOFF_CONFIRMED"
                          ? "active"
                          : ""
                    }`}
                  >
                    {t("courier.pickup")}
                  </div>
                  <div
                    className={`step ${
                      ["DELIVERED", "COMPLETED"].includes(activeOrder.status)
                        ? "done"
                        : activeOrder.status === "PICKED_UP"
                          ? "active"
                          : ""
                    }`}
                  >
                    {t("courier.deliver")}
                  </div>
                </div>
              )}

              <div className="panel">
                <NavigationMap
                  mode="navigate"
                  pickup={
                    activeOrder.vendor_geo
                      ? {
                          lat: activeOrder.vendor_geo.lat,
                          lng: activeOrder.vendor_geo.lng,
                          label: t("courier.pickupPoint"),
                        }
                      : null
                  }
                  dropoff={
                    activeOrder.delivery_location
                      ? {
                          lat: activeOrder.delivery_location.lat,
                          lng: activeOrder.delivery_location.lng,
                          label: t("courier.dropoffPoint"),
                        }
                      : null
                  }
                  courier={lastCoords}
                />
              </div>

              {activeOrder.fulfillment_type === "DELIVERY" && activeOrder.status === "READY" && (
                <div className="field">
                  <label>{t("courier.handoffCode")}</label>
                  <div className="inline">
                    <input
                      className="input"
                      value={pickupCode}
                      onChange={(event) => setPickupCode(event.target.value)}
                    />
                    <button className="primary" onClick={() => void handleHandoff()}>
                      {t("courier.confirmHandoff")}
                    </button>
                  </div>
                </div>
              )}
              {activeOrder.fulfillment_type === "DELIVERY" && activeOrder.status === "HANDOFF_CONFIRMED" && (
                <div className="field">
                  <div className="inline">
                    <button className="primary" onClick={() => void handlePickupConfirm()}>
                      {t("courier.confirmPickup")}
                    </button>
                  </div>
                </div>
              )}
              {activeOrder.fulfillment_type === "DELIVERY" && activeOrder.status === "PICKED_UP" && (
                <div className="field">
                  <label>{t("courier.deliveryCode")}</label>
                  <div className="inline">
                    <input
                      className="input"
                      value={deliveryCode}
                      onChange={(event) => setDeliveryCode(event.target.value)}
                    />
                    <button className="primary" onClick={() => void handleDeliver()}>
                      {t("courier.confirmDelivery")}
                    </button>
                  </div>
                </div>
              )}

              <div className="field">
                <label>{t("courier.tracking")}</label>
                <div className="inline">
                  <button
                    className={trackingEnabled ? "primary" : "secondary"}
                    onClick={() => setTrackingEnabled((prev) => !prev)}
                  >
                    {trackingEnabled ? t("courier.stop") : t("courier.start")}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => activeOrderId && void pushLocation(activeOrderId)}
                    disabled={!trackingEnabled}
                  >
                    {t("courier.sendNow")}
                  </button>
                </div>
                <div className="card-meta">
                  {t("courier.lastLocation")}: {lastLocation ?? "-"}
                </div>
                <div className="card-meta">
                  {t("courier.lastStatus")}: {lastTrackingStatus ?? "-"}
                </div>
              </div>
            </div>
          )}

          <h3>{t("courier.availableOrders")}</h3>
          <div className="card-list">
            {orders.map((order) => (
              <AvailableOrderCard
                key={order.order_id}
                order={order}
                onAccept={() => void handleAccept(order.order_id)}
                onOpenMap={() => setMapPreviewOrder(order)}
                estimateDistance={estimateDistance}
              />
            ))}
            {orders.length === 0 && <p>{t("courier.noAvailableOrders")}</p>}
          </div>
        </section>
      )}

      {screen === "history" && (
        <section className="panel">
          <div className="inline">
            <button className="secondary" onClick={() => void loadHistory()}>
              {t("courier.refreshHistory")}
            </button>
          </div>
          {historyOrders.length === 0 ? (
            <p>{t("courier.noHistory")}</p>
          ) : (
            <div className="list">
              {historyOrders.map((entry) => (
                <div key={entry.order_id} className="row">
                  <div>
                    <div>{entry.vendor_name}</div>
                    <div className="muted">
                      {entry.order_id.slice(0, 8)} • {translateStatus(entry.status)}
                    </div>
                    <div className="muted">{t("courier.courierFee")}: {formatCurrency(entry.courier_fee)}</div>
                  </div>
                  <div className="muted">
                    {formatDateTime(entry.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {screen === "balance" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("nav.balance")}</h2>
              <p className="text-sm text-slate-500">{t("courier.balanceSubtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={balanceRange}
                onChange={(event) =>
                  setBalanceRange(event.target.value as "today" | "week" | "month")
                }
              >
                <option value="today">{t("range.today")}</option>
                <option value="week">{t("range.week")}</option>
                <option value="month">{t("range.month")}</option>
              </Select>
              <Button variant="secondary" onClick={() => void loadBalance()}>
                {t("common.refresh")}
              </Button>
            </div>
          </div>

          <Card>
            {isLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
              </div>
            ) : balance ? (
              <div className="grid gap-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>{t("courier.completed")}</span>
                  <span>{formatNumber(balance.completed_count)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("courier.grossEarnings")}</span>
                  <span>{formatCurrency(balance.gross_earnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("courier.avgPerOrder")}</span>
                  <span>{formatCurrency(balance.average_per_order)}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                title={t("empty.noData")}
                description={t("courier.balanceEmpty")}
              />
            )}
          </Card>
        </section>
      )}

      {screen === "rating" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("nav.rating")}</h2>
              <p className="text-sm text-slate-500">{t("courier.ratingSubtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void loadProfile()}>
                {t("common.refresh")}
              </Button>
              <Button variant="secondary" onClick={() => void loadRatings()}>
                {t("courier.loadReviews")}
              </Button>
            </div>
          </div>
          <Card>
            {isLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
              </div>
            ) : profile ? (
              <div className="grid gap-3">
                <div className="text-sm text-slate-600">
                  {t("courier.ratingValue", {
                    value: profile.rating_avg.toFixed(1),
                    count: formatNumber(profile.rating_count),
                  })}
                </div>
                {ratings.length === 0 ? (
                  <EmptyState
                    title={t("empty.noReviews")}
                    description={t("courier.reviewsEmpty")}
                  />
                ) : (
                  <div className="grid gap-3">
                    {ratings.map((entry) => (
                      <Card key={entry.order_id} className="bg-slate-50">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {t("courier.orderLabel", { id: entry.order_id })}
                            </div>
                            <div className="text-xs text-slate-400">
                              {t("courier.stars", { count: entry.courier_stars ?? "-" })}
                            </div>
                            <div className="text-xs text-slate-400">
                              {entry.courier_comment ?? "-"}
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatDateTime(entry.created_at)}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                title={t("courier.ratingUnavailable")}
                description={t("courier.ratingUnavailableDesc")}
              />
            )}
          </Card>
        </section>
      )}

      {screen === "profile" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("nav.profile")}</h2>
              <p className="text-sm text-slate-500">{t("courier.profileSubtitle")}</p>
            </div>
            <Button variant="secondary" onClick={() => void loadProfile()}>
              {t("common.refresh")}
            </Button>
          </div>
          <Card>
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
              <span>{t("client.language")}</span>
              <select
                className="input"
                value={getLanguage()}
                onChange={(event) => setLanguage(event.target.value as "ru" | "uz" | "kaa" | "en")}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            {isLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
              </div>
            ) : profile ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="text-sm text-slate-600">
                  {t("courier.courierId")}:{" "}
                  <span className="font-medium text-slate-900">{profile.courier_id}</span>
                </div>
                <label className="text-sm text-slate-600">
                  {t("fields.fullName")}
                  <Input
                    value={profileForm.full_name}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, full_name: event.target.value })
                    }
                    className="mt-1"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  {t("fields.phone")}
                  <Input
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, phone: event.target.value })
                    }
                    className="mt-1"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  {t("fields.telegramUsername")}
                  <Input
                    value={profileForm.telegram_username}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, telegram_username: event.target.value })
                    }
                    className="mt-1"
                  />
                </label>
                <div className="text-sm text-slate-600">
                  <div className="mb-2 font-medium">{t("fields.avatar")}</div>
                  <div className="flex items-center gap-3">
                    {profileForm.avatar_url ? (
                      <img
                        className="h-14 w-14 rounded-full object-cover"
                        src={resolveAssetUrl(profileForm.avatar_url)}
                        alt={t("fields.avatar")}
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-slate-200" />
                    )}
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          try {
                            const result = await uploadFile(file);
                            setProfileForm((prev) => ({
                              ...prev,
                              avatar_url: result.public_url,
                              avatar_file_id: result.file_id,
                            }));
                          } catch (err) {
                            setError(err instanceof Error ? err.message : t("errors.uploadFailed"));
                          }
                        }}
                      />
                      {profileForm.avatar_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setProfileForm((prev) => ({
                              ...prev,
                              avatar_url: "",
                              avatar_file_id: "",
                            }))
                          }
                        >
                          {t("common.remove")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <label className="text-sm text-slate-600">
                  {t("courier.deliveryMethod")}
                  <Select
                    value={profileForm.delivery_method}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, delivery_method: event.target.value })
                    }
                    className="mt-1"
                  >
                    <option value="WALK">{t("courier.methodWalk")}</option>
                    <option value="BIKE">{t("courier.methodBike")}</option>
                    <option value="MOTO">{t("courier.methodMoto")}</option>
                    <option value="CAR">{t("courier.methodCar")}</option>
                  </Select>
                </label>
              </div>
            ) : (
              <EmptyState
                title={t("courier.profileUnavailable")}
                description={t("courier.profileUnavailableDesc")}
              />
            )}
            {profile && (
              <div className="mt-6">
                <Button
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);
                    try {
                      const updated = await updateCourierProfile({
                        full_name: profileForm.full_name || null,
                        phone: profileForm.phone || null,
                        telegram_username: profileForm.telegram_username || null,
                        avatar_url: profileForm.avatar_url || null,
                        avatar_file_id: profileForm.avatar_file_id || null,
                        delivery_method: profileForm.delivery_method || null,
                      });
                      setProfile(updated);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : t("errors.updateProfile"));
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {t("common.save")}
                </Button>
              </div>
            )}
          </Card>
        </section>
      )}

      {mapPreviewOrder && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="inline">
              <h3>{t("courier.routePreview")}</h3>
              <button className="secondary" onClick={() => setMapPreviewOrder(null)}>
                {t("common.cancel")}
              </button>
            </div>
            <NavigationMap
              mode="preview"
              pickup={{
                lat: mapPreviewOrder.vendor_geo.lat,
                lng: mapPreviewOrder.vendor_geo.lng,
                label: t("courier.pickupPoint"),
              }}
              dropoff={
                mapPreviewOrder.delivery_location
                  ? {
                      lat: mapPreviewOrder.delivery_location.lat,
                      lng: mapPreviewOrder.delivery_location.lng,
                      label: t("courier.dropoffPoint"),
                    }
                  : null
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CourierLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier || !password) {
      toast.error(t("errors.requiredFields"));
      return;
    }
    setIsSubmitting(true);
    try {
      const isPhone = /^\+?\d+$/.test(identifier);
      const result = await loginCourier({
        login: isPhone ? undefined : identifier,
        phone: isPhone ? identifier : undefined,
        password,
      });
      toast.success(t("courier.loginSuccess"));
      onSuccess(result.token);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.authFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <Card className="login-card">
        <h2>{t("courier.loginTitle")}</h2>
        <p className="muted">{t("courier.loginSubtitle")}</p>
        <form onSubmit={submit} className="form-grid">
          <label className="field">
            <span>{t("courier.loginIdentifier")}</span>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={t("courier.loginIdentifierPlaceholder")}
            />
          </label>
          <label className="field">
            <span>{t("fields.password")}</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("courier.loginPasswordPlaceholder")}
            />
          </label>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("courier.loggingIn") : t("courier.login")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function AvailableOrderCard({
  order,
  onAccept,
  onOpenMap,
  estimateDistance,
}: {
  order: AvailableOrder;
  onAccept: () => void;
  onOpenMap: () => void;
  estimateDistance: (order: AvailableOrder) => Promise<string | null>;
}) {
  const { t } = useTranslation();
  const [distance, setDistance] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void estimateDistance(order).then((value) => {
      if (isMounted) {
        setDistance(value);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [order, estimateDistance]);

  return (
    <div className="card">
      <div className="card-title">{order.vendor_name}</div>
      <div className="card-meta">{order.vendor_address ?? "-"}</div>
      {distance && <div className="card-meta">{t("courier.distance")}: {distance}</div>}
      <div className="card-meta">{t("courier.order")}: {order.order_id}</div>
      <div className="card-meta">{t("common.total")}: {formatCurrency(order.total)}</div>
      <div className="card-meta">{t("courier.courierFee")}: {formatCurrency(order.courier_fee)}</div>
      <div className="inline">
        <button className="secondary" onClick={onOpenMap}>
          {t("courier.openMap")}
        </button>
      </div>
      <button className="primary" onClick={onAccept}>
        {t("courier.accept")}
      </button>
    </div>
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radiusKm = 6371.0;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusKm * c;
}


