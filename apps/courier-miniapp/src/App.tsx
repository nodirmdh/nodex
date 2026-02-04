import { useEffect, useState } from "react";
import { NavigationMap } from "@nodex/navigation";

import {
  acceptOrder,
  getCourierBalance,
  getCourierOrder,
  getCourierProfile,
  listCourierHistory,
  listCourierRatings,
  listAvailableOrders,
  sendLocation,
  submitDelivery,
  submitPickup,
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

type Screen = "home" | "history" | "balance" | "rating" | "profile";

export function App() {
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
    photo_url: "",
    delivery_method: "WALK",
    is_available: true,
    max_active_orders: "1",
  });
  const [ratings, setRatings] = useState<CourierProfile["ratings"]>([]);
  const [mapPreviewOrder, setMapPreviewOrder] = useState<AvailableOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getTelegramWebApp()?.ready?.();
    void loadAvailable();
    void loadProfile();
  }, []);

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
      setError(err instanceof Error ? err.message : "Failed to load orders");
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
        photo_url: data.photo_url ?? "",
        delivery_method: data.delivery_method ?? "WALK",
        is_available: data.is_available,
        max_active_orders: data.max_active_orders.toString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
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
      setError(err instanceof Error ? err.message : "Failed to load history");
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
      setError(err instanceof Error ? err.message : "Failed to load balance");
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
      setError(err instanceof Error ? err.message : "Failed to load ratings");
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
      setError(err instanceof Error ? err.message : "Failed to load order");
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
      setError(err instanceof Error ? err.message : "Failed to accept order");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickup = async () => {
    if (!activeOrderId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await submitPickup(activeOrderId, pickupCode.trim());
      setPickupCode("");
      await refreshActive(activeOrderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pickup failed");
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
      setError(err instanceof Error ? err.message : "Delivery failed");
    } finally {
      setIsLoading(false);
    }
  };

  const pushLocation = async (orderId: string) => {
    if (!navigator.geolocation) {
      setLastTrackingStatus("Geolocation not available");
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
          setLastTrackingStatus("Failed to send");
          return;
        }
      },
      () => {
        setLastTrackingStatus("Location permission denied");
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

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">Nodex Courier</div>
        <nav className="tabs">
          <button className={screen === "home" ? "active" : ""} onClick={() => setScreen("home")}>
            Home
          </button>
          <button className={screen === "history" ? "active" : ""} onClick={() => setScreen("history")}>
            Orders
          </button>
          <button className={screen === "balance" ? "active" : ""} onClick={() => setScreen("balance")}>
            Balance
          </button>
          <button className={screen === "rating" ? "active" : ""} onClick={() => setScreen("rating")}>
            Rating
          </button>
          <button className={screen === "profile" ? "active" : ""} onClick={() => setScreen("profile")}>
            Profile
          </button>
        </nav>
      </header>

      {error && <div className="error">{error}</div>}
      {isLoading && <div className="loading">Loading...</div>}

      {screen === "home" && (
        <section className="panel">
          <h2>Home</h2>
          <div className="inline">
            <button className="secondary" onClick={() => void loadAvailable()}>
              Refresh available
            </button>
            {activeOrderId && (
              <button className="primary" onClick={() => void refreshActive(activeOrderId)}>
                Refresh active
              </button>
            )}
            <button className="secondary" onClick={() => void loadProfile()}>
              Refresh profile
            </button>
          </div>

          {profile && (
            <div className="card">
              <div className="card-title">Availability</div>
              <div className="card-meta">
                Remaining slots: {remainingSlots !== null ? remainingSlots : "-"}
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
                  Available
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
                      setError(err instanceof Error ? err.message : "Failed to update availability");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  Save availability
                </button>
              </div>
            </div>
          )}

          {activeOrderId && activeOrder && (
            <div className="card">
              <div className="card-title">Active order</div>
              <div className="card-meta">Order: {activeOrder.order_id}</div>
              <div className="card-meta">Status: {activeOrder.status}</div>
              <div className="card-meta">
                Vendor: {activeOrder.vendor_name ?? activeOrder.vendor_id}
              </div>
              <div className="card-meta">
                Vendor address: {activeOrder.vendor_address ?? "-"}
              </div>
              <div className="card-meta">
                Address: {activeOrder.address_text ?? "-"}
              </div>
              <div className="card-meta">
                Entrance/Apt: {activeOrder.address_entrance ?? "-"} /{" "}
                {activeOrder.address_apartment ?? "-"}
              </div>
              <div className="card-meta">
                Delivery location:{" "}
                {activeOrder.delivery_location
                  ? `${activeOrder.delivery_location.lat}, ${activeOrder.delivery_location.lng}`
                  : "-"}
              </div>
              <div className="card-meta">
                Receiver phone: {activeOrder.receiver_phone ?? "-"}
              </div>
              <div className="card-meta">
                Delivery comment: {activeOrder.delivery_comment ?? "-"}
              </div>
              <div className="card-meta">
                Payment: {activeOrder.payment_method ?? "-"}{" "}
                {activeOrder.change_for_amount ? `(change ${activeOrder.change_for_amount})` : ""}
              </div>
              <div className="card-meta">
                Utensils: {activeOrder.utensils_count}
              </div>
              <div className="card-meta">Total: {activeOrder.total}</div>
              <div className="card-meta">Courier fee: {activeOrder.courier_fee}</div>
              <div className="stepper">
                <div className={`step ${activeOrder.status !== "NEW" ? "done" : "active"}`}>
                  Accept
                </div>
                <div className={`step ${activeOrder.status === "PICKED_UP" || activeOrder.status === "DELIVERED" ? "done" : activeOrder.status === "COURIER_ACCEPTED" ? "active" : ""}`}>
                  Pickup
                </div>
                <div className={`step ${activeOrder.status === "DELIVERED" ? "done" : activeOrder.status === "PICKED_UP" ? "active" : ""}`}>
                  Deliver
                </div>
              </div>

              <div className="panel">
                <NavigationMap
                  mode="navigate"
                  pickup={
                    activeOrder.vendor_geo
                      ? {
                          lat: activeOrder.vendor_geo.lat,
                          lng: activeOrder.vendor_geo.lng,
                          label: "Pickup",
                        }
                      : null
                  }
                  dropoff={
                    activeOrder.delivery_location
                      ? {
                          lat: activeOrder.delivery_location.lat,
                          lng: activeOrder.delivery_location.lng,
                          label: "Dropoff",
                        }
                      : null
                  }
                  courier={lastCoords}
                />
              </div>

              {activeOrder.status === "COURIER_ACCEPTED" && (
                <div className="field">
                  <label>Pickup code</label>
                  <div className="inline">
                    <input
                      className="input"
                      value={pickupCode}
                      onChange={(event) => setPickupCode(event.target.value)}
                    />
                    <button className="primary" onClick={() => void handlePickup()}>
                      Confirm pickup
                    </button>
                  </div>
                </div>
              )}
              {activeOrder.status === "PICKED_UP" && (
                <div className="field">
                  <label>Delivery code</label>
                  <div className="inline">
                    <input
                      className="input"
                      value={deliveryCode}
                      onChange={(event) => setDeliveryCode(event.target.value)}
                    />
                    <button className="primary" onClick={() => void handleDeliver()}>
                      Confirm delivery
                    </button>
                  </div>
                </div>
              )}

              <div className="field">
                <label>Location tracking</label>
                <div className="inline">
                  <button
                    className={trackingEnabled ? "primary" : "secondary"}
                    onClick={() => setTrackingEnabled((prev) => !prev)}
                  >
                    {trackingEnabled ? "Stop" : "Start"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => activeOrderId && void pushLocation(activeOrderId)}
                    disabled={!trackingEnabled}
                  >
                    Send now
                  </button>
                </div>
                <div className="card-meta">
                  Last location: {lastLocation ?? "-"}
                </div>
                <div className="card-meta">
                  Last status: {lastTrackingStatus ?? "-"}
                </div>
              </div>
            </div>
          )}

          <h3>Available orders</h3>
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
            {orders.length === 0 && <p>No available orders.</p>}
          </div>
        </section>
      )}

      {screen === "history" && (
        <section className="panel">
          <h2>Orders history</h2>
          <div className="inline">
            <button className="secondary" onClick={() => void loadHistory()}>
              Refresh history
            </button>
          </div>
          {historyOrders.length === 0 ? (
            <p>No completed orders yet.</p>
          ) : (
            <div className="list">
              {historyOrders.map((entry) => (
                <div key={entry.order_id} className="row">
                  <div>
                    <div>{entry.vendor_name}</div>
                    <div className="muted">
                      {entry.order_id.slice(0, 8)} • {entry.status}
                    </div>
                    <div className="muted">Courier fee: {entry.courier_fee}</div>
                  </div>
                  <div className="muted">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {screen === "balance" && (
        <section className="panel">
          <h2>Balance</h2>
          <div className="inline">
            <select
              value={balanceRange}
              onChange={(event) => setBalanceRange(event.target.value as "today" | "week" | "month")}
            >
              <option value="today">Today</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
            <button className="secondary" onClick={() => void loadBalance()}>
              Load
            </button>
          </div>
          {balance ? (
            <div className="list">
              <div className="row">
                <div>Completed</div>
                <div className="muted">{balance.completed_count}</div>
              </div>
              <div className="row">
                <div>Gross earnings</div>
                <div className="muted">{balance.gross_earnings}</div>
              </div>
              <div className="row">
                <div>Average per order</div>
                <div className="muted">{balance.average_per_order}</div>
              </div>
            </div>
          ) : (
            <p>Load balance to view stats.</p>
          )}
        </section>
      )}

      {screen === "rating" && (
        <section className="panel">
          <h2>Rating</h2>
          <div className="inline">
            <button className="secondary" onClick={() => void loadProfile()}>
              Refresh
            </button>
            <button className="secondary" onClick={() => void loadRatings()}>
              Load reviews
            </button>
          </div>
          {profile ? (
            <div className="list">
              <div className="card-meta">
                Rating: {profile.rating_avg.toFixed(1)} ({profile.rating_count})
              </div>
              {ratings.length === 0 ? (
                <div className="muted">No ratings yet.</div>
              ) : (
                ratings.map((entry) => (
                  <div key={entry.order_id} className="row">
                    <div>
                      <div>Order {entry.order_id}</div>
                      <div className="muted">
                        {entry.courier_stars ?? "-"} stars
                      </div>
                      <div className="muted">{entry.courier_comment ?? "-"}</div>
                    </div>
                    <div className="muted">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p>Load rating to view stats.</p>
          )}
        </section>
      )}

      {screen === "profile" && (
        <section className="panel">
          <h2>Profile</h2>
          <div className="inline">
            <button className="secondary" onClick={() => void loadProfile()}>
              Refresh
            </button>
          </div>
          {profile ? (
            <div className="list">
              <div className="details-grid">
                <label>
                  Full name
                  <input
                    className="input"
                    value={profileForm.full_name}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, full_name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Phone
                  <input
                    className="input"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, phone: event.target.value })
                    }
                  />
                </label>
                <label>
                  Telegram username
                  <input
                    className="input"
                    value={profileForm.telegram_username}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, telegram_username: event.target.value })
                    }
                  />
                </label>
                <label>
                  Photo URL
                  <input
                    className="input"
                    value={profileForm.photo_url}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, photo_url: event.target.value })
                    }
                  />
                </label>
                <label>
                  Delivery method
                  <select
                    value={profileForm.delivery_method}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, delivery_method: event.target.value })
                    }
                  >
                    <option value="WALK">Пешком</option>
                    <option value="BIKE">Вело</option>
                    <option value="MOTO">Мото</option>
                    <option value="CAR">Авто</option>
                  </select>
                </label>
              </div>
              <button
                className="primary"
                onClick={async () => {
                  setIsLoading(true);
                  setError(null);
                  try {
                    const updated = await updateCourierProfile({
                      full_name: profileForm.full_name || null,
                      phone: profileForm.phone || null,
                      telegram_username: profileForm.telegram_username || null,
                      photo_url: profileForm.photo_url || null,
                      delivery_method: profileForm.delivery_method || null,
                    });
                    setProfile(updated);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to save profile");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Save
              </button>
            </div>
          ) : (
            <p>Profile details will appear here.</p>
          )}
        </section>
      )}

      {mapPreviewOrder && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="inline">
              <h3>Route preview</h3>
              <button className="secondary" onClick={() => setMapPreviewOrder(null)}>
                Close
              </button>
            </div>
            <NavigationMap
              mode="preview"
              pickup={{
                lat: mapPreviewOrder.vendor_geo.lat,
                lng: mapPreviewOrder.vendor_geo.lng,
                label: "Pickup",
              }}
              dropoff={
                mapPreviewOrder.delivery_location
                  ? {
                      lat: mapPreviewOrder.delivery_location.lat,
                      lng: mapPreviewOrder.delivery_location.lng,
                      label: "Dropoff",
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
      {distance && <div className="card-meta">Distance: {distance}</div>}
      <div className="card-meta">Order: {order.order_id}</div>
      <div className="card-meta">Total: {order.total}</div>
      <div className="card-meta">Courier fee: {order.courier_fee}</div>
      <div className="inline">
        <button className="secondary" onClick={onOpenMap}>
          Open map
        </button>
      </div>
      <button className="primary" onClick={onAccept}>
        Accept
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
