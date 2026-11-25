import { useState } from "react";
import Navbar from "../components/Navbar";
import CartStatus from "../components/CartStatus";
import { MAX_CART_QUANTITY } from "../constants/cart";
import { DELIVERY_FEE } from "../constants/delivery";
import { VIEW } from "../constants/views";
import { useCartPage } from "../hooks/useCartPage";
import { describeCoupon } from "../utils/coupon";

function CartQuantityInput({ name, quantity, disabled, onChange }) {
  const [draft, setDraft] = useState(null);

  function commitQuantity() {
    setDraft(null);
    if (draft == null || draft === "") return;

    const nextQuantity = Math.max(1, Math.min(Number(draft), MAX_CART_QUANTITY));
    if (nextQuantity !== quantity) onChange(nextQuantity);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className="cart-quantity-input tabular"
      aria-label={`Quantity of ${name}`}
      title={`Enter a whole number from 1 to ${MAX_CART_QUANTITY}`}
      value={draft ?? String(quantity)}
      disabled={disabled}
      onChange={(event) => {
        const value = event.target.value;
        if (/^\d*$/.test(value)) setDraft(value);
      }}
      onBlur={commitQuantity}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

export default function Cart() {
  const {
    navigate, cartItems, cartReady, cartError, retryCart, updateQty, removeFromCart,
    subtotal, total, couponCode, setCouponCode, couponMessage, appliedCoupon, activeCoupon,
    couponBelowMin, discountAmount, applyingCoupon, handleApplyCoupon, removeCoupon, goToCheckout, openingCheckout,
  } = useCartPage();

  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <Navbar />

      <div className="cart-feature" style={{ maxWidth: 896, margin: "0 auto", padding: "32px 16px" }}>
        {/* Back */}
        <button
          onClick={() => navigate(VIEW.MENU)}
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

        <CartStatus ready={cartReady} error={cartError} retry={retryCart} />

        {cartReady && (cartItems.length === 0 ? (
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
              onClick={() => navigate(VIEW.MENU)}
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
          <div className="cart-layout">
            {/* ITEMS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {cartItems.map((item) => (
                <div
                  key={item.food_id}
                  className="cart-item"
                  style={{
                    background: "#ffffff",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: 16,
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

                  <div className="cart-item-actions">
                    <button
                      onClick={() => removeFromCart(item.food_id)}
                      disabled={openingCheckout}
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
                        type="button"
                        className="secondary-button cart-quantity-button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        disabled={openingCheckout}
                        onClick={() =>
                          updateQty(item.food_id, item.quantity - 1)
                        }
                      >
                        −
                      </button>

                      <CartQuantityInput
                        name={item.name}
                        quantity={item.quantity}
                        disabled={openingCheckout}
                        onChange={(quantity) => updateQty(item.food_id, quantity)}
                      />

                      <button
                        type="button"
                        className="secondary-button cart-quantity-button"
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={openingCheckout || item.quantity >= MAX_CART_QUANTITY}
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
            <div className="cart-summary">
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
                      aria-label="Coupon code"
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
                      disabled={applyingCoupon || openingCheckout}
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
                      {applyingCoupon ? "Applying…" : "Apply Coupon"}
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

              <p>
                Delivery Fee: from ₱{DELIVERY_FEE.BASE.toFixed(2)}{" "}
                <span style={{ fontSize: 12, color: "#6b7280" }}>(set by distance at checkout)</span>
              </p>

              <h3>Total: from ₱{total.toFixed(2)}</h3>

              <button
                onClick={goToCheckout}
                disabled={openingCheckout || applyingCoupon}
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
                {openingCheckout ? "Saving cart…" : "Go to Checkout"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
