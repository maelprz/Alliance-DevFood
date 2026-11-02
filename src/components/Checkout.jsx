import { useState, useEffect } from "react";
import { useOrder } from "../context/useOrder";
import { useNav } from "../context/useNav";
import { useApp } from "../context/useApp";
import { useCart } from "../context/CartContext";
import Navbar from "./Navbar";

// generateOrderId OUTSIDE component — React Compiler rule (no Math.random() during render)
function generateOrderId() {
  return Math.floor(Math.random() * 90000) + 10000;
}

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
  if (kind === "credit-card") {
    return (
      <svg {...props}>
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <path d="M2 11h20" />
        <path d="M6 16h3" />
      </svg>
    );
  }
  if (kind === "gcash") {
    return (
      <svg {...props}>
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
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
// All ERD logic is preserved exactly. Only the visual layer was updated to match
// the approved Figma Make UI design.
//
// Exports only Checkout component — React Compiler rule
export default function Checkout() {
  const { placeOrder } = useOrder();
  const { navigate } = useNav();
  const { user } = useApp();
  const { cartItems, clearCart } = useCart();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) {
      navigate("menu");
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("credit-card");
  // Delivery address — UI only (not in Order ERD, kept for visual completeness)
  const [address, setAddress] = useState({ street: "", city: "", zip: "" });
  // Saved profile address: read-only by default, edit toggle reveals the
  // street/city/zip form below. Starts in "saved" mode when the user has one.
  // Prefer the structured fields; fall back to the legacy `address` string.
  const savedStreet = user?.addressStreet?.trim() ?? "";
  const savedCity = user?.addressCity?.trim() ?? "";
  const savedZip = user?.addressZip?.trim() ?? "";
  const savedAddress =
    savedStreet && savedCity && savedZip
      ? `${savedStreet}, ${savedCity} ${savedZip}`
      : user?.address?.trim() ?? "";
  const [editingAddress, setEditingAddress] = useState(!savedAddress);
  // Payment detail fields — conditional on selected payment method
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
  });
  const [gcashPhone, setGcashPhone] = useState("");

  // CartContext spreads food data directly into each item — no separate lookup needed
  const lineItems = cartItems.map((ci) => ({
    ...ci,
    food: ci,
    subtotal: ci.price * ci.quantity,
  }));

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

  const DELIVERY_FEE = 49.0;

  const subtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);

  // Get applied coupon from localStorage
  const appliedCoupon = JSON.parse(
    localStorage.getItem("appliedCoupon") || "null",
  );

  // Calculate discount
  const discountAmount = appliedCoupon
    ? subtotal * (appliedCoupon.discountPercent / 100)
    : 0;

  // Final total after discount + delivery fee
  const total_amount = subtotal - discountAmount + DELIVERY_FEE;

  // ── Validation — runs before confirmation dialog is shown ────────────────────
  const validate = () => {
    const errors = {};

    // Address fields are only validated when the user is editing them.
    // When the saved profile address is used, no field validation is needed.
    if (editingAddress) {
      const streetVal = address.street.trim();
      if (!streetVal) {
        errors.street = "Street address is required.";
      } else if (streetVal.length < 10) {
        errors.street = "Enter a complete address (e.g. 123 Rizal Avenue).";
      }
      const cityVal = address.city.trim();
      if (!cityVal) {
        errors.city = "City is required.";
      } else if (!/^[a-zA-Z\s]+$/.test(cityVal) || cityVal.length < 4) {
        errors.city = "Enter a valid city name (e.g. Manila).";
      }
      if (!/^\d{4}$/.test(address.zip.trim()))
        errors.zip = "ZIP must be a 4-digit number.";
    }

    if (paymentMethod === "credit-card") {
      const rawNum = cardDetails.number.replace(/\s/g, "");
      if (!/^\d{16}$/.test(rawNum))
        errors.cardNumber = "Card number must be 16 digits.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry)) {
        errors.expiry = "Enter expiry as MM/YY.";
      } else {
        const [mm, yy] = cardDetails.expiry.split("/");
        const expDate = new Date(
          2000 + parseInt(yy, 10),
          parseInt(mm, 10) - 1,
          1,
        );
        const now = new Date();
        if (expDate < new Date(now.getFullYear(), now.getMonth(), 1))
          errors.expiry = "Card is expired.";
      }
      if (!/^\d{3,4}$/.test(cardDetails.cvv))
        errors.cvv = "CVV must be 3 or 4 digits.";
    }

    if (paymentMethod === "gcash") {
      if (!/^09\d{9}$/.test(gcashPhone.replace(/\s/g, "")))
        errors.gcashPhone = "Enter a valid GCash number (09XXXXXXXXX).";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Core order logic ──────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 1400));

      // Build Order object — matches ERD exactly
      const order = {
        order_id: generateOrderId(),
        user_id: user?.id ?? "guest",
        customerName: user?.name ?? "Customer",
        status: "Pending",

        subtotal,
        delivery_fee: DELIVERY_FEE,

        coupon_code: appliedCoupon?.code || null,
        discount_amount: discountAmount || 0,

        total_amount,

        delivery_address: editingAddress
          ? `${address.street}, ${address.city} ${address.zip}`
          : savedAddress,
        created_at: new Date().toISOString(),
      };

      // Build OrderItem array — matches ERD exactly
      const items = cartItems.map((ci, idx) => ({
        order_item_id: Date.now() + idx,
        order_id: order.order_id,
        food_id: ci.food_id,
        quantity: ci.quantity,
        name: ci.name,
      }));

      // Build Payment object — matches Payment ERD entity
      const payment = { payment_method: paymentMethod };

      await placeOrder({ order, items, payment });

      localStorage.removeItem("appliedCoupon");
      console.log(localStorage.getItem("appliedCoupon"));
      clearCart();
      setPlaced(true);
      setTimeout(() => navigate("track"), 700);
    } catch {
      setError("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // className enables :focus-visible styling defined in the <style> block at the
  // bottom of this component — required for keyboard accessibility (WCAG 2.4.7).
  const inputStyle = (field) => ({
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${fieldErrors[field] ? "#fca5a5" : "#e5e7eb"}`,
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: fieldErrors[field] ? "#fef2f2" : "#fdf6ef",
    boxSizing: "border-box",
    fontFamily: "inherit",
  });
  const inputClass = "checkout-input";

  const fieldError = (field) =>
    fieldErrors[field] ? (
      <p style={{ fontSize: 12, color: "#dc2626", margin: "4px 0 0" }}>
        {fieldErrors[field]}
      </p>
    ) : null;

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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Delivery Address
                </h2>
                {savedAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingAddress) {
                        // Cancelling edit — restore saved address as the active choice
                        setAddress({ street: "", city: "", zip: "" });
                        setFieldErrors((prev) => ({
                          ...prev,
                          street: undefined,
                          city: undefined,
                          zip: undefined,
                        }));
                        setEditingAddress(false);
                      } else {
                        // Pre-fill from saved structured fields when available,
                        // otherwise dump the legacy string into street.
                        setAddress((prev) => ({
                          street: prev.street || savedStreet || savedAddress,
                          city: prev.city || savedCity,
                          zip: prev.zip || savedZip,
                        }));
                        setEditingAddress(true);
                      }
                    }}
                    style={{
                      padding: "6px 14px",
                      background: editingAddress ? "#fff" : "#FF5A36",
                      color: editingAddress ? "#374151" : "#fff",
                      border: editingAddress ? "1px solid #e5e7eb" : "none",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {editingAddress ? "Use Saved Address" : "Edit Address"}
                  </button>
                )}
              </div>
              {!editingAddress && savedAddress && (
                <div
                  style={{
                    background: "#fdf6ef",
                    border: "1px solid #f3e8df",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Deliver to
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#111827",
                      margin: "4px 0 0",
                    }}
                  >
                    {savedAddress}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0" }}>
                    Saved from your profile. Use the Edit Address button to change it for this order.
                  </p>
                </div>
              )}
              {editingAddress && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: "#374151",
                    }}
                  >
                    Street Address
                  </label>
                  <input
                    type="text"
                    placeholder="123 Rizal Avenue"
                    value={address.street}
                    onChange={(e) => {
                      setAddress({ ...address, street: e.target.value });
                      setFieldErrors((prev) => ({
                        ...prev,
                        street: undefined,
                      }));
                    }}
                    className={inputClass}
                    style={inputStyle("street")}
                  />
                  {fieldError("street")}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 6,
                        color: "#374151",
                      }}
                    >
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Manila"
                      value={address.city}
                      onChange={(e) => {
                        setAddress({ ...address, city: e.target.value });
                        setFieldErrors((prev) => ({
                          ...prev,
                          city: undefined,
                        }));
                      }}
                      className={inputClass}
                      style={inputStyle("city")}
                    />
                    {fieldError("city")}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 6,
                        color: "#374151",
                      }}
                    >
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      placeholder="1000"
                      maxLength={4}
                      value={address.zip}
                      onChange={(e) => {
                        setAddress({
                          ...address,
                          zip: e.target.value.replace(/\D/g, ""),
                        });
                        setFieldErrors((prev) => ({ ...prev, zip: undefined }));
                      }}
                      className={inputClass}
                      style={inputStyle("zip")}
                    />
                    {fieldError("zip")}
                  </div>
                </div>
              </div>
              )}
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
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[
                  { id: "credit-card", label: "Credit Card" },
                  { id: "gcash", label: "GCash" },
                  { id: "cod", label: "Cash on Delivery" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      border: `1px solid ${
                        paymentMethod === opt.id ? "#FF5A36" : "#e5e7eb"
                      }`,
                      borderRadius: 8,
                      cursor: "pointer",
                      background: paymentMethod === opt.id ? "#eff6ff" : "#fff",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={opt.id}
                      checked={paymentMethod === opt.id}
                      onChange={() => {
                        setPaymentMethod(opt.id);
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.cardNumber;
                          delete next.expiry;
                          delete next.cvv;
                          delete next.gcashPhone;
                          return next;
                        });
                      }}
                      style={{ accentColor: "#FF5A36" }}
                    />
                    <PaymentIcon
                      kind={opt.id}
                      color={paymentMethod === opt.id ? "#FF5A36" : "#374151"}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* ── Conditional payment detail fields ──────────────────────── */}
              {paymentMethod === "credit-card" && (
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 6,
                        color: "#374151",
                      }}
                    >
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      value={cardDetails.number}
                      onChange={(e) => {
                        // Auto-format: add space every 4 digits
                        const raw = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 16);
                        const formatted =
                          raw.match(/.{1,4}/g)?.join(" ") ?? raw;
                        setCardDetails((prev) => ({
                          ...prev,
                          number: formatted,
                        }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          cardNumber: undefined,
                        }));
                      }}
                      className={inputClass}
                      style={inputStyle("cardNumber")}
                    />
                    {fieldError("cardNumber")}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          marginBottom: 6,
                          color: "#374151",
                        }}
                      >
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="08/27"
                        maxLength={5}
                        value={cardDetails.expiry}
                        onChange={(e) => {
                          // Auto-insert slash after MM
                          let val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4);
                          if (val.length >= 3)
                            val = val.slice(0, 2) + "/" + val.slice(2);
                          setCardDetails((prev) => ({ ...prev, expiry: val }));
                          setFieldErrors((prev) => ({
                            ...prev,
                            expiry: undefined,
                          }));
                        }}
                        className={inputClass}
                        style={inputStyle("expiry")}
                      />
                      {fieldError("expiry")}
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          marginBottom: 6,
                          color: "#374151",
                        }}
                      >
                        CVV
                      </label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={4}
                        value={cardDetails.cvv}
                        onChange={(e) => {
                          setCardDetails((prev) => ({
                            ...prev,
                            cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                          }));
                          setFieldErrors((prev) => ({
                            ...prev,
                            cvv: undefined,
                          }));
                        }}
                        className={inputClass}
                        style={inputStyle("cvv")}
                      />
                      {fieldError("cvv")}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "gcash" && (
                <div style={{ marginTop: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: "#374151",
                    }}
                  >
                    GCash Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    value={gcashPhone}
                    onChange={(e) => {
                      setGcashPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 11),
                      );
                      setFieldErrors((prev) => ({
                        ...prev,
                        gcashPhone: undefined,
                      }));
                    }}
                    className={inputClass}
                    style={inputStyle("gcashPhone")}
                  />
                  {fieldError("gcashPhone")}
                </div>
              )}

              {paymentMethod === "cod" && (
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
                  Pay in cash when your order arrives. No details needed.
                </p>
              )}
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
                  <span>₱{DELIVERY_FEE.toFixed(2)}</span>
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
                        onClick={handleConfirm}
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
                        onClick={() => setShowConfirm(false)}
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
                    onClick={() => {
                      if (validate()) setShowConfirm(true);
                    }}
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
