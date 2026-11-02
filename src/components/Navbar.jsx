import { useNav } from "../context/useNav";
import { useApp } from "../context/useApp";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { navigate, view } = useNav();
  const { user, logout } = useApp();
  const { cartItems } = useCart();
  const [hoverLogout, setHoverLogout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("login");
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: 64,
      }}
    >
      <button
        onClick={() => navigate("menu")}
        style={{
          background: "none",
          border: "none",
          fontSize: 22,
          fontWeight: 800,
          color: "#1f2937",
          cursor: "pointer",
          fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
          letterSpacing: "-0.02em",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        Dev<span style={{ color: "#FF5A36" }}>Food</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {user && (
          <>
            <NotificationBell />
            <button
              onClick={() => navigate("cart")}
              style={{
                position: "relative",
                background: view === "cart" ? "#f3f4f6" : "none",
                border: "1px solid",
                borderColor: view === "cart" ? "#e5e7eb" : "transparent",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Cart"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
                <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 7H6" />
              </svg>

              {cartCount > 0 && (
                <span
                  style={{
                    background: "#FF5A36",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate("profile")}
              aria-label="View profile"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: view === "profile" ? "#f3f4f6" : "none",
                border: "1px solid",
                borderColor: view === "profile" ? "#e5e7eb" : "transparent",
                borderRadius: 8,
                padding: "4px 10px 4px 4px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #FF5A36 0%, #FBBF24 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </span>
              <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>
                {user.name}
              </span>
            </button>

            <button
              onClick={handleLogout}
              onMouseEnter={() => setHoverLogout(true)}
              onMouseLeave={() => setHoverLogout(false)}
              style={{
                padding: "6px 14px",
                background: hoverLogout ? "#fee2e2" : "#f3f4f6",
                border: "1px solid",
                borderColor: hoverLogout ? "#fca5a5" : "#e5e7eb",
                borderRadius: 8,
                color: hoverLogout ? "#dc2626" : "#6b7280",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        )}
        {!user && (
          <button
            onClick={() => navigate("login")}
            style={{
              padding: "6px 14px",
              background: "#FF5A36",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
