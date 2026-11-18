import { useState, useEffect } from "react";
import { useNav } from "../context/useNav";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useApp } from "../context/useApp";
import { authHeaders } from "../services/authService";
import {
  calcDiscount,
  describeCoupon,
  readStoredCoupon,
  storeCoupon,
  clearStoredCoupon,
} from "../utils/coupon";

// Cart page — Feature 3
export default function Cart() {
  const { navigate } = useNav();
  const { cartItems, updateQty, removeFromCart } = useCart();
  const { user } = useApp();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) {
      navigate("login", { replace: true });
    }
  }, [user, navigate]);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [selectedCoupon, setSelectedCoupon] = useState(() =>
    readStoredCoupon(user?.id),
  );
  const appliedCoupon = selectedCoupon?.userId === user?.id ? selectedCoupon : null;

  const DELIVERY_FEE = 49.0;

  const subtotal = Number(
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
  );

  // A coupon only counts while the cart still meets its minimum order.
  const couponBelowMin =
    appliedCoupon && subtotal < (appliedCoupon.minOrder ?? 0);
  const activeCoupon = appliedCoupon && !couponBelowMin ? appliedCoupon : null;

  // Discount calculation
  const discountAmount = calcDiscount(activeCoupon, subtotal);

  const total =
    subtotal - discountAmount + (cartItems.length > 0 ? DELIVERY_FEE : 0);

  // Coupon validator (the server checks dates, limits and the minimum order)
  const handleApplyCoupon = async () => {
    if (!user) return;
    if (!couponCode.trim()) {
      setCouponMessage("Enter a coupon code.");
      return;
    }
    try {
      const res = await fetch("/api/cart/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.valid) {
        const coupon = {
          code: data.code,
          description: data.description,
          discountType: data.discountType,
          discountPercent: data.discountPercent,
          fixedAmount: data.fixedAmount,
          maxDiscount: data.maxDiscount,
          minOrder: data.minOrder,
          userId: user.id,
        };
        storeCoupon(coupon);
        setSelectedCoupon(coupon);
        setCouponMessage("");
        setCouponCode("");
      } else {
        setCouponMessage(data.message || "Could not apply this coupon.");
      }
    } catch {
      setCouponMessage("Server error. Please try again.");
    }
  };

  const removeCoupon = () => {
    clearStoredCoupon();
    setSelectedCoupon(null);
    setCouponMessage("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <Navbar />

      <div style={{ maxWidth: 896, margin: "0 auto", padding: "32px 16px" }}>
        {/* Back */}
        <button
          onClick={() => navigate("menu")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "#6b7280",
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 24,
            fontFamily: "inherit",
          }}
        >
          Back to Menu
        </button>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 32px",
          }}
        >
          Your Cart
        </h1>

        {cartItems.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 16 }}>
              Your cart is empty
            </p>

            <button
              onClick={() => navigate("menu")}
              style={{
                padding: "12px 32px",
                background: "#FF5A36",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 24,
            }}
          >
            {/* ITEMS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {cartItems.map((item) => (
                <div
                  key={item.food_id}
                  style={{
                    background: "#ffffff",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: 16,
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  {/* IMAGE FIXED */}
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    width="80"
                    height="80"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0 }}>{item.name}</h3>
                    <p style={{ margin: 0, color: "#6b7280" }}>
                      {item.category}
                    </p>
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      ₱{item.price.toFixed(2)}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => removeFromCart(item.food_id)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#dc2626",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: "inherit",
                      }}
                    >
                      Remove
                    </button>

                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <button
                        onClick={() =>
                          updateQty(item.food_id, item.quantity - 1)
                        }
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() =>
                          updateQty(item.food_id, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SUMMARY */}
            <div style={{ position: "sticky", top: 88 }}>
              <h2>Order Summary</h2>

              {cartItems.map((item) => (
                <div key={item.food_id}>
                  {item.quantity}× {item.name}
                </div>
              ))}

              {/* Coupon Section */}
              <div style={{ marginTop: 20, marginBottom: 20 }}>
                {activeCoupon ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}
                      >
                        {activeCoupon.code}
                      </div>
                      <div style={{ fontSize: 12, color: "#15803d" }}>
                        {describeCoupon(activeCoupon)}
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      aria-label="Remove coupon"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        marginBottom: 10,
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                    />

                    <button
                      onClick={handleApplyCoupon}
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "#111827",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Apply Coupon
                    </button>
                  </>
                )}

                {couponBelowMin && (
                  <p style={{ marginTop: 10, fontSize: 13, color: "#c2410c" }}>
                    Add ₱{(appliedCoupon.minOrder - subtotal).toFixed(2)} more to
                    use {appliedCoupon.code}.{" "}
                    <button
                      onClick={removeCoupon}
                      aria-label="Remove coupon"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        padding: 0,
                      }}
                    >
                      Remove
                    </button>
                  </p>
                )}

                {couponMessage && (
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: activeCoupon ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {couponMessage}
                  </p>
                )}
              </div>

              <p>Subtotal: ₱{subtotal.toFixed(2)}</p>

              {activeCoupon && (
                <p style={{ color: "#16a34a", fontWeight: 600 }}>
                  Discount: -₱{discountAmount.toFixed(2)}
                </p>
              )}

              <p>Delivery Fee: ₱{DELIVERY_FEE.toFixed(2)}</p>

              <h3>Total: ₱{total.toFixed(2)}</h3>

              <button
                onClick={() => navigate("checkout")}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#FF5A36",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Go to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
