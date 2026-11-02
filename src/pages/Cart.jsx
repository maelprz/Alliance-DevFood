import { useState, useEffect } from "react";
import { useNav } from "../context/useNav";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useApp } from "../context/useApp";

// Cart page — Feature 3
export default function Cart() {
  const { navigate } = useNav();
  const { cartItems, updateQty, removeFromCart } = useCart();
  const { user } = useApp();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) {
      navigate("menu");
    }
  }, [user, navigate]);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const DELIVERY_FEE = 49.0;

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Discount calculation
  const discountAmount = appliedCoupon ? subtotal * appliedCoupon.discount : 0;

  const total =
    subtotal - discountAmount + (cartItems.length > 0 ? DELIVERY_FEE : 0);

  // Coupon validator
  const handleApplyCoupon = async () => {
    try {
      const res = await fetch("/api/cart/apply-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode,
          subtotal,
        }),
      });

      const data = await res.json();

      setCouponMessage(data.message);

      if (data.valid) {
        const couponData = {
          code: data.code,
          discount: data.discountPercent / 100,
          discountPercent: data.discountPercent,
        };

        setAppliedCoupon(couponData);

        localStorage.setItem("appliedCoupon", JSON.stringify(couponData));
      } else {
        setAppliedCoupon(null);

        localStorage.removeItem("appliedCoupon");
      }
    } catch {
      setCouponMessage("Server error. Please try again.");
      setAppliedCoupon(null);

      localStorage.removeItem("appliedCoupon");
    }
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

                {couponMessage && (
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: appliedCoupon ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {couponMessage}
                  </p>
                )}
              </div>

              <p>Subtotal: ₱{subtotal.toFixed(2)}</p>

              {appliedCoupon && (
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
