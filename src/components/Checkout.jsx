import Navbar from "./Navbar";
import AddressPicker from "./AddressPicker";
import { useCheckout } from "../hooks/useCheckout";

// Inline SVG payment-method icons — render identically across OS/browsers.
function PaymentIcon({ kind, color = "#374151" }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (kind === "cod") {
    return (
      <svg {...props}>
        <rect x="2" y="7" width="20" height="11" rx="2" />
        <circle cx="12" cy="12.5" r="2.5" />
        <path d="M5 11v3" />
        <path d="M19 11v3" />
      </svg>
    );
  }
  return null;
}

// ─── Checkout — Feature 4 (John Calen Nombrado) ───────────────────────────────
// View only: totals, validation and placing the order live in
// hooks/useCheckout.js. Visual layer matches the approved Figma Make UI design.
//
// Exports only Checkout component — React Compiler rule
export default function Checkout() {
  const {
    navigate,
    lineItems,
    subtotal,
    deliveryFee,
    appliedCoupon,
    discountAmount,
    total_amount,
    savedAddress,
    fieldErrors,
    error,
    loading,
    placed,
    showConfirm,
    changeLocation,
    requestConfirm,
    dismissConfirm,
    confirmOrder,
  } = useCheckout();

  // Empty cart guard — block checkout if there is nothing to order
  if (lineItems.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent" }}>
        <Navbar />
        <div
          style={{
            maxWidth: 600,
            margin: "80px auto",
            textAlign: "center",
            padding: "0 16px",
          }}
        >
          <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 20 }}>
            Your cart is empty. Add items before checking out.
          </p>
          <button
            onClick={() => navigate("menu")}
            style={{
              padding: "10px 24px",
              background: "#FF5A36",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Browse Menu
          </button>
        </div>
      </div>
    );
  }

  // className enables :focus-visible styling defined in the <style> block at the
  // bottom of this component — required for keyboard accessibility (WCAG 2.4.7).
  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <Navbar />

      <div style={{ maxWidth: 896, margin: "0 auto", padding: "32px 16px" }}>
        {/* Back */}
        <button
          onClick={() => navigate("cart")}
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
          Back to Cart
        </button>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 32px",
          }}
        >
          Checkout
        </h1>

        {/* 2-col layout: form left / order review right.
            Collapses to single column under 768px via the .checkout-grid media query. */}
        <div
          className="checkout-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── LEFT COL: Delivery + Payment ───────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Delivery Address */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#111827",
                  margin: "0 0 16px",
                }}
              >
                Delivery Address
              </h2>
              {savedAddress && (
                <p style={{ fontSize: 12, color: "#6b7280", margin: "-8px 0 12px" }}>
                  We placed the pin at your saved address ({savedAddress}). Check it
                  and move it if needed.
                </p>
              )}
              <AddressPicker
                initialQuery={savedAddress}
                error={fieldErrors.address}
                onChange={changeLocation}
              />
            </div>

            {/* Payment Method */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#111827",
                  margin: "0 0 20px",
                }}
              >
                Payment Method
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  border: "1px solid #FF5A36",
                  borderRadius: 8,
                  background: "#fff7ed",
                }}
              >
                <PaymentIcon kind="cod" color="#FF5A36" />
                <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
                  Cash on Delivery
                </span>
              </div>
              <p
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  color: "#6b7280",
                  background: "#f3f4f6",
                  borderRadius: 8,
                  padding: "10px 14px",
                }}
              >
                Pay in cash when your order arrives.
              </p>
            </div>
          </div>

          {/* ── RIGHT COL: Order Review (sticky on desktop only) ───────────── */}
          <div className="checkout-review">
            <div
              className="checkout-review-inner"
              style={{ position: "sticky", top: 88 }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: 24,
                }}
              >
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#111827",
                    margin: "0 0 20px",
                  }}
                >
                  Review Your Order
                </h2>

                {/* Line items */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  {lineItems.map((li) => (
                    <div
                      key={li.food_id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>
                        {li.quantity}× {li.food.name}
                      </span>
                      <span>₱{li.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div
                  style={{ height: 1, background: "#e5e7eb", margin: "12px 0" }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Subtotal</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Delivery Fee</span>
                  <span>₱{deliveryFee.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 14,
                      color: "#16a34a",
                      marginTop: 8,
                    }}
                  >
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div
                  style={{ height: 1, background: "#e5e7eb", margin: "12px 0" }}
                />

                {/* total_amount — ERD field */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 20,
                  }}
                >
                  <span>Total Amount</span>
                  <span style={{ color: "#FF5A36" }}>
                    ₱{total_amount.toFixed(2)}
                  </span>
                </div>

                {/* Error message */}
                {error && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#dc2626",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 12,
                    }}
                  >
                    {error}
                  </p>
                )}

                {/* Confirmation prompt — shown after first click */}
                {showConfirm ? (
                  <div
                    style={{
                      border: "1px solid #fbbf24",
                      borderRadius: 8,
                      background: "#fffbeb",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        color: "#92400e",
                        margin: 0,
                        fontWeight: 500,
                      }}
                    >
                      Confirm your order for ₱{total_amount.toFixed(2)}?
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={confirmOrder}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: 8,
                          border: "none",
                          background: "#FF5A36",
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Yes, Place Order
                      </button>
                      <button
                        onClick={dismissConfirm}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          color: "#374151",
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={requestConfirm}
                    disabled={loading || placed}
                    aria-busy={loading}
                    aria-label={
                      loading ? "Placing order, please wait" : undefined
                    }
                    className="checkout-cta"
                    style={{
                      width: "100%",
                      padding: "13px",
                      borderRadius: 10,
                      border: "none",
                      cursor: loading || placed ? "not-allowed" : "pointer",
                      fontSize: 15,
                      fontWeight: 600,
                      background: placed ? "#16a34a" : "#FF5A36",
                      color: "#fff",
                      opacity: loading || placed ? 0.85 : 1,
                      boxShadow:
                        placed || loading
                          ? "none"
                          : "0 4px 12px rgba(255, 90, 54, 0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      fontFamily: "inherit",
                    }}
                  >
                    {loading ? (
                      <>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            border: "2px solid rgba(255,255,255,0.3)",
                            borderTopColor: "#fff",
                            borderRadius: "50%",
                            display: "inline-block",
                            animation: "spin 0.7s linear infinite",
                          }}
                        />
                        Placing Order…
                      </>
                    ) : placed ? (
                      "✓ Order Placed!"
                    ) : (
                      "Place Order"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Visible focus ring for keyboard users (WCAG 2.4.7). */
        .checkout-input:focus,
        .checkout-input:focus-visible {
          outline: 2px solid #FF5A36;
          outline-offset: 1px;
          border-color: #FF5A36;
        }
        /* Lift the primary CTA on hover for warmer feedback. */
        .checkout-cta:hover:not(:disabled) {
          background: #e84a28 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(255, 90, 54, 0.25);
        }
        .checkout-cta { transition: background 0.18s, transform 0.18s, box-shadow 0.18s; }
        /* Mobile: collapse 2-col to 1-col, drop sticky review. */
        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-review-inner { position: static !important; top: auto !important; }
        }
      `}</style>
    </div>
  );
}
