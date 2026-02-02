import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";

import { OrdersPage } from "./pages/OrdersPage";
import { PromotionsPage } from "./pages/PromotionsPage";
import { PromoCodesPage } from "./pages/PromoCodesPage";
import { VendorsPage } from "./pages/VendorsPage";

export function App() {
  return (
    <BrowserRouter>
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
            <Route path="/promo-codes" element={<PromoCodesPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
