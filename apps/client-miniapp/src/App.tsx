
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_CENTER_QONIRAT, DEFAULT_ZOOM, haversineKm, NavigationMap } from "@nodex/navigation";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import {
  addAddress,
  addPromoCode,
  createOrder,
  createQuote,
  getOrder,
  getOrderRating,
  getProfile,
  getTracking,
  getVendor,
  listAddresses,
  listCategories,
  listOrders,
  listPromoCodes,
  listVendors,
  removeAddress,
  removePromoCode,
  submitOrderRating,
  updateProfile,
} from "./api/client";
import type {
  AddressEntry,
  ClientProfile,
  MenuItem,
  OrderDetails,
  OrderSummary,
  PromoCodeEntry,
  QuoteResponse,
  VendorDetails,
  VendorSummary,
} from "./api/types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { getTelegramWebApp, openTelegramSupport } from "./telegram";

type Screen = "home" | "vendor" | "cart" | "address" | "checkout" | "orders" | "orderDetails" | "profile";

type ProfileTab = "account" | "addresses" | "promo" | "support" | "about";

type CartState = {
  vendorId: string | null;
  fulfillmentType: "DELIVERY" | "PICKUP";
  items: Record<string, number>;
  vendorComment: string;
  utensilsCount: number;
  promoCode: string | null;
};

type AddressType = "HOME" | "WORK" | "OTHER";

type AddressState = {
  type: AddressType;
  lat: number | null;
  lng: number | null;
  addressText: string;
  street: string;
  house: string;
  entrance: string;
  apartment: string;
};

type CheckoutState = {
  deliveryComment: string;
  receiverPhone: string;
  paymentMethod: "CASH" | "CARD";
  changeRequired: boolean;
  changeForAmount: string;
  manualPromo: string;
};

type RatingDraft = {
  vendorStars: number;
  vendorComment: string;
  courierStars: number;
  courierComment: string;
};

const emptyCart: CartState = {
  vendorId: null,
  fulfillmentType: "DELIVERY",
  items: {},
  vendorComment: "",
  utensilsCount: 0,
  promoCode: null,
};

const emptyAddress: AddressState = {
  type: "HOME",
  lat: null,
  lng: null,
  addressText: "",
  street: "",
  house: "",
  entrance: "",
  apartment: "",
};

const emptyCheckout: CheckoutState = {
  deliveryComment: "",
  receiverPhone: "+998",
  paymentMethod: "CARD",
  changeRequired: false,
  changeForAmount: "",
  manualPromo: "",
};

const MAX_CLIENT_DISTANCE_KM = 30;

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [profileTab, setProfileTab] = useState<ProfileTab>("account");
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorDetails | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [cart, setCart] = useLocalStorage<CartState>("nodex_client_cart", emptyCart);
  const [address, setAddress] = useLocalStorage<AddressState>(
    "nodex_client_address",
    emptyAddress,
  );
  const [savedAddresses, setSavedAddresses] = useState<AddressEntry[]>([]);
  const [checkout, setCheckout] = useLocalStorage<CheckoutState>(
    "nodex_client_checkout",
    emptyCheckout,
  );
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersHistory, setOrdersHistory] = useState<OrderSummary[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCodeEntry[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useLocalStorage<string | null>(
    "nodex_client_active_order_id",
    null,
  );
  const [deliveryCode, setDeliveryCode] = useLocalStorage<string | null>(
    "nodex_client_delivery_code",
    null,
  );
  const [tracking, setTracking] = useState<{ lat: number; lng: number } | null>(null);
  const [trackingUpdatedAt, setTrackingUpdatedAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [ratingDraft, setRatingDraft] = useState<RatingDraft>({
    vendorStars: 5,
    vendorComment: "",
    courierStars: 5,
    courierComment: "",
  });
  const [addressForm, setAddressForm] = useState({
    type: "HOME" as AddressType,
    address_text: "",
    lat: "",
    lng: "",
    entrance: "",
    apartment: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const supportLink = useMemo(() => {
    const direct = import.meta.env.VITE_SUPPORT_TG_LINK as string | undefined;
    const username = import.meta.env.VITE_SUPPORT_TG_USERNAME as string | undefined;
    if (direct) {
      return direct;
    }
    if (username) {
      return `https://t.me/${username}`;
    }
    return "https://t.me/";
  }, []);

  useEffect(() => {
    getTelegramWebApp()?.ready?.();
    void loadHome();
  }, []);

  useEffect(() => {
    if (!activeOrderId) {
      return;
    }
    void refreshOrder(activeOrderId);
  }, [activeOrderId]);

  const loadHome = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vendorsData, categoriesData] = await Promise.all([
        listVendors(),
        listCategories(),
      ]);
      setVendors(vendorsData);
      setCategories(["All", ...categoriesData]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendors");
    } finally {
      setIsLoading(false);
    }
  };

  const loadVendor = async (vendorId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getVendor(vendorId);
      setSelectedVendor(data);
      setCart((prev) => ({
        ...prev,
        vendorId: data.vendor_id,
        fulfillmentType:
          data.supports_pickup && prev.fulfillmentType === "PICKUP"
            ? "PICKUP"
            : "DELIVERY",
      }));
      setExpandedItems({});
      setScreen("vendor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor");
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeStatuses = [
        "NEW",
        "ACCEPTED",
        "COOKING",
        "READY",
        "COURIER_ACCEPTED",
        "PICKED_UP",
        "READY_FOR_PICKUP",
      ];
      const [activeData, historyData] = await Promise.all([
        listOrders({ status: activeStatuses.join(",") }),
        listOrders({ status: "DELIVERED,CANCELLED,CANCELLED_BY_VENDOR,PICKED_UP_BY_CUSTOMER" }),
      ]);
      setOrders(activeData.orders);
      setOrdersHistory(historyData.orders);
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
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAddresses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAddresses();
      setSavedAddresses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load addresses");
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev.items };
      const current = next[itemId] ?? 0;
      const updated = current + delta;
      if (updated <= 0) {
        delete next[itemId];
      } else {
        next[itemId] = updated;
      }
      return { ...prev, items: next };
    });
  };

  const cartItems = useMemo(() => {
    if (!selectedVendor) {
      return [] as Array<{ item: MenuItem; quantity: number }>;
    }
    return selectedVendor.menu
      .filter((item) => cart.items[item.menu_item_id])
      .map((item) => ({ item, quantity: cart.items[item.menu_item_id] }));
  }, [cart.items, selectedVendor]);

  const totals = useMemo(() => {
    const itemsCount = cartItems.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = cartItems.reduce(
      (sum, line) => sum + line.quantity * line.item.price,
      0,
    );
    return { itemsCount, subtotal };
  }, [cartItems]);

  const canPickup = selectedVendor?.supports_pickup ?? false;
  const vendorGeo = useMemo(() => {
    if (selectedVendor?.geo) {
      return selectedVendor.geo;
    }
    if (!cart.vendorId) {
      return null;
    }
    return vendors.find((vendor) => vendor.vendor_id === cart.vendorId)?.geo ?? null;
  }, [selectedVendor, vendors, cart.vendorId]);
  const deliveryDistanceKm = useMemo(() => {
    if (cart.fulfillmentType !== "DELIVERY") {
      return null;
    }
    if (!vendorGeo || address.lat === null || address.lng === null) {
      return null;
    }
    return haversineKm(vendorGeo, { lat: address.lat, lng: address.lng });
  }, [address.lat, address.lng, cart.fulfillmentType, vendorGeo]);
  const deliveryTooFar =
    deliveryDistanceKm !== null && deliveryDistanceKm > MAX_CLIENT_DISTANCE_KM;
  const mapCenter =
    address.lat !== null && address.lng !== null
      ? { lat: address.lat, lng: address.lng }
      : DEFAULT_CENTER_QONIRAT;

  const buildOrderPayload = () => {
    const deliveryLocation =
      cart.fulfillmentType === "DELIVERY" && address.lat !== null && address.lng !== null
        ? {
            lat: address.lat,
            lng: address.lng,
          }
        : null;

    const promo = cart.promoCode && cart.promoCode.trim() ? cart.promoCode.trim() : null;

    return {
      vendor_id: cart.vendorId ?? "",
      fulfillment_type: cart.fulfillmentType,
      delivery_location: deliveryLocation,
      delivery_comment:
        cart.fulfillmentType === "DELIVERY" ? checkout.deliveryComment.trim() || null : null,
      vendor_comment: cart.vendorComment.trim() || null,
      utensils_count: cart.utensilsCount,
      receiver_phone: normalizeUzPhone(checkout.receiverPhone),
      payment_method: checkout.paymentMethod,
      change_for_amount:
        checkout.paymentMethod === "CASH" && checkout.changeRequired
          ? Number(checkout.changeForAmount) || null
          : null,
      address_text: address.addressText.trim() || null,
      address_street: address.street.trim() || null,
      address_house: address.house.trim() || null,
      address_entrance: address.entrance.trim() || null,
      address_apartment: address.apartment.trim() || null,
      promo_code: promo,
      items: cartItems.map(({ item, quantity }) => ({
        menu_item_id: item.menu_item_id,
        quantity,
      })),
    };
  };
  const handleCreateQuote = async () => {
    setError(null);
    if (!cart.vendorId) {
      setError("Select a vendor first.");
      return null;
    }
    if (cartItems.length === 0) {
      setError("Add items to the cart.");
      return null;
    }
    if (cart.fulfillmentType === "DELIVERY") {
      if (!checkout.deliveryComment.trim()) {
        setError("Комментарий курьеру обязателен.");
        return null;
      }
      if (address.lat === null || address.lng === null) {
        setError("Выберите адрес доставки.");
        return null;
      }
      if (deliveryTooFar) {
        setError("Слишком далеко для доставки.");
        return null;
      }
    }
    const normalizedPhone = normalizeUzPhone(checkout.receiverPhone);
    if (!normalizedPhone) {
      setError("Телефон получателя должен начинаться с +998.");
      return null;
    }
    setIsLoading(true);
    try {
      const data = await createQuote(buildOrderPayload());
      setQuote(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate quote");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    setError(null);
    if (cart.fulfillmentType === "DELIVERY") {
      if (!checkout.deliveryComment.trim()) {
        setError("Комментарий курьеру обязателен.");
        return;
      }
      if (address.lat === null || address.lng === null) {
        setError("Выберите адрес доставки.");
        return;
      }
      if (deliveryTooFar) {
        setError("Слишком далеко для доставки.");
        return;
      }
    }
    const normalizedPhone = normalizeUzPhone(checkout.receiverPhone);
    if (!normalizedPhone) {
      setError("Телефон получателя должен начинаться с +998.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await createOrder(buildOrderPayload());
      setActiveOrderId(data.order_id);
      setDeliveryCode(data.delivery_code ?? null);
      setQuote(null);
      setScreen("orders");
      setCart((prev) => ({ ...prev, items: {} }));
      await refreshOrder(data.order_id);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrder = async (orderId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [orderData, trackingData] = await Promise.all([
        getOrder(orderId),
        getTracking(orderId),
      ]);
      setOrder(orderData);
      setTracking(trackingData.location);
      setTrackingUpdatedAt(trackingData.updated_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesCategory = selectedCategory === "All" || vendor.category === selectedCategory;
    const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const goToCart = async () => {
    if (cartItems.length === 0) {
      setError("Добавьте хотя бы один товар.");
      return;
    }
    setScreen("cart");
    try {
      const data = await listPromoCodes();
      setPromoCodes(data);
      setCart((prev) => ({
        ...prev,
        promoCode:
          prev.promoCode && data.some((entry) => entry.code === prev.promoCode)
            ? prev.promoCode
            : null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promo codes");
    }
  };

  const goToOrders = async () => {
    setScreen("orders");
    await loadOrders();
  };

  const openOrderDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setScreen("orderDetails");
    await refreshOrder(orderId);
  };

  useEffect(() => {
    if (screen !== "orderDetails" || !selectedOrderId) {
      return;
    }
    const interval = window.setInterval(() => {
      void refreshOrder(selectedOrderId);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [screen, selectedOrderId]);

  const goToAddress = () => {
    if (cartItems.length === 0) {
      setError("Добавьте хотя бы один товар.");
      return;
    }
    setScreen("address");
    void loadAddresses();
  };

  const goToCheckout = async () => {
    if (cartItems.length === 0) {
      setError("Добавьте хотя бы один товар.");
      return;
    }
    if (cart.fulfillmentType === "DELIVERY" && (address.lat === null || address.lng === null)) {
      setError("Выберите адрес доставки.");
      return;
    }
    if (cart.fulfillmentType === "DELIVERY" && deliveryTooFar) {
      setError("Слишком далеко для доставки.");
      return;
    }
    setScreen("checkout");
    await handleCreateQuote();
  };

  const handleSaveAddress = async () => {
    if (address.lat === null || address.lng === null) {
      setError("Выберите точку на карте.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await addAddress({
        type: address.type,
        address_text: address.addressText,
        lat: address.lat,
        lng: address.lng,
        entrance: address.entrance || null,
        apartment: address.apartment || null,
      });
      await loadAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setIsLoading(false);
    }
  };

  const ratingLabel = (vendor: VendorSummary | VendorDetails) => {
    const avg = vendor.rating_avg ?? 0;
    const count = vendor.rating_count ?? 0;
    return `${avg.toFixed(1)} (${count})`;
  };

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">Nodex Client</div>
        <nav className="tabs">
          <button className={screen === "home" ? "active" : ""} onClick={() => setScreen("home")}>
            Home
          </button>
          <button className={screen === "cart" ? "active" : ""} onClick={goToCart}>
            Cart
          </button>
          <button className={screen === "orders" ? "active" : ""} onClick={goToOrders}>
            Orders
          </button>
          <button
            className={screen === "profile" ? "active" : ""}
            onClick={() => {
              setScreen("profile");
              setProfileTab("account");
              void loadProfile();
              void loadAddresses();
              void listPromoCodes().then(setPromoCodes).catch(() => null);
            }}
          >
            Profile
          </button>
        </nav>
      </header>

      {error && <div className="error">{error}</div>}
      {isLoading && <div className="loading">Loading...</div>}

      {screen === "home" && (
        <section className="panel">
          <h2>Home</h2>
          <div className="tag-list">
            {categories.map((category) => (
              <button
                key={category}
                className={selectedCategory === category ? "tag active" : "tag"}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="Search vendors"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="card-list">
            {filteredVendors.map((vendor) => (
              <button
                key={vendor.vendor_id}
                className="card"
                onClick={() => void loadVendor(vendor.vendor_id)}
              >
                <div className="card-title">{vendor.name}</div>
                <div className="card-meta">Category: {vendor.category}</div>
                <div className="card-meta">Rating: {ratingLabel(vendor)}</div>
                <div className="tag-list">
                  {vendor.active_promotions?.length ? (
                    vendor.active_promotions.map((badge) => (
                      <span key={badge} className="tag">
                        {badge}
                      </span>
                    ))
                  ) : (
                    <span className="muted">No promotions</span>
                  )}
                </div>
              </button>
            ))}
            {filteredVendors.length === 0 && <p>No vendors found.</p>}
          </div>
        </section>
      )}

      {screen === "vendor" && selectedVendor && (
        <section className="panel">
          <button className="link" onClick={() => setScreen("home")}>
            Back to Home
          </button>
          <div className="vendor-header">
            <div>
              <h2>{selectedVendor.name}</h2>
              <p className="muted">{selectedVendor.description ?? ""}</p>
              <div className="muted">Rating: {ratingLabel(selectedVendor)}</div>
            </div>
            <div className="tag-list">
              {selectedVendor.active_promotions?.length ? (
                selectedVendor.active_promotions.map((badge) => (
                  <span key={badge} className="tag">
                    {badge}
                  </span>
                ))
              ) : (
                <span className="muted">No promotions</span>
              )}
            </div>
          </div>
          <div className="card-list">
            {selectedVendor.menu.filter((item) => item.is_available).map((item) => {
              const expanded = Boolean(expandedItems[item.menu_item_id]);
              return (
                <div key={item.menu_item_id} className="card">
                  <button
                    className="link"
                    onClick={() =>
                      setExpandedItems((prev) => ({
                        ...prev,
                        [item.menu_item_id]: !expanded,
                      }))
                    }
                  >
                    <div className="card-title">{item.title}</div>
                    {item.promo_badges?.length ? (
                      <div className="tag-list">
                        {item.promo_badges.map((badge) => (
                          <span key={badge} className="tag">
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="card-meta">{formatWeight(item)}</div>
                    <div className="card-meta">Price: {item.price}</div>
                  </button>
                  {expanded && <div className="muted">{item.description ?? ""}</div>}
                  <div className="quantity">
                    <button onClick={() => updateItemQuantity(item.menu_item_id, -1)}>-</button>
                    <span>{cart.items[item.menu_item_id] ?? 0}</span>
                    <button onClick={() => updateItemQuantity(item.menu_item_id, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
          {totals.itemsCount > 0 && (
            <StickyBar itemsCount={totals.itemsCount} subtotal={totals.subtotal} onNext={goToCart} />
          )}
        </section>
      )}

      {screen === "cart" && (
        <section className="panel">
          <h2>Cart</h2>
          {cartItems.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <div className="list">
              {cartItems.map(({ item, quantity }) => (
                <div key={item.menu_item_id} className="row">
                  <div>
                    <div>{item.title}</div>
                    <div className="muted">{item.description ?? ""}</div>
                    <div className="muted">{formatWeight(item)}</div>
                    <div className="muted">Price: {item.price}</div>
                  </div>
                  <div className="quantity">
                    <button onClick={() => updateItemQuantity(item.menu_item_id, -1)}>-</button>
                    <span>{quantity}</span>
                    <button onClick={() => updateItemQuantity(item.menu_item_id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="field">
            <label>Способ получения</label>
            <div className="inline">
              <button
                className={cart.fulfillmentType === "DELIVERY" ? "tag active" : "tag"}
                onClick={() => setCart((prev) => ({ ...prev, fulfillmentType: "DELIVERY" }))}
              >
                DELIVERY
              </button>
              {canPickup && (
                <button
                  className={cart.fulfillmentType === "PICKUP" ? "tag active" : "tag"}
                  onClick={() => setCart((prev) => ({ ...prev, fulfillmentType: "PICKUP" }))}
                >
                  PICKUP
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label>Приборы и салфетки</label>
            <div className="inline">
              <button
                className="secondary"
                onClick={() =>
                  setCart((prev) => ({
                    ...prev,
                    utensilsCount: Math.max(prev.utensilsCount - 1, 0),
                  }))
                }
              >
                -
              </button>
              <span>{cart.utensilsCount}</span>
              <button
                className="secondary"
                onClick={() =>
                  setCart((prev) => ({
                    ...prev,
                    utensilsCount: prev.utensilsCount + 1,
                  }))
                }
              >
                +
              </button>
            </div>
          </div>

          <div className="field">
            <label>Комментарий ресторану</label>
            <textarea
              className="input"
              value={cart.vendorComment}
              onChange={(event) => setCart((prev) => ({ ...prev, vendorComment: event.target.value }))}
            />
          </div>

          <TotalsBlock quote={quote} subtotal={totals.subtotal} />

          {totals.itemsCount > 0 && (
            <StickyBar itemsCount={totals.itemsCount} subtotal={totals.subtotal} onNext={goToAddress} />
          )}
        </section>
      )}

      {screen === "address" && (
        <section className="panel">
          <button className="link" onClick={() => setScreen("cart")}>
            Назад
          </button>
          <h2>Адрес доставки</h2>
          <div className="tag-list">
            {(["HOME", "WORK", "OTHER"] as AddressType[]).map((type) => (
              <button
                key={type}
                className={address.type === type ? "tag active" : "tag"}
                onClick={() => setAddress((prev) => ({ ...prev, type }))}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="field">
            <label>Адрес</label>
            <input
              className="input"
              value={address.addressText}
              onChange={(event) => setAddress((prev) => ({ ...prev, addressText: event.target.value }))}
              placeholder="Улица, дом"
            />
          </div>

          <div className="grid">
            <label>
              Улица
              <input
                className="input"
                value={address.street}
                onChange={(event) => setAddress((prev) => ({ ...prev, street: event.target.value }))}
              />
            </label>
            <label>
              Дом
              <input
                className="input"
                value={address.house}
                onChange={(event) => setAddress((prev) => ({ ...prev, house: event.target.value }))}
              />
            </label>
            <label>
              Подъезд
              <input
                className="input"
                value={address.entrance}
                onChange={(event) => setAddress((prev) => ({ ...prev, entrance: event.target.value }))}
              />
            </label>
            <label>
              Квартира
              <input
                className="input"
                value={address.apartment}
                onChange={(event) => setAddress((prev) => ({ ...prev, apartment: event.target.value }))}
              />
            </label>
          </div>

          <div className="field">
            <label>Точка на карте</label>
            <div className="inline">
              <button className="secondary" onClick={() => setShowMap(true)}>
                Pick on map
              </button>
              {address.lat !== null && address.lng !== null && (
                <span className="muted">
                  {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                </span>
              )}
            </div>
            {deliveryTooFar && (
              <div className="error">Слишком далеко (более {MAX_CLIENT_DISTANCE_KM} км).</div>
            )}
          </div>

          {savedAddresses.length > 0 && (
            <div className="list">
              <div className="muted">Saved addresses</div>
              {savedAddresses.map((entry) => (
                <button
                  key={entry.id}
                  className="card"
                  onClick={() =>
                    setAddress((prev) => ({
                      ...prev,
                      type: entry.type,
                      lat: entry.lat,
                      lng: entry.lng,
                      addressText: entry.address_text,
                      entrance: entry.entrance ?? "",
                      apartment: entry.apartment ?? "",
                    }))
                  }
                >
                  <div className="card-title">{entry.address_text}</div>
                  <div className="muted">
                    {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="inline">
            <button className="secondary" onClick={handleSaveAddress}>
              Сохранить адрес
            </button>
            <button
              className="primary"
              onClick={goToCheckout}
              disabled={
                cart.fulfillmentType === "DELIVERY" &&
                (address.lat === null || address.lng === null || deliveryTooFar)
              }
            >
              Далее
            </button>
          </div>
        </section>
      )}
      {screen === "checkout" && (
        <section className="panel">
          <button className="link" onClick={() => setScreen("address")}>
            Назад
          </button>
          <h2>Оформление</h2>

          <div className="field">
            <label>Комментарий курьеру</label>
            <textarea
              className="input"
              value={checkout.deliveryComment}
              onChange={(event) =>
                setCheckout((prev) => ({ ...prev, deliveryComment: event.target.value }))
              }
              placeholder="Инструкции для курьера"
            />
          </div>

          <div className="field">
            <label>Телефон получателя</label>
            <input
              className="input"
              value={checkout.receiverPhone}
              onChange={(event) =>
                setCheckout((prev) => ({
                  ...prev,
                  receiverPhone: sanitizeUzPhoneInput(event.target.value),
                }))
              }
              placeholder="+998XXXXXXXXX"
            />
          </div>

          <div className="field">
            <label>Промокоды</label>
            <div className="tag-list">
              <button
                className={!cart.promoCode ? "tag active" : "tag"}
                onClick={() => setCart((prev) => ({ ...prev, promoCode: null }))}
              >
                Без промокода
              </button>
              {promoCodes.map((promo) => (
                <button
                  key={promo.id}
                  className={cart.promoCode === promo.code ? "tag active" : "tag"}
                  onClick={() => setCart((prev) => ({ ...prev, promoCode: promo.code }))}
                  disabled={promo.status && promo.status !== "ACTIVE"}
                >
                  {promo.code}
                </button>
              ))}
              {promoCodes.length === 0 && <span className="muted">Нет сохраненных промокодов</span>}
            </div>
            <PromoCodeForm
              value={checkout.manualPromo}
              onChange={(value) => setCheckout((prev) => ({ ...prev, manualPromo: value }))}
              onAdd={async (value) => {
                setIsLoading(true);
                setError(null);
                try {
                  const entry = await addPromoCode(value);
                  setPromoCodes((prev) => [entry, ...prev]);
                  setCheckout((prev) => ({ ...prev, manualPromo: "" }));
                  setCart((prev) => ({ ...prev, promoCode: entry.code }));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to add promo code");
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </div>

          <div className="field">
            <label>Оплата</label>
            <div className="inline">
              <button
                className={checkout.paymentMethod === "CARD" ? "tag active" : "tag"}
                onClick={() => setCheckout((prev) => ({ ...prev, paymentMethod: "CARD" }))}
              >
                CARD
              </button>
              <button
                className={checkout.paymentMethod === "CASH" ? "tag active" : "tag"}
                onClick={() => setCheckout((prev) => ({ ...prev, paymentMethod: "CASH" }))}
              >
                CASH
              </button>
            </div>
          </div>

          {checkout.paymentMethod === "CASH" && (
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={checkout.changeRequired}
                  onChange={(event) =>
                    setCheckout((prev) => ({ ...prev, changeRequired: event.target.checked }))
                  }
                />
                Требуется сдача?
              </label>
              {checkout.changeRequired && (
                <input
                  className="input"
                  value={checkout.changeForAmount}
                  onChange={(event) =>
                    setCheckout((prev) => ({ ...prev, changeForAmount: event.target.value }))
                  }
                  placeholder="Сдача с суммы"
                />
              )}
            </div>
          )}

          <TotalsBlock quote={quote} subtotal={totals.subtotal} />

          <div className="inline">
            <button className="secondary" onClick={handleCreateQuote}>
              Обновить расчет
            </button>
            <button
              className="primary"
              onClick={handleCreateOrder}
              disabled={
                cart.fulfillmentType === "DELIVERY" &&
                (address.lat === null || address.lng === null || deliveryTooFar)
              }
            >
              Отправить заказ
            </button>
          </div>
        </section>
      )}

      {screen === "orders" && (
        <section className="panel">
          <div className="page-header">
            <h2>Orders</h2>
            <button className="secondary" onClick={() => void loadOrders()}>
              Refresh
            </button>
          </div>

          <h3>Active</h3>
          {orders.length === 0 ? (
            <p>No active orders.</p>
          ) : (
            <div className="card-list">
              {orders.map((entry) => (
                <button
                  key={entry.order_id}
                  className="card"
                  onClick={() => void openOrderDetails(entry.order_id)}
                >
                  <div className="card-title">{entry.vendor_name}</div>
                  <div className="card-meta">Status: {entry.status}</div>
                  <div className="card-meta">Total: {entry.total}</div>
                  <div className="card-meta">Type: {entry.fulfillment_type}</div>
                  <div className="card-meta">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}

          <h3>History</h3>
          {ordersHistory.length === 0 ? (
            <p>No past orders.</p>
          ) : (
            <div className="card-list">
              {ordersHistory.map((entry) => (
                <button
                  key={entry.order_id}
                  className="card"
                  onClick={() => void openOrderDetails(entry.order_id)}
                >
                  <div className="card-title">{entry.vendor_name}</div>
                  <div className="card-meta">Status: {entry.status}</div>
                  <div className="card-meta">Total: {entry.total}</div>
                  <div className="card-meta">Type: {entry.fulfillment_type}</div>
                  <div className="card-meta">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {screen === "orderDetails" && (
        <section className="panel">
          <button className="link" onClick={goToOrders}>
            Назад к заказам
          </button>
          {order ? (
            <div className="list">
              <div className="row">
                <div>
                  <div className="card-title">{order.vendor_name ?? order.vendor_id}</div>
                  <div className="muted">Status: {order.status}</div>
                  <div className="muted">
                    Courier: {order.courier_id ? "assigned" : "not assigned"}
                  </div>
                  {order.courier_id && (
                    <div className="muted">
                      Courier rating:{" "}
                      {order.courier_rating_avg !== null &&
                      order.courier_rating_avg !== undefined
                        ? `${order.courier_rating_avg.toFixed(1)} (${order.courier_rating_count ?? 0})`
                        : "-"}
                    </div>
                  )}
                  <div className="muted">Total: {order.total}</div>
                  <div className="muted">Delivery comment: {order.delivery_comment}</div>
                  <div className="muted">Vendor comment: {order.vendor_comment}</div>
                  <div className="muted">Receiver phone: {order.receiver_phone ?? "-"}</div>
                  <div className="muted">
                    Payment: {order.payment_method ?? "-"}{" "}
                    {order.change_for_amount ? `(change ${order.change_for_amount})` : ""}
                  </div>
                  <div className="muted">Address: {order.address_text ?? "-"}</div>
                  <div className="muted">
                    Entrance/Apt: {order.address_entrance ?? "-"} /{" "}
                    {order.address_apartment ?? "-"}
                  </div>
                </div>
                <button
                  className="secondary"
                  onClick={() => order.order_id && void refreshOrder(order.order_id)}
                >
                  Refresh
                </button>
              </div>

              {deliveryCode && (
                <div className="row">
                  <div className="card-title">Delivery code</div>
                  <div className="muted">{deliveryCode}</div>
                </div>
              )}

              <div className="totals">
                <div className="row">
                  <div>Items subtotal</div>
                  <div>{order.items_subtotal}</div>
                </div>
                <div className="row">
                  <div>Discount</div>
                  <div>-{order.discount_total}</div>
                </div>
                <div className="row">
                  <div>Promo code</div>
                  <div>-{order.promo_code_discount}</div>
                </div>
                <div className="row">
                  <div>Service fee</div>
                  <div>{order.service_fee}</div>
                </div>
                <div className="row">
                  <div>Delivery fee</div>
                  <div>{order.delivery_fee}</div>
                </div>
                <div className="row">
                  <div>Total</div>
                  <div>{order.total}</div>
                </div>
              </div>

              <div className="list">
                <div className="card-title">Items</div>
                {order.items.map((item) => (
                  <div key={item.menu_item_id} className="row">
                    <div>
                      <div>{item.title ?? item.menu_item_id}</div>
                      {item.weight_value && item.weight_unit && (
                        <div className="muted">
                          {item.weight_value} {item.weight_unit}
                        </div>
                      )}
                      <div className="muted">Qty: {item.quantity}</div>
                    </div>
                    <div className="muted">{item.price}</div>
                  </div>
                ))}
              </div>

              <div className="list">
                <div className="card-title">Status timeline</div>
                <div className="tag-list">
                  {["NEW", "ACCEPTED", "COOKING", "READY", "COURIER_ACCEPTED", "PICKED_UP", "DELIVERED"].map(
                    (step) => (
                      <span key={step} className={order.status === step ? "tag active" : "tag"}>
                        {step}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="card-title">Tracking</div>
                <NavigationMap
                  mode="track"
                  pickup={
                    order.vendor_geo
                      ? { lat: order.vendor_geo.lat, lng: order.vendor_geo.lng, label: "Pickup" }
                      : null
                  }
                  dropoff={
                    order.delivery_location
                      ? { lat: order.delivery_location.lat, lng: order.delivery_location.lng, label: "Dropoff" }
                      : null
                  }
                  courier={tracking ?? null}
                />
                {tracking ? (
                  <div className="muted">
                    Last update:{" "}
                    {trackingUpdatedAt ? new Date(trackingUpdatedAt).toLocaleTimeString() : "-"}
                  </div>
                ) : (
                  <div className="muted">Courier location not available yet.</div>
                )}
              </div>

              {order.status === "DELIVERED" || order.status === "PICKED_UP_BY_CUSTOMER" ? (
                <div className="panel">
                  <h3>Rate your order</h3>
                  {order.rating ? (
                    <div className="muted">Thanks for rating!</div>
                  ) : (
                    <>
                      <div className="field">
                        <label>Vendor stars</label>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          max={5}
                          value={ratingDraft.vendorStars}
                          onChange={(event) =>
                            setRatingDraft((prev) => ({
                              ...prev,
                              vendorStars: Number(event.target.value),
                            }))
                          }
                        />
                        <textarea
                          className="input"
                          placeholder="Vendor comment"
                          value={ratingDraft.vendorComment}
                          onChange={(event) =>
                            setRatingDraft((prev) => ({
                              ...prev,
                              vendorComment: event.target.value,
                            }))
                          }
                        />
                      </div>
                      {order.courier_id && (
                        <div className="field">
                          <label>Courier stars</label>
                          <input
                            className="input"
                            type="number"
                            min={1}
                            max={5}
                            value={ratingDraft.courierStars}
                            onChange={(event) =>
                              setRatingDraft((prev) => ({
                                ...prev,
                                courierStars: Number(event.target.value),
                              }))
                            }
                          />
                          <textarea
                            className="input"
                            placeholder="Courier comment"
                            value={ratingDraft.courierComment}
                            onChange={(event) =>
                              setRatingDraft((prev) => ({
                                ...prev,
                                courierComment: event.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                      <button
                        className="primary"
                        onClick={async () => {
                          if (!order.order_id) return;
                          setIsLoading(true);
                          setError(null);
                          try {
                            await submitOrderRating(order.order_id, {
                              vendor_stars: ratingDraft.vendorStars,
                              vendor_comment: ratingDraft.vendorComment,
                              courier_stars: order.courier_id ? ratingDraft.courierStars : null,
                              courier_comment: order.courier_id
                                ? ratingDraft.courierComment
                                : null,
                            });
                            await refreshOrder(order.order_id);
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Failed to submit rating",
                            );
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        Submit rating
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <p>No order selected.</p>
          )}
        </section>
      )}

      {screen === "profile" && (
        <section className="panel">
          <h2>Profile</h2>
          <div className="tag-list">
            {(["account", "addresses", "promo", "support", "about"] as ProfileTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  className={profileTab === tab ? "tag active" : "tag"}
                  onClick={() => setProfileTab(tab)}
                >
                  {tab}
                </button>
              ),
            )}
          </div>

          {profileTab === "account" && (
            <div className="list">
              <div className="card">
                <div className="card-title">Account</div>
                <div className="field">
                  <label>Full name</label>
                  <input
                    className="input"
                    value={profile?.full_name ?? ""}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev
                          ? { ...prev, full_name: event.target.value }
                          : {
                              client_id: "local",
                              full_name: event.target.value,
                              phone: null,
                              telegram_username: null,
                              about: null,
                            },
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input
                    className="input"
                    value={profile?.phone ?? ""}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev
                          ? { ...prev, phone: event.target.value }
                          : {
                              client_id: "local",
                              full_name: null,
                              phone: event.target.value,
                              telegram_username: null,
                              about: null,
                            },
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label>Telegram username</label>
                  <input
                    className="input"
                    value={profile?.telegram_username ?? ""}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev
                          ? { ...prev, telegram_username: event.target.value }
                          : {
                              client_id: "local",
                              full_name: null,
                              phone: null,
                              telegram_username: event.target.value,
                              about: null,
                            },
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label>About</label>
                  <textarea
                    className="input"
                    value={profile?.about ?? ""}
                    onChange={(event) =>
                      setProfile((prev) =>
                        prev
                          ? { ...prev, about: event.target.value }
                          : {
                              client_id: "local",
                              full_name: null,
                              phone: null,
                              telegram_username: null,
                              about: event.target.value,
                            },
                      )
                    }
                  />
                </div>
                <button
                  className="primary"
                  onClick={async () => {
                    if (!profile) return;
                    setIsLoading(true);
                    setError(null);
                    try {
                      const updated = await updateProfile({
                        full_name: profile.full_name,
                        phone: profile.phone,
                        telegram_username: profile.telegram_username,
                        about: profile.about,
                      });
                      setProfile(updated);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to update profile");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {profileTab === "addresses" && (
            <div className="list">
              <button className="secondary" onClick={() => void loadAddresses()}>
                Refresh addresses
              </button>
              <div className="card">
                <div className="card-title">Add address</div>
                <div className="field">
                  <label>Type</label>
                  <div className="inline">
                    {(["HOME", "WORK", "OTHER"] as AddressType[]).map((type) => (
                      <button
                        key={type}
                        className={addressForm.type === type ? "tag active" : "tag"}
                        onClick={() => setAddressForm((prev) => ({ ...prev, type }))}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Address</label>
                  <input
                    className="input"
                    value={addressForm.address_text}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, address_text: event.target.value }))
                    }
                  />
                </div>
                <div className="grid">
                  <label>
                    Lat
                    <input
                      className="input"
                      value={addressForm.lat}
                      onChange={(event) =>
                        setAddressForm((prev) => ({ ...prev, lat: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Lng
                    <input
                      className="input"
                      value={addressForm.lng}
                      onChange={(event) =>
                        setAddressForm((prev) => ({ ...prev, lng: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Entrance
                    <input
                      className="input"
                      value={addressForm.entrance}
                      onChange={(event) =>
                        setAddressForm((prev) => ({ ...prev, entrance: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Apartment
                    <input
                      className="input"
                      value={addressForm.apartment}
                      onChange={(event) =>
                        setAddressForm((prev) => ({ ...prev, apartment: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <button
                  className="primary"
                  onClick={async () => {
                    const lat = Number(addressForm.lat);
                    const lng = Number(addressForm.lng);
                    if (!addressForm.address_text.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
                      setError("Address, lat, and lng are required.");
                      return;
                    }
                    setIsLoading(true);
                    setError(null);
                    try {
                      await addAddress({
                        type: addressForm.type,
                        address_text: addressForm.address_text.trim(),
                        lat,
                        lng,
                        entrance: addressForm.entrance.trim() || null,
                        apartment: addressForm.apartment.trim() || null,
                      });
                      setAddressForm({
                        type: "HOME",
                        address_text: "",
                        lat: "",
                        lng: "",
                        entrance: "",
                        apartment: "",
                      });
                      await loadAddresses();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to add address");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  Save address
                </button>
              </div>
              {savedAddresses.length === 0 ? (
                <div className="muted">No saved addresses.</div>
              ) : (
                savedAddresses.map((entry) => (
                  <div key={entry.id} className="row">
                    <div>
                      <div>{entry.type}</div>
                      <div className="muted">{entry.address_text}</div>
                    </div>
                    <button
                      className="secondary"
                      onClick={async () => {
                        setIsLoading(true);
                        setError(null);
                        try {
                          await removeAddress(entry.id);
                          await loadAddresses();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Failed to remove address");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {profileTab === "promo" && (
            <div className="list">
              <div className="row">
                <div>Saved promo codes</div>
                <button className="secondary" onClick={() => void listPromoCodes().then(setPromoCodes)}>
                  Refresh
                </button>
              </div>
              {promoCodes.map((promo) => (
                <div key={promo.id} className="row">
                  <div>
                    <div>{promo.code}</div>
                    <div className="muted">{promo.status ?? "-"}</div>
                  </div>
                  <button
                    className="secondary"
                    onClick={async () => {
                      setIsLoading(true);
                      setError(null);
                      try {
                        await removePromoCode(promo.id);
                        setPromoCodes((prev) => prev.filter((entry) => entry.id !== promo.id));
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to remove promo code");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <PromoCodeForm
                value={checkout.manualPromo}
                onChange={(value) => setCheckout((prev) => ({ ...prev, manualPromo: value }))} 
                onAdd={async (value) => {
                  setIsLoading(true);
                  setError(null);
                  try {
                    const entry = await addPromoCode(value);
                    setPromoCodes((prev) => [entry, ...prev]);
                    setCheckout((prev) => ({ ...prev, manualPromo: "" }));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to add promo code");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              />
            </div>
          )}

          {profileTab === "support" && (
            <div className="list">
              <button className="primary" onClick={() => openTelegramSupport(supportLink)}>
                Support
              </button>
              <button
                className="secondary"
                onClick={() => openTelegramSupport(`${supportLink}?start=become_courier`)}
              >
                Become courier
              </button>
              <button
                className="secondary"
                onClick={() => openTelegramSupport(`${supportLink}?start=become_partner`)}
              >
                Become partner
              </button>
            </div>
          )}

          {profileTab === "about" && (
            <div className="list">
              <div className="card">
                <div className="card-title">About service</div>
                <div className="muted">Version: 0.1.0</div>
                <div className="muted">Service fee: 3000</div>
                <div className="muted">Delivery fee: 3000 + distance</div>
              </div>
            </div>
          )}
        </section>
      )}

      {showMap && (
        <div className="modal">
          <div className="modal-content">
            <div className="row">
              <div className="card-title">Select delivery location</div>
              <div className="inline">
                <button
                  className="secondary"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      setError("Geolocation is not available.");
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setAddress((prev) => ({
                          ...prev,
                          lat: position.coords.latitude,
                          lng: position.coords.longitude,
                          addressText: prev.addressText || "My location",
                        }));
                      },
                      () => setError("Failed to get your location."),
                    );
                  }}
                >
                  Use my location
                </button>
                <button className="secondary" onClick={() => setShowMap(false)}>
                  Close
                </button>
              </div>
            </div>
            <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM} className="map">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker
                position={
                  address.lat !== null && address.lng !== null
                    ? { lat: address.lat, lng: address.lng }
                    : null
                }
                onPick={(lat, lng) =>
                  setAddress((prev) => ({
                    ...prev,
                    lat,
                    lng,
                    addressText: prev.addressText || "Selected location",
                  }))
                }
              />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function StickyBar({
  itemsCount,
  subtotal,
  onNext,
}: {
  itemsCount: number;
  subtotal: number;
  onNext: () => void;
}) {
  return (
    <div className="sticky-bar">
      <div>
        {itemsCount} items · {subtotal}
      </div>
      <button className="primary" onClick={onNext}>
        Далее
      </button>
    </div>
  );
}

function TotalsBlock({ quote, subtotal }: { quote: QuoteResponse | null; subtotal: number }) {
  if (!quote) {
    return (
      <div className="totals">
        <div className="row">
          <div>Items subtotal</div>
          <div>{subtotal}</div>
        </div>
        <div className="row">
          <div>Discounts</div>
          <div>-0</div>
        </div>
        <div className="row">
          <div>Promo code</div>
          <div>-0</div>
        </div>
        <div className="row">
          <div>Service fee</div>
          <div>—</div>
        </div>
        <div className="row">
          <div>Delivery fee</div>
          <div>—</div>
        </div>
        <div className="row">
          <div>Total</div>
          <div>—</div>
        </div>
      </div>
    );
  }
  return (
    <div className="totals">
      <div className="row">
        <div>Items subtotal</div>
        <div>{quote.items_subtotal}</div>
      </div>
      <div className="row">
        <div>Discounts</div>
        <div>-{quote.discount_total}</div>
      </div>
      <div className="row">
        <div>Promo code</div>
        <div>-{quote.promo_code_discount}</div>
      </div>
      <div className="row">
        <div>Service fee</div>
        <div>{quote.service_fee}</div>
      </div>
      <div className="row">
        <div>Delivery fee</div>
        <div>{quote.delivery_fee}</div>
      </div>
      <div className="row">
        <div>Total</div>
        <div>{quote.total}</div>
      </div>
    </div>
  );
}

function PromoCodeForm({
  value,
  onChange,
  onAdd,
}: {
  value: string;
  onChange: (value: string) => void;
  onAdd: (value: string) => void;
}) {
  return (
    <div className="inline">
      <input
        className="input"
        placeholder="Add promo code"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button className="secondary" onClick={() => value.trim() && onAdd(value.trim())}>
        Add
      </button>
    </div>
  );
}

function LocationPicker({
  position,
  onPick,
}: {
  position: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  if (!position) {
    return null;
  }

  return <Marker position={position} />;
}

function formatWeight(item: MenuItem) {
  if (!item.weight_value || !item.weight_unit) {
    return "";
  }
  return `${item.weight_value} ${item.weight_unit}`;
}

function sanitizeUzPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  let normalized = digits.startsWith("998") ? digits : `998${digits.replace(/^0+/, "")}`;
  if (normalized.length < 3) {
    normalized = "998";
  }
  return `+${normalized.slice(0, 12)}`;
}

function normalizeUzPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits.startsWith("998")) {
    return null;
  }
  if (digits.length !== 12) {
    return null;
  }
  return `+${digits}`;
}
