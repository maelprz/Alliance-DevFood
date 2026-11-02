import { lazy, Suspense } from "react";
import { NavProvider } from "./context/NavProvider";
import { AppProvider } from "./context/AppProvider";
import { OrderProvider } from "./context/OrderProvider";
import { MenuProvider } from "./context/MenuProvider";
import { CartProvider } from "./context/CartContext";
import { NotificationProvider } from "./context/NotificationProvider";
import { useNav } from "./context/useNav";
import { useApp } from "./context/useApp";
import Login from "./pages/Login";
import BrowseMenu from "./pages/BrowseMenu";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import Checkout from "./components/Checkout";
import TrackOrder from "./components/TrackOrder";
import AdminLogin from "./components/AdminLogin";
// Admin is the heaviest page and only used by the admin role — lazy-load it
// so customers never download it on first paint.
const Admin = lazy(() => import("./pages/Admin"));

// ── Route guard for admin ─────────────────────────────────────────────────────
// If adminUser is not set, redirect to admin-login instead of rendering admin
function AdminGuard({ children }) {
  const { adminUser } = useApp();
  const { navigate } = useNav();
  if (!adminUser) {
    // Redirect to admin login on next tick to avoid render-phase side effect
    setTimeout(() => navigate("admin-login"), 0);
    return null;
  }
  return children;
}

// ── View router ───────────────────────────────────────────────────────────────
// Maps view state → component. Replaces react-router-dom (blocked in sandbox).
// On integration: swap with <BrowserRouter> + <Routes> from react-router-dom.
// Correct URL mapping: login→/ | menu→/menu | cart→/cart | checkout→/checkout
//                     track→/track-order | admin-login→/admin/login | admin→/admin
function AppRoutes() {
  const { view } = useNav();

  const routes = {
    login: <Login />,
    menu: <BrowseMenu />,
    cart: <Cart />,
    profile: <Profile />,
    checkout: <Checkout />,
    track: <TrackOrder />,
    "admin-login": <AdminLogin />,
    admin: (
      <AdminGuard>
        <Suspense fallback={<div style={{ padding: 32 }}>Loading admin…</div>}>
          <Admin />
        </Suspense>
      </AdminGuard>
    ),
  };

  return routes[view] ?? <Login />;
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <NavProvider>
      <AppProvider>
        <NotificationProvider>
          <CartProvider>
            <OrderProvider>
              <MenuProvider>
                <AppRoutes />
              </MenuProvider>
            </OrderProvider>
          </CartProvider>
        </NotificationProvider>
      </AppProvider>
    </NavProvider>
  );
}
