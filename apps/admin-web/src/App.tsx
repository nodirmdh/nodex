import { useEffect } from "react";
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { OrdersPage } from "./pages/OrdersPage";
import { OrderDetailsPage } from "./pages/OrderDetailsPage";
import { PromotionsPage } from "./pages/PromotionsPage";
import { PromoCodesPage } from "./pages/PromoCodesPage";
import { VendorsPage } from "./pages/VendorsPage";
import { LoginPage } from "./pages/LoginPage";

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
  return (
    <BrowserRouter>
      <AuthGuard>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="logo">Nodex Admin</div>
            <nav className="nav">
              <NavLink to="/vendors">Vendors</NavLink>
              <NavLink to="/orders">Orders</NavLink>
              <NavLink to="/promo-codes">Promo Codes</NavLink>
              <NavLink to="/promotions">Promotions</NavLink>
            </nav>
          </aside>
          <main className="content">
            <Routes>
              <Route path="/" element={<VendorsPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
              <Route path="/promo-codes" element={<PromoCodesPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </main>
        </div>
      </AuthGuard>
    </BrowserRouter>
  );
}
