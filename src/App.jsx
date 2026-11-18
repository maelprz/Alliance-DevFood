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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { PERMISSIONS } from "./constants/auth";
import { hasPermission } from "./utils/rbac";
// Admin is the heaviest page and only used by the admin role — lazy-load it
// so customers never download it on first paint.
const Admin = lazy(() => import("./pages/Admin"));

// ── Route guard for admin (RBAC) ──────────────────────────────────────────────
// Only a role that grants admin.panel may open the admin view; everyone else goes
// to the single login page. The API still checks every admin request on its own.
function AdminGuard({ children }) {
  const { adminUser } = useApp();
  const { navigate } = useNav();
  if (!hasPermission(adminUser, PERMISSIONS.ADMIN_PANEL)) {
    // Redirect on next tick to avoid render-phase side effect
    setTimeout(() => navigate("login"), 0);
    return null;
  }
  return children;
}

// ── View router ───────────────────────────────────────────────────────────────
// Maps view state → component. Replaces react-router-dom (blocked in sandbox).
// On integration: swap with <BrowserRouter> + <Routes> from react-router-dom.
// Correct URL mapping: login→/ | menu→/menu (or /menu/:category) | cart→/cart
//                     track→/track-order | admin-login→/admin/login | admin→/admin
function AppRoutes() {
  const { view } = useNav();

  const routes = {
    login: <Login />,
    "forgot-password": <ForgotPassword />,
    "reset-password": <ResetPassword />,
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
