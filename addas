import { useEffect } from "react";
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Ticket,
  Percent,
  Settings,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, getLanguage, setLanguage } from "@nodex/i18n";
import { Select } from "@nodex/ui";

import { OrdersPage } from "./pages/OrdersPage";
import { OrderDetailsPage } from "./pages/OrderDetailsPage";
import { PromotionsPage } from "./pages/PromotionsPage";
import { PromoCodesPage } from "./pages/PromoCodesPage";
import { VendorsPage } from "./pages/VendorsPage";
import { LoginPage } from "./pages/LoginPage";
import { VendorDetailsPage } from "./pages/VendorDetailsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ClientDetailsPage } from "./pages/ClientDetailsPage";
import { CouriersPage } from "./pages/CouriersPage";
import { CourierDetailsPage } from "./pages/CourierDetailsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FinancePage } from "./pages/FinancePage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("nodex_admin_token");
    const isLogin = location.pathname === "/login";

    if (!token && !isLogin) {
      navigate("/login", { replace: true });
    }

    if (token && isLogin) {
      navigate("/vendors", { replace: true });
    }
  }, [location.pathname, navigate]);

  return <>{children}</>;
}

export function App() {
  const { t } = useTranslation();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
      isActive ? "bg-sky-100 text-sky-700" : "text-slate-600 hover:bg-slate-100"
    }`;
  return (
    <BrowserRouter>
      <AuthGuard>
        <div className="min-h-screen bg-transparent text-slate-900">
          <aside className="fixed left-0 top-0 flex h-full w-64 flex-col gap-6 border-r border-slate-100 bg-white/90 px-6 py-8 backdrop-blur">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <LayoutDashboard className="h-5 w-5 text-sky-600" />
              {t("admin.title")}
            </div>
            <nav className="flex flex-col gap-2 text-sm">
              <NavLink to="/vendors" className={navClass}>
                <Package className="h-4 w-4" />
                {t("nav.vendors")}
              </NavLink>
              <NavLink to="/orders" className={navClass}>
                <ShoppingCart className="h-4 w-4" />
                {t("nav.orders")}
              </NavLink>
              <NavLink to="/clients" className={navClass}>
                <Users className="h-4 w-4" />
                {t("nav.clients")}
              </NavLink>
              <NavLink to="/couriers" className={navClass}>
                <Truck className="h-4 w-4" />
                {t("nav.couriers")}
              </NavLink>
              <NavLink to="/promo-codes" className={navClass}>
                <Ticket className="h-4 w-4" />
                {t("nav.promoCodes")}
              </NavLink>
              <NavLink to="/promotions" className={navClass}>
                <Percent className="h-4 w-4" />
                {t("nav.promotions")}
              </NavLink>
              <NavLink to="/finance" className={navClass}>
                <Wallet className="h-4 w-4" />
                {t("nav.finance")}
              </NavLink>
              <NavLink to="/settings" className={navClass}>
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </NavLink>
            </nav>
          </aside>
          <main className="ml-64 px-10 py-8">
            <div className="mb-6 flex justify-end">
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
            <Routes>
              <Route path="/" element={<VendorsPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/vendors/:vendorId" element={<VendorDetailsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
              <Route path="/couriers" element={<CouriersPage />} />
              <Route path="/couriers/:courierId" element={<CourierDetailsPage />} />
              <Route path="/promo-codes" element={<PromoCodesPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </main>
        </div>
      </AuthGuard>
    </BrowserRouter>
  );
}
