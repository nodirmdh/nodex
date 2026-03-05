import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageShell,
  Select,
  Skeleton,
  StatusBadge,
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
  toast,
} from "@nodex/ui";
import { useTranslation } from "react-i18next";
import { LANGUAGES, formatDateTime, formatNumber, getLanguage, setLanguage, translateFulfillment, translatePayment, translateStatus } from "@nodex/i18n";
import {
  BarChart3,
  ClipboardList,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Settings,
} from "lucide-react";
import { ApiClient, MenuItem, VendorOrderDetails, VendorOrderSummary } from "./api/client";
import { resolveAssetUrl } from "./utils/resolveAssetUrl";

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

const client = new ApiClient();
const isDevMode = client.isDevMode();

function AppLayout({
  children,
  vendorId,
  onVendorIdChange,
  showVendorId,
  onLogout,
}: {
  children: React.ReactNode;
  vendorId: string;
  onVendorIdChange: (value: string) => void;
  showVendorId: boolean;
  onLogout?: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    client.setVendorId(vendorId || null);
  }, [vendorId]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <aside className="fixed left-0 top-0 flex h-full w-64 flex-col gap-6 border-r border-slate-100 bg-white/90 px-6 py-8 backdrop-blur">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <LayoutDashboard className="h-5 w-5 text-sky-600" />
          {t("vendor.title")}
        </div>
        {showVendorId && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">{t("vendor.vendorId")}</label>
            <Input
              value={vendorId}
              onChange={(event) => onVendorIdChange(event.target.value)}
              placeholder={t("vendor.vendorIdPlaceholder")}
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">{t("client.language")}</label>
          <Select
            value={getLanguage()}
            onChange={(event) => setLanguage(event.target.value as "ru" | "uz" | "kaa" | "en")}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </Select>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100" to="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            {t("nav.home")}
          </Link>
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100" to="/orders">
            <ClipboardList className="h-4 w-4" />
            {t("nav.orders")}
          </Link>
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100" to="/promotions">
            <Gift className="h-4 w-4" />
            {t("nav.promotions")}
          </Link>
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100" to="/stats">
            <BarChart3 className="h-4 w-4" />
            {t("nav.statistics")}
          </Link>
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100" to="/menu">
            <Package className="h-4 w-4" />
            {t("nav.menu")}
          </Link>
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100" to="/account">
            <Settings className="h-4 w-4" />
            {t("nav.account")}
          </Link>
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100" to="/support">
            <LifeBuoy className="h-4 w-4" />
            {t("nav.support")}
          </Link>
        </nav>
        {onLogout && (
          <Button variant="secondary" onClick={onLogout}>
            {t("common.logout")}
          </Button>
        )}
      </aside>
      <main className="ml-64 px-10 py-8">{children}</main>
    </div>
  );
}

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
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={position}
        zoom={DEFAULT_ZOOM}
        className="h-64 w-full"
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler />
        {lat !== null && lng !== null && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}

export function App() {
  const isDevMode = client.isDevMode();
  const [vendorId, setVendorId] = useState<string>(
    window.localStorage.getItem("nodex_vendor_id") ?? "",
  );
  const [token, setToken] = useState<string | null>(client.getToken());

  useEffect(() => {
    if (vendorId) {
      window.localStorage.setItem("nodex_vendor_id", vendorId);
    }
  }, [vendorId]);

  if (!isDevMode && !token) {
    return (
      <VendorLogin
        onSuccess={(newToken) => {
          client.setToken(newToken);
          setToken(newToken);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <AppLayout
        vendorId={vendorId}
        onVendorIdChange={setVendorId}
        showVendorId={isDevMode}
        onLogout={
          isDevMode
            ? undefined
            : () => {
                client.setToken(null);
                setToken(null);
              }
        }
      >
        <Routes>
          <Route path="/" element={<DashboardPage vendorId={vendorId} />} />
          <Route path="/dashboard" element={<DashboardPage vendorId={vendorId} />} />
          <Route path="/orders" element={<OrdersPage vendorId={vendorId} />} />
          <Route path="/orders/:orderId" element={<OrderDetailsPage vendorId={vendorId} />} />
          <Route path="/promotions" element={<PromotionsPage vendorId={vendorId} />} />
          <Route path="/stats" element={<StatisticsPage vendorId={vendorId} />} />
          <Route path="/menu" element={<MenuPage vendorId={vendorId} />} />
          <Route path="/account" element={<AccountPage vendorId={vendorId} />} />
          <Route path="/support" element={<SupportPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

function VendorLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const { t } = useTranslation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Card className="space-y-4">
          <h1 className="text-lg font-semibold">{t("vendor.loginTitle")}</h1>
          <label className="text-sm">
            {t("admin.vendors.form.login")}
            <Input value={login} onChange={(event) => setLogin(event.target.value)} />
          </label>
          <label className="text-sm">
            {t("admin.vendors.form.password")}
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <div className="text-sm text-rose-500">{error}</div>}
          <Button
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              setError(null);
              try {
                const result = await client.login(login.trim(), password);
                onSuccess(result.token);
                toast.success(t("common.success"));
              } catch (err) {
                setError(err instanceof Error ? err.message : t("errors.loginFailed"));
              } finally {
                setIsLoading(false);
              }
            }}
          >
            {t("common.login")}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function OrdersPage({ vendorId }: { vendorId: string }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<VendorOrderSummary[]>([]);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isDevMode && !vendorId) {
        setOrders([]);
        setIsLoading(false);
        return;
      }
      const data = await client.listOrders({ status: tab });
      setOrders(data.orders);
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
  }, [vendorId, tab]);

  return (
    <PageShell
      title={t("vendor.ordersTitle")}
      subtitle={t("vendor.ordersSubtitle")}
      actions={<Button variant="secondary" onClick={() => void loadOrders()}>{t("common.refresh")}</Button>}
    >
      <div className="flex gap-2">
        <Button variant={tab === "active" ? "primary" : "secondary"} onClick={() => setTab("active")}>
          {t("vendor.active")}
        </Button>
        <Button variant={tab === "history" ? "primary" : "secondary"} onClick={() => setTab("history")}>
          {t("vendor.history")}
        </Button>
      </div>

      {error && <div className="text-sm text-rose-500">{error}</div>}
      {isDevMode && !vendorId && <div className="text-sm text-rose-500">{t("errors.vendorIdRequired")}</div>}
      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("courier.order")}</TableHeaderCell>
              <TableHeaderCell>{t("common.status")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.type")}</TableHeaderCell>
              <TableHeaderCell>{t("common.total")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.createdAt")}</TableHeaderCell>
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
                <TableCell>{translateFulfillment(order.fulfillment_type)}</TableCell>
                <TableCell>{formatNumber(order.total)}</TableCell>
                <TableCell>{formatDateTime(order.created_at)}</TableCell>
                <TableCell>
                  <Link className="text-sky-600" to={`/orders/${order.order_id}`}>
                    {t("common.view")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </PageShell>
  );
}

function DashboardPage({ vendorId }: { vendorId: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<Awaited<ReturnType<typeof client.getDashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (isDevMode && !vendorId) {
          setData(null);
          setIsLoading(false);
          return;
        }
        const response = await client.getDashboard("7d");
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.loadDashboard"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [vendorId]);

  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">{t("nav.dashboard")}</h2>
      {error && <div className="error-banner">{error}</div>}
      {isDevMode && !vendorId && <div className="error-banner">{t("errors.vendorIdRequired")}</div>}
      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : data ? (
        <>
          <div className="details-grid">
            <div>
              <strong>{t("vendor.revenue")}</strong>
              <div>{formatNumber(data.revenue)}</div>
            </div>
            <div>
              <strong>{t("vendor.completed")}</strong>
              <div>{formatNumber(data.completed_count)}</div>
            </div>
            <div>
              <strong>{t("vendor.averageCheck")}</strong>
              <div>{formatNumber(data.average_check)}</div>
            </div>
            <div>
              <strong>{t("fields.rating")}</strong>
              <div>
                {data.rating_avg.toFixed(1)} ({formatNumber(data.rating_count)})
              </div>
            </div>
          </div>
          <h2>{t("vendor.last7Days")}</h2>
          {data.daily.length === 0 ? (
            <p>{t("empty.noData")}</p>
          ) : (
            <ul className="event-list">
              {data.daily.map((entry) => (
                <li key={entry.date}>
                  <span>{entry.date}</span>
                  <span>
                    {formatNumber(entry.revenue)} / {formatNumber(entry.count)} {t("nav.orders")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p>{t("empty.noData")}</p>
      )}
    </section>
  );
}

function PromotionsPage({ vendorId }: { vendorId: string }) {
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<
    Array<{
      promotion_id: string;
      promo_type: string;
      value_numeric: number;
      priority: number;
      is_active: boolean;
      starts_at: string | null;
      ends_at: string | null;
      items: string[];
      combo_items: Array<{ menu_item_id: string; quantity: number }>;
      buy_x_get_y: {
        buy_item_id: string;
        buy_quantity: number;
        get_item_id: string;
        get_quantity: number;
        discount_percent: number;
      } | null;
      gift: { gift_item_id: string; gift_quantity: number; min_order_amount: number } | null;
    }>
  >([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    promo_type: "PERCENT",
    value_numeric: "",
    priority: "0",
    is_active: true,
    starts_at: "",
    ends_at: "",
    items: [] as string[],
    combo_items: [] as Array<{ menu_item_id: string; quantity: number }>,
    buy_x_get_y: {
      buy_item_id: "",
      buy_quantity: "1",
      get_item_id: "",
      get_quantity: "1",
      discount_percent: "100",
    },
    gift: {
      gift_item_id: "",
      gift_quantity: "1",
      min_order_amount: "0",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      promo_type: "PERCENT",
      value_numeric: "",
      priority: "0",
      is_active: true,
      starts_at: "",
      ends_at: "",
      items: [],
      combo_items: [],
      buy_x_get_y: {
        buy_item_id: "",
        buy_quantity: "1",
        get_item_id: "",
        get_quantity: "1",
        discount_percent: "100",
      },
      gift: {
        gift_item_id: "",
        gift_quantity: "1",
        min_order_amount: "0",
      },
    });
  };

  const loadPromotions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isDevMode && !vendorId) {
        setPromotions([]);
        setMenuItems([]);
        setIsLoading(false);
        return;
      }
      const [promoData, menuData] = await Promise.all([
        client.listPromotions(),
        client.listMenu(),
      ]);
      setPromotions(promoData.promotions);
      setMenuItems(menuData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadPromotions"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPromotions();
  }, [vendorId]);

  const filteredMenuItems = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return menuItems;
    return menuItems.filter(
      (item) =>
        item.title.toLowerCase().includes(value) ||
        (item.category ?? "").toLowerCase().includes(value),
    );
  }, [menuItems, search]);

  const buildSummary = (promo: (typeof promotions)[number]) => {
    switch (promo.promo_type) {
      case "PERCENT":
        return t("vendor.promotions.summary.percent", { value: promo.value_numeric, count: promo.items.length });
      case "FIXED_PRICE":
        return t("vendor.promotions.summary.fixed", { value: promo.value_numeric, count: promo.items.length });
      case "COMBO":
        return t("vendor.promotions.summary.combo", { count: promo.combo_items.length, value: promo.value_numeric });
      case "BUY_X_GET_Y":
        return promo.buy_x_get_y
          ? t("vendor.promotions.summary.buyXGetY", {
              buy: promo.buy_x_get_y.buy_quantity,
              get: promo.buy_x_get_y.get_quantity,
              percent: promo.buy_x_get_y.discount_percent,
            })
          : t("vendor.promotions.summary.buyXGetYFallback");
      case "GIFT":
        return promo.gift
          ? t("vendor.promotions.summary.gift", { qty: promo.gift.gift_quantity, min: promo.gift.min_order_amount })
          : t("vendor.promotions.summary.giftFallback");
      default:
        return promo.promo_type;
    }
  };

  const buildPayload = () => {
    const payload: {
      promo_type: string;
      value_numeric?: number;
      priority?: number;
      is_active?: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
      items?: string[];
      combo_items?: Array<{ menu_item_id: string; quantity: number }>;
      buy_x_get_y?: {
        buy_item_id: string;
        buy_quantity: number;
        get_item_id: string;
        get_quantity: number;
        discount_percent: number;
      } | null;
      gift?: { gift_item_id: string; gift_quantity: number; min_order_amount: number } | null;
    } = {
      promo_type: form.promo_type,
      priority: Number(form.priority) || 0,
      is_active: form.is_active,
      starts_at: form.starts_at ? form.starts_at : null,
      ends_at: form.ends_at ? form.ends_at : null,
    };

    if (form.promo_type === "PERCENT" || form.promo_type === "FIXED_PRICE") {
      payload.value_numeric = Number(form.value_numeric);
      payload.items = form.items;
    }
    if (form.promo_type === "COMBO") {
      payload.value_numeric = Number(form.value_numeric);
      payload.combo_items = form.combo_items;
    }
    if (form.promo_type === "BUY_X_GET_Y") {
      payload.value_numeric = 0;
      payload.buy_x_get_y = {
        buy_item_id: form.buy_x_get_y.buy_item_id,
        buy_quantity: Number(form.buy_x_get_y.buy_quantity),
        get_item_id: form.buy_x_get_y.get_item_id,
        get_quantity: Number(form.buy_x_get_y.get_quantity),
        discount_percent: Number(form.buy_x_get_y.discount_percent),
      };
    }
    if (form.promo_type === "GIFT") {
      payload.value_numeric = 0;
      payload.gift = {
        gift_item_id: form.gift.gift_item_id,
        gift_quantity: Number(form.gift.gift_quantity),
        min_order_amount: Number(form.gift.min_order_amount),
      };
    }

    return payload;
  };

  const validateForm = () => {
    if (form.promo_type === "PERCENT" || form.promo_type === "FIXED_PRICE") {
      if (!Number.isFinite(Number(form.value_numeric))) {
        return t("vendor.promotions.validation.valueRequired");
      }
      if (form.items.length === 0) {
        return t("vendor.promotions.validation.itemsRequired");
      }
    }
    if (form.promo_type === "COMBO") {
      if (!Number.isFinite(Number(form.value_numeric))) {
        return t("vendor.promotions.validation.comboPriceRequired");
      }
      if (form.combo_items.length === 0) {
        return t("vendor.promotions.validation.comboItemsRequired");
      }
    }
    if (form.promo_type === "BUY_X_GET_Y") {
      if (!form.buy_x_get_y.buy_item_id || !form.buy_x_get_y.get_item_id) {
        return t("vendor.promotions.validation.buyGetRequired");
      }
    }
    if (form.promo_type === "GIFT") {
      if (!form.gift.gift_item_id) {
        return t("vendor.promotions.validation.giftRequired");
      }
    }
    return null;
  };

  const startEdit = (promo: (typeof promotions)[number]) => {
    setEditingId(promo.promotion_id);
    setForm({
      promo_type: promo.promo_type,
      value_numeric: promo.value_numeric.toString(),
      priority: promo.priority.toString(),
      is_active: promo.is_active,
      starts_at: promo.starts_at ?? "",
      ends_at: promo.ends_at ?? "",
      items: promo.items ?? [],
      combo_items: promo.combo_items ?? [],
      buy_x_get_y: promo.buy_x_get_y
        ? {
            buy_item_id: promo.buy_x_get_y.buy_item_id,
            buy_quantity: promo.buy_x_get_y.buy_quantity.toString(),
            get_item_id: promo.buy_x_get_y.get_item_id,
            get_quantity: promo.buy_x_get_y.get_quantity.toString(),
            discount_percent: promo.buy_x_get_y.discount_percent.toString(),
          }
        : {
            buy_item_id: "",
            buy_quantity: "1",
            get_item_id: "",
            get_quantity: "1",
            discount_percent: "100",
          },
      gift: promo.gift
        ? {
            gift_item_id: promo.gift.gift_item_id,
            gift_quantity: promo.gift.gift_quantity.toString(),
            min_order_amount: promo.gift.min_order_amount.toString(),
          }
        : {
            gift_item_id: "",
            gift_quantity: "1",
            min_order_amount: "0",
          },
    });
  };

  return (
    <PageShell
      title={t("vendor.promotionsTitle")}
      subtitle={t("vendor.promotionsSubtitle")}
      actions={
        <Button variant="secondary" onClick={() => void loadPromotions()}>
          {t("common.refresh")}
        </Button>
      }
    >
      {error && (
        <Card className="border-rose-200 bg-rose-50 text-rose-700">
          {error}
        </Card>
      )}
      {isDevMode && !vendorId && (
        <Card className="border-amber-200 bg-amber-50 text-amber-700">
          {t("errors.vendorIdRequired")}
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {editingId ? t("vendor.editPromotion") : t("vendor.createPromotion")}
            </div>
            <div className="text-sm text-slate-500">
              {t("vendor.promotionHint")}
            </div>
          </div>
          <Badge variant={form.is_active ? "success" : "warning"}>
            {form.is_active ? t("vendor.promotions.status.active") : t("vendor.promotions.status.inactive")}
          </Badge>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            {t("fields.type")}
            <Select
              value={form.promo_type}
              onChange={(event) => setForm({ ...form, promo_type: event.target.value })}
              className="mt-1"
            >
              <option value="PERCENT">{t("promo.percent")}</option>
              <option value="FIXED_PRICE">{t("promo.fixedPrice")}</option>
              <option value="COMBO">{t("promo.combo")}</option>
              <option value="BUY_X_GET_Y">{t("promo.buyXGetY")}</option>
              <option value="GIFT">{t("promo.gift")}</option>
            </Select>
          </label>
          <label className="text-sm text-slate-600">
            {t("promo.priority")}
            <Input
              type="number"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
              className="mt-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            {t("fields.active")}
          </label>
          <label className="text-sm text-slate-600">
            {t("promo.startsAt")}
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
              className="mt-1"
            />
          </label>
          <label className="text-sm text-slate-600">
            {t("promo.endsAt")}
            <Input
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
              className="mt-1"
            />
          </label>
        </div>

        {(form.promo_type === "PERCENT" || form.promo_type === "FIXED_PRICE") && (
          <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label className="text-sm text-slate-600">
              {t("promo.value")}
              <Input
                type="number"
                value={form.value_numeric}
                onChange={(event) => setForm({ ...form, value_numeric: event.target.value })}
                className="mt-1"
              />
            </label>
            <Input
              placeholder={t("promo.searchMenu")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="grid gap-2 md:grid-cols-2">
              {filteredMenuItems.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.items.includes(item.id)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...form.items, item.id]
                        : form.items.filter((id) => id !== item.id);
                      setForm({ ...form, items: next });
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600"
                  />
                  {item.title}
                </label>
              ))}
            </div>
          </div>
        )}

        {form.promo_type === "COMBO" && (
          <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label className="text-sm text-slate-600">
              {t("promo.comboPrice")}
              <Input
                type="number"
                value={form.value_numeric}
                onChange={(event) => setForm({ ...form, value_numeric: event.target.value })}
                className="mt-1"
              />
            </label>
            <Input
              placeholder={t("promo.searchMenu")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {filteredMenuItems.map((item) => {
                const entry = form.combo_items.find((combo) => combo.menu_item_id === item.id);
                const qty = entry?.quantity ?? 0;
                return (
                  <label key={item.id} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                    <span>{item.title}</span>
                    <Input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        const next = form.combo_items.filter((combo) => combo.menu_item_id !== item.id);
                        if (value > 0) {
                          next.push({ menu_item_id: item.id, quantity: value });
                        }
                        setForm({ ...form, combo_items: next });
                      }}
                      className="w-24"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {form.promo_type === "BUY_X_GET_Y" && (
          <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              {t("promo.buyItem")}
              <Select
                value={form.buy_x_get_y.buy_item_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    buy_x_get_y: { ...form.buy_x_get_y, buy_item_id: event.target.value },
                  })
                }
                className="mt-1"
              >
                <option value="">Select</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm text-slate-600">
              {t("promo.buyQty")}
              <Input
                type="number"
                value={form.buy_x_get_y.buy_quantity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    buy_x_get_y: { ...form.buy_x_get_y, buy_quantity: event.target.value },
                  })
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("promo.getItem")}
              <Select
                value={form.buy_x_get_y.get_item_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    buy_x_get_y: { ...form.buy_x_get_y, get_item_id: event.target.value },
                  })
                }
                className="mt-1"
              >
                <option value="">Select</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm text-slate-600">
              {t("promo.getQty")}
              <Input
                type="number"
                value={form.buy_x_get_y.get_quantity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    buy_x_get_y: { ...form.buy_x_get_y, get_quantity: event.target.value },
                  })
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("promo.discountPercent")}
              <Input
                type="number"
                value={form.buy_x_get_y.discount_percent}
                onChange={(event) =>
                  setForm({
                    ...form,
                    buy_x_get_y: { ...form.buy_x_get_y, discount_percent: event.target.value },
                  })
                }
                className="mt-1"
              />
            </label>
          </div>
        )}

        {form.promo_type === "GIFT" && (
          <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              {t("promo.giftItem")}
              <Select
                value={form.gift.gift_item_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    gift: { ...form.gift, gift_item_id: event.target.value },
                  })
                }
                className="mt-1"
              >
                <option value="">Select</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm text-slate-600">
              {t("promo.giftQty")}
              <Input
                type="number"
                value={form.gift.gift_quantity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    gift: { ...form.gift, gift_quantity: event.target.value },
                  })
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("promo.minOrder")}
              <Input
                type="number"
                value={form.gift.min_order_amount}
                onChange={(event) =>
                  setForm({
                    ...form,
                    gift: { ...form.gift, min_order_amount: event.target.value },
                  })
                }
                className="mt-1"
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              const validationError = validateForm();
              if (validationError) {
                setError(validationError);
                return;
              }
              setIsLoading(true);
              setError(null);
              try {
                const payload = buildPayload();
                if (editingId) {
                  await client.updatePromotion(editingId, payload);
                } else {
                  await client.createPromotion(payload);
                }
                resetForm();
                await loadPromotions();
              } catch (err) {
            setError(err instanceof Error ? err.message : t("vendor.promotions.saveFailed"));
              } finally {
                setIsLoading(false);
              }
            }}
          >
            {editingId ? t("common.save") : t("common.create")}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <div className="grid gap-2">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
        </Card>
      ) : promotions.length === 0 ? (
        <Card>
          <EmptyState
            title={t("empty.noPromotions")}
            description={t("vendor.noPromotionsHint")}
          />
        </Card>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("fields.type")}</TableHeaderCell>
              <TableHeaderCell>{t("promo.summary")}</TableHeaderCell>
              <TableHeaderCell>{t("promo.priority")}</TableHeaderCell>
              <TableHeaderCell>{t("common.status")}</TableHeaderCell>
              <TableHeaderCell>{t("promo.startsAt")}</TableHeaderCell>
              <TableHeaderCell>{t("promo.endsAt")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <tbody>
            {promotions.map((promo) => (
              <TableRow key={promo.promotion_id}>
                <TableCell>{promo.promo_type}</TableCell>
                <TableCell>{buildSummary(promo)}</TableCell>
                <TableCell>{promo.priority}</TableCell>
                <TableCell>
                  <Badge variant={promo.is_active ? "success" : "warning"}>
                    {promo.is_active ? t("vendor.promotions.status.active") : t("vendor.promotions.status.inactive")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {promo.starts_at ? new Date(promo.starts_at).toLocaleString() : "-"}
                </TableCell>
                <TableCell>
                  {promo.ends_at ? new Date(promo.ends_at).toLocaleString() : "-"}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="secondary" onClick={() => startEdit(promo)}>
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await client.updatePromotion(promo.promotion_id, {
                        is_active: !promo.is_active,
                      });
                      await loadPromotions();
                    }}
                  >
                    {promo.is_active ? t("promo.deactivate") : t("promo.activate")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      await client.deletePromotion(promo.promotion_id);
                      await loadPromotions();
                    }}
                  >
                    {t("common.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </PageShell>
  );
}

function StatisticsPage({ vendorId }: { vendorId: string }) {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof client.getDashboard>> | null>(null);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof client.listReviews>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (isDevMode && !vendorId) {
          setDashboard(null);
          setReviews([]);
          setIsLoading(false);
          return;
        }
        const [dash, rev] = await Promise.all([client.getDashboard("7d"), client.listReviews()]);
        setDashboard(dash);
        setReviews(rev);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("vendor.stats.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [vendorId]);

  return (
    <section>
      <h1>{t("nav.statistics")}</h1>
      {error && <div className="error-banner">{error}</div>}
      {isDevMode && !vendorId && <div className="error-banner">{t("errors.vendorIdRequired")}</div>}
      {isLoading ? (
        <p>{t("vendor.stats.loading")}</p>
      ) : dashboard ? (
        <>
          <div className="details-grid">
            <div>
              <strong>{t("vendor.stats.grossRevenue")}</strong>
              <div>{formatNumber(dashboard.revenue)}</div>
            </div>
            <div>
              <strong>{t("vendor.stats.serviceFees")}</strong>
              <div>{formatNumber(dashboard.service_fee_total)}</div>
            </div>
            <div>
              <strong>{t("vendor.stats.vendorOwes")}</strong>
              <div>{formatNumber(dashboard.vendor_owes)}</div>
            </div>
          </div>
          <h2>{t("vendor.stats.latestReviews")}</h2>
          {reviews.length === 0 ? (
            <p>{t("empty.noReviews")}</p>
          ) : (
            <ul className="event-list">
              {reviews.map((review) => (
                <li key={review.order_id}>
                  <span>{review.order_id}</span>
                  <span>
                    {review.vendor_stars} ★ — {review.vendor_comment ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p>{t("empty.noData")}</p>
      )}
    </section>
  );
}

function AccountPage({ vendorId }: { vendorId: string }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof client.getProfile>> | null>(null);
  const [form, setForm] = useState({
    name: "",
    owner_full_name: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    inn: "",
    address_text: "",
    supports_pickup: false,
    delivers_self: false,
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
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (isDevMode && !vendorId) {
          setProfile(null);
          setIsLoading(false);
          return;
        }
        const data = await client.getProfile();
        setProfile(data);
        setForm({
          name: data.name ?? "",
          owner_full_name: data.owner_full_name ?? "",
          phone1: data.phone1 ?? data.phone ?? "",
          phone2: data.phone2 ?? "",
          phone3: data.phone3 ?? "",
          email: data.email ?? "",
          inn: data.inn ?? "",
          address_text: data.address_text ?? "",
          supports_pickup: data.supports_pickup,
          delivers_self: data.delivers_self ?? false,
          main_image_url: data.main_image_url ?? "",
          gallery_images: data.gallery_images ?? [],
          timezone: data.timezone ?? "Asia/Tashkent",
          lat: data.geo.lat.toString(),
          lng: data.geo.lng.toString(),
        });
        setSchedule(
          data.schedule && data.schedule.length > 0
            ? data.schedule.map((entry) => ({
                weekday: entry.weekday as ScheduleEntry["weekday"],
                open_time: entry.open_time ?? null,
                close_time: entry.close_time ?? null,
                closed: entry.closed,
                is24h: entry.is24h,
              }))
            : buildDefaultSchedule(),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.loadProfile"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [vendorId]);

  return (
    <PageShell
      title={t("vendor.accountTitle")}
      subtitle={t("vendor.accountSubtitle")}
    >
      {error && (
        <Card className="border-rose-200 bg-rose-50 text-rose-700">
          {error}
        </Card>
      )}
      {isDevMode && !vendorId && (
        <Card className="border-amber-200 bg-amber-50 text-amber-700">
          {t("errors.vendorIdRequired")}
        </Card>
      )}
      {isLoading ? (
        <Card>
          <div className="grid gap-2">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              {t("fields.name")}
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.ownerFullName")}
              <Input
                value={form.owner_full_name}
                onChange={(e) => setForm({ ...form, owner_full_name: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.phone1")}
              <Input
                value={form.phone1}
                onChange={(e) => setForm({ ...form, phone1: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.phone2")}
              <Input
                value={form.phone2}
                onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.phone3")}
              <Input
                value={form.phone3}
                onChange={(e) => setForm({ ...form, phone3: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.email")}
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.inn")}
              <Input
                value={form.inn}
                onChange={(e) => setForm({ ...form, inn: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.address")}
              <Input
                value={form.address_text}
                onChange={(e) => setForm({ ...form, address_text: e.target.value })}
                className="mt-1"
              />
            </label>
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">{t("fields.mainImage")}</div>
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
                      toast.success(t("common.saved"));
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
                  <Button
                    variant="secondary"
                    onClick={() => setForm((prev) => ({ ...prev, main_image_url: "" }))}
                  >
                    {t("common.remove")}
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-slate-500">{t("empty.noImage")}</div>
              )}
            </div>
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">{t("fields.gallery")}</div>
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
                <div className="text-xs text-slate-500">{t("empty.noGallery")}</div>
              ) : (
                <div className="image-grid">
                  {form.gallery_images.map((url) => (
                    <div key={url} className="image-item">
                      <img src={resolveAssetUrl(url)} alt={t("fields.gallery")} />
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            gallery_images: prev.gallery_images.filter((item) => item !== url),
                          }))
                        }
                      >
                        {t("common.remove")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="text-sm text-slate-600">
              {t("fields.timezone")}
              <Input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.supports_pickup}
                onChange={(e) => setForm({ ...form, supports_pickup: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              {t("fields.pickup")}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.delivers_self}
                onChange={(e) => setForm({ ...form, delivers_self: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              {t("fields.deliversSelf")}
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.latitude")}
              <Input
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("fields.longitude")}
              <Input
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                className="mt-1"
              />
            </label>
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">{t("fields.location")}</div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast.error(t("errors.geolocationUnavailable"));
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
                      () => toast.error(t("errors.geolocationFailed")),
                    );
                  }}
                >
                  {t("client.useMyLocation")}
                </Button>
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
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">{t("vendor.schedule")}</div>
              <Button
                variant="secondary"
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
              </Button>
            </div>
            <div className="grid gap-3">
              {schedule.map((entry) => (
                <div
                  key={entry.weekday}
                  className="grid items-center gap-2 rounded-xl border border-slate-100 p-3 md:grid-cols-[120px_1fr_1fr_120px_120px]"
                >
                  <div className="text-sm font-semibold text-slate-700">{t(`weekday.${entry.weekday}`)}</div>
                  <Input
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
                  <Input
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
                  <label className="flex items-center gap-2 text-xs text-slate-600">
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
                      className="h-4 w-4 rounded border-slate-300 text-sky-600"
                    />
                    {t("vendor.closed")}
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
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
                      className="h-4 w-4 rounded border-slate-300 text-sky-600"
                    />
                    {t("vendor.is24h")}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button
              onClick={async () => {
                setIsLoading(true);
                setError(null);
                try {
                  const updated = await client.updateProfile({
                    name: form.name,
                    owner_full_name: form.owner_full_name || null,
                    phone1: form.phone1 || null,
                    phone2: form.phone2 || null,
                    phone3: form.phone3 || null,
                    email: form.email || null,
                    inn: form.inn || null,
                    address_text: form.address_text || null,
                    supports_pickup: form.supports_pickup,
                    delivers_self: form.delivers_self,
                    main_image_url: form.main_image_url || null,
                    gallery_images: form.gallery_images,
                    timezone: form.timezone || "Asia/Tashkent",
                    schedule,
                    geo: { lat: Number(form.lat), lng: Number(form.lng) },
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
        </Card>
      )}
    </PageShell>
  );
}

function SupportPage() {
  const { t } = useTranslation();
  const username = import.meta.env.VITE_SUPPORT_TG_USERNAME as string | undefined;
  const link = username ? `https://t.me/${username}` : "https://t.me/";
  return (
    <section>
      <h1>{t("nav.support")}</h1>
      <button className="primary" onClick={() => window.open(link, "_blank")}>
        {t("vendor.openSupport")}
      </button>
    </section>
  );
}

function OrderDetailsPage({ vendorId }: { vendorId: string }) {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const [order, setOrder] = useState<VendorOrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [handoffCode, setHandoffCode] = useState<string | null>(null);
  const [pickupConfirmCode, setPickupConfirmCode] = useState("");
  const [deliveryConfirmCode, setDeliveryConfirmCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId || (isDevMode && !vendorId)) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.getOrder(orderId);
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.loadOrder"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [orderId, vendorId]);

  if (isLoading) {
    return <p>{t("common.loading")}</p>;
  }

  if (isDevMode && !vendorId) {
    return (
      <section>
        <Link to="/orders">{t("vendor.ordersBack")}</Link>
        <p className="error-banner">{t("errors.vendorIdRequired")}</p>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section>
        <Link to="/orders">{t("vendor.ordersBack")}</Link>
        <p className="error-banner">{error ?? t("admin.orderDetails.notFound")}</p>
      </section>
    );
  }

  const canAccept = order.status === "NEW";
  const canReady = order.status === "COOKING";

  return (
    <section>
      <Link to="/orders">{t("vendor.ordersBack")}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">
          {t("vendor.orderDetails.title", { id: order.order_id })}
        </h2>
        <div className="inline">
          <button
            className="secondary"
            disabled={!canAccept}
            onClick={async () => {
              if (!orderId) return;
              setActionError(null);
              try {
                await client.acceptOrder(orderId);
                const updated = await client.getOrder(orderId);
                setOrder(updated);
              } catch (err) {
                setActionError(
                  err instanceof Error ? err.message : t("errors.acceptOrder"),
                );
              }
            }}
          >
            {t("vendor.orders.accept")}
          </button>
          <button
            className="primary"
            disabled={!canReady}
            onClick={async () => {
              if (!orderId) return;
              setActionError(null);
              try {
                const response = await client.updateOrderStatus(orderId, "READY");
                setHandoffCode(response.handoff_code ?? null);
                const updated = await client.getOrder(orderId);
                setOrder(updated);
              } catch (err) {
                setActionError(
                  err instanceof Error ? err.message : t("vendor.orderDetails.updateFailed"),
                );
              }
            }}
          >
            {t("vendor.orders.ready")}
          </button>
        </div>
      </div>

      {actionError && <div className="error-banner">{actionError}</div>}
      {handoffCode && (
        <div className="error-banner">
          {t("vendor.orderDetails.handoffCode")}: <strong>{handoffCode}</strong>
        </div>
      )}

      {order.fulfillment_type === "PICKUP" && order.status === "READY" && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="text-sm font-semibold">{t("vendor.orderDetails.pickupConfirm")}</div>
          <div className="mt-3 flex gap-2">
            <Input
              value={pickupConfirmCode}
              onChange={(event) => setPickupConfirmCode(event.target.value)}
              placeholder={t("vendor.orderDetails.pickupCode")}
            />
            <Button
              onClick={async () => {
                if (!orderId) return;
                setActionError(null);
                try {
                  await client.confirmPickup(orderId, pickupConfirmCode.trim());
                  setPickupConfirmCode("");
                  const updated = await client.getOrder(orderId);
                  setOrder(updated);
                } catch (err) {
                  setActionError(
                    err instanceof Error ? err.message : t("vendor.orderDetails.updateFailed"),
                  );
                }
              }}
            >
              {t("vendor.orderDetails.confirm")}
            </Button>
          </div>
        </Card>
      )}

      {order.fulfillment_type === "DELIVERY" && order.delivers_self && order.status === "READY" && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="text-sm font-semibold">{t("vendor.orderDetails.selfDelivery")}</div>
          <div className="mt-3 flex gap-2">
            <Input
              value={deliveryConfirmCode}
              onChange={(event) => setDeliveryConfirmCode(event.target.value)}
              placeholder={t("client.deliveryCode")}
            />
            <Button
              onClick={async () => {
                if (!orderId) return;
                setActionError(null);
                try {
                  await client.confirmDelivery(orderId, deliveryConfirmCode.trim());
                  setDeliveryConfirmCode("");
                  const updated = await client.getOrder(orderId);
                  setOrder(updated);
                } catch (err) {
                  setActionError(
                    err instanceof Error ? err.message : t("vendor.orderDetails.updateFailed"),
                  );
                }
              }}
            >
              {t("vendor.orderDetails.confirm")}
            </Button>
          </div>
        </Card>
      )}

      <div className="details-grid">
        <div>
          <strong>{t("fields.status")}</strong>
          <div>{translateStatus(order.status)}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.courier")}</strong>
          <div>
            {order.courier?.full_name
              ? `${order.courier.full_name} (${order.courier_id ?? "-"})`
              : order.courier_id ?? "-"}
          </div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.fulfillment")}</strong>
          <div>{translateFulfillment(order.fulfillment_type)}</div>
        </div>
        <div>
          <strong>{t("client.deliveryComment")}</strong>
          <div>{order.delivery_comment ?? "-"}</div>
        </div>
        <div>
          <strong>{t("client.vendorComment")}</strong>
          <div>{order.vendor_comment ?? "-"}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.utensils")}</strong>
          <div>{order.utensils_count}</div>
        </div>
        <div>
          <strong>{t("client.receiverPhone")}</strong>
          <div>{order.receiver_phone ?? "-"}</div>
        </div>
        <div>
          <strong>{t("client.payment")}</strong>
          <div>{order.payment_method ? translatePayment(order.payment_method) : "-"}</div>
        </div>
        <div>
          <strong>{t("admin.orderDetails.changeFor")}</strong>
          <div>{order.change_for_amount ?? "-"}</div>
        </div>
        <div>
          <strong>{t("client.address")}</strong>
          <div>{order.address_text ?? "-"}</div>
        </div>
        <div>
          <strong>{t("client.entranceApt")}</strong>
          <div>
            {order.address_entrance ?? "-"} / {order.address_apartment ?? "-"}
          </div>
        </div>
      </div>

      <h2>{t("client.items")}</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("admin.orderDetails.items.menuItem")}</th>
            <th>{t("client.qty")}</th>
            <th>{t("client.price")}</th>
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
              <td>{item.price}</td>
              <td>{item.discount_amount}</td>
              <td>{item.is_gift ? t("common.yes") : t("common.no")}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
    </section>
  );
}

function MenuPage({ vendorId }: { vendorId: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    weight_value: "",
    weight_unit: "",
    price: "",
    is_available: true,
    category: "",
    image_url: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isDevMode && !vendorId) {
        setItems([]);
        setIsLoading(false);
        return;
      }
      const data = await client.listMenu();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("vendor.menu.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [vendorId]);

  const handleSave = async () => {
    if (isDevMode && !vendorId) {
      setError(t("errors.vendorIdRequired"));
      return;
    }
    if (!form.title.trim()) {
      setError(t("vendor.menu.titleRequired"));
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price)) {
      setError(t("vendor.menu.priceRequired"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let updated: MenuItem;
      if (editingId) {
        updated = await client.updateMenuItem(editingId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          weight_value: form.weight_value ? Number(form.weight_value) : null,
          weight_unit: form.weight_unit.trim() || null,
          price,
          is_available: form.is_available,
          category: form.category.trim() || null,
          image_url: form.image_url.trim() || null,
        });
        setItems(items.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        updated = await client.createMenuItem({
          title: form.title.trim(),
          description: form.description.trim() || null,
          weight_value: form.weight_value ? Number(form.weight_value) : null,
          weight_unit: form.weight_unit.trim() || null,
          price,
          is_available: form.is_available,
          category: form.category.trim() || null,
          image_url: form.image_url.trim() || null,
        });
        setItems([updated, ...items]);
      }
      setEditingId(null);
      setForm({
        title: "",
        description: "",
        weight_value: "",
        weight_unit: "",
        price: "",
        is_available: true,
        category: "",
        image_url: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("vendor.menu.saveFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const formTitle = useMemo(
    () => (editingId ? t("vendor.menu.editTitle") : t("vendor.menu.createTitle")),
    [editingId],
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">{t("nav.menu")}</h2>
        <button className="secondary" onClick={() => void loadItems()}>
          {t("common.refresh")}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isDevMode && !vendorId && <div className="error-banner">{t("errors.vendorIdRequired")}</div>}

      <div className="panel">
        <h2>{formTitle}</h2>
        <div className="details-grid">
          <label>
            {t("vendor.menu.title")}
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label>
            {t("vendor.menu.description")}
            <input
              type="text"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label>
            {t("vendor.menu.weightValue")}
            <input
              type="number"
              value={form.weight_value}
              onChange={(event) => setForm({ ...form, weight_value: event.target.value })}
            />
          </label>
          <label>
            {t("vendor.menu.weightUnit")}
            <input
              type="text"
              value={form.weight_unit}
              onChange={(event) => setForm({ ...form, weight_unit: event.target.value })}
            />
          </label>
          <label>
            {t("vendor.menu.price")}
            <input
              type="number"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(event) =>
                setForm({ ...form, is_available: event.target.checked })
              }
            />
            {t("vendor.menu.available")}
          </label>
          <label>
            {t("vendor.menu.category")}
            <input
              type="text"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          </label>
          <label>
            {t("vendor.menu.image")}
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                try {
                  const result = await client.uploadFile(file);
                  setForm((prev) => ({ ...prev, image_url: result.public_url }));
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("errors.uploadFailed"));
                } finally {
                  setIsUploading(false);
                  event.target.value = "";
                }
              }}
              disabled={isUploading}
            />
            {form.image_url ? (
              <div className="image-preview">
                <img src={resolveAssetUrl(form.image_url)} alt={t("vendor.menu.image")} />
                <button
                  className="link danger"
                  onClick={() => setForm((prev) => ({ ...prev, image_url: "" }))}
                  type="button"
                >
                  {t("common.remove")}
                </button>
              </div>
            ) : (
              <span className="muted">{t("empty.noImage")}</span>
            )}
          </label>
        </div>
        <div className="inline">
          <button className="primary" onClick={handleSave}>
            {editingId ? t("vendor.menu.updateItem") : t("vendor.menu.createItem")}
          </button>
          {editingId && (
            <button
              className="secondary"
              onClick={() => {
                  setEditingId(null);
                  setForm({
                    title: "",
                    description: "",
                    weight_value: "",
                    weight_unit: "",
                    price: "",
                    is_available: true,
                    category: "",
                    image_url: "",
                  });
              }}
            >
              {t("vendor.menu.cancelEdit")}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p>{t("vendor.menu.loading")}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("vendor.menu.image")}</th>
              <th>{t("vendor.menu.title")}</th>
              <th>{t("vendor.menu.weight")}</th>
              <th>{t("vendor.menu.price")}</th>
              <th>{t("vendor.menu.available")}</th>
              <th>{t("vendor.menu.category")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.image_url ? (
                    <img className="thumb" src={resolveAssetUrl(item.image_url)} alt={item.title} />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{item.title}</td>
                <td>{item.weight_value ? `${item.weight_value} ${item.weight_unit ?? ""}` : "-"}</td>
                <td>{item.price}</td>
                <td>{item.is_available ? t("common.yes") : t("common.no")}</td>
                <td>{item.category ?? "-"}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm({
                        title: item.title,
                        description: item.description ?? "",
                        weight_value: item.weight_value ? String(item.weight_value) : "",
                        weight_unit: item.weight_unit ?? "",
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
                        setItems(items.filter((row) => row.id !== item.id));
                      } catch (err) {
                        setError(err instanceof Error ? err.message : t("vendor.menu.deleteFailed"));
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
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>{t("vendor.menu.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
