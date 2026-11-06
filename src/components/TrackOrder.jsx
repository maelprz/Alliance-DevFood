import { useState, useEffect } from "react";
import { useOrder } from "../context/useOrder";
import { useNav } from "../context/useNav";
import { useMenu } from "../hooks/useMenu";
import Navbar from "./Navbar";
import DeliveryMap from "./DeliveryMap";

// ── Status config — DO NOT MODIFY (matches ERD exactly) ──────────────────────
const STATUS_CYCLE = ["Pending", "Preparing", "Ready", "Delivered"];

const STATUS_META = {
  Pending: {
    label: "Pending",
    color: "#b45309",
    bg: "#fef3c7",
    desc: "Order received. Awaiting kitchen confirmation.",
  },
  Preparing: {
    label: "Preparing",
    color: "#1d4ed8",
    bg: "#dbeafe",
    desc: "Your food is being freshly prepared.",
  },
  Ready: {
    label: "Ready",
    color: "#7c3aed",
    bg: "#ede9fe",
    desc: "Your food is ready and your rider is on the way.",
  },
  Delivered: {
    label: "Delivered",
    color: "#15803d",
    bg: "#dcfce7",
    desc: "Order delivered successfully. Enjoy your meal!",
  },
  Cancelled: {
    label: "Cancelled",
    color: "#b91c1c",
    bg: "#fee2e2",
    desc: "This order was cancelled.",
  },
};

// Inline SVGs render identically across OS/browsers, unlike emoji glyphs.
function StatusIcon({ status, color, size = 28 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (status) {
    case "Pending":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "Preparing":
      return (
        <svg {...props}>
          <path d="M6 13h12l-1 7H7z" />
          <path d="M9 9c0-2 1-3 3-3s3 1 3 3" />
          <path d="M5 13h14" />
        </svg>
      );
    case "Ready":
      return (
        <svg {...props}>
          <path d="M4 17h16" />
          <path d="M6 17a6 6 0 0 1 12 0" />
          <path d="M12 5v2" />
        </svg>
      );
    case "Delivered":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l3 3 5-6" />
        </svg>
      );
    default:
      return null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── TrackOrder — Feature 5 (John Calen Nombrado) ────────────────────────────
// All ERD logic is preserved exactly. Only the visual layer was updated to match
// the approved Figma Make UI design (vertical stepper).
// Exports only TrackOrder component — React Compiler rule
// Friendly labels for the stored payment_method values.
const PAYMENT_LABEL = {
  "credit-card": "Credit Card",
  gcash: "GCash",
  cod: "Cash on Delivery",
};

function formatDeliveredAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default function TrackOrder() {
  const {
    activeOrder,
    setActiveOrder,
    orderItems,
    activePayment,
    advanceStatus,
    cancelOrder,
    loadingActive,
  } = useOrder();
  const { navigate } = useNav();
  const { menuItems } = useMenu();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const orderId = activeOrder?.order_id;
  // Delivered and Cancelled are final, so polling stops there.
  const isFinal =
    activeOrder?.status === "Delivered" || activeOrder?.status === "Cancelled";

  useEffect(() => {
  if (!orderId || isFinal) return;

  const interval = setInterval(async () => {
    try {
      const res = await fetch(
        `/api/orders/${orderId}`
      );

      if (res.status === 404) {
        navigate("menu");
        return;
      }
      if (!res.ok) return;

      const updatedOrder = await res.json();

      setActiveOrder((prev) => ({ ...prev, status: updatedOrder.status || "Pending", }));

    } catch (err) {
      console.error("Error fetching order status:", err);
    }
  }, 1000);

  return () => clearInterval(interval);
}, [orderId, isFinal, navigate, setActiveOrder]);

  const currentIdx = activeOrder
    ? STATUS_CYCLE.indexOf(activeOrder.status)
    : -1;
  const isDelivered = activeOrder?.status === "Delivered";
  // Cancellation is only allowed while the kitchen hasn't started — i.e. Pending.
  const canCancel = activeOrder?.status === "Pending";
  const meta = activeOrder ? STATUS_META[activeOrder.status || "Pending"] : STATUS_META["Pending"];

  // Skeleton while the active order is being fetched from the server.
  // Prevents the empty-state flash on first render after login/refresh.
  if (loadingActive) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent" }}>
        <Navbar />
        <div
          style={{
            maxWidth: 700,
            margin: "32px auto",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: 32,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            aria-busy="true"
            aria-label="Loading your order"
          >
            <div
              style={{
                height: 20,
                width: "60%",
                background: "#f3f4f6",
                borderRadius: 6,
              }}
            />
            <div
              style={{
                height: 14,
                width: "40%",
                background: "#f3f4f6",
                borderRadius: 6,
              }}
            />
            <div
              style={{ height: 1, background: "#e5e7eb", margin: "8px 0" }}
            />
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 16, alignItems: "center" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#f3f4f6",
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    height: 14,
                    background: "#f3f4f6",
                    borderRadius: 6,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Cancelled by the kitchen/admin while the customer was watching.
  if (activeOrder?.status === "Cancelled") {
    return (
      <div style={{ minHeight: "100vh", background: "transparent" }}>
        <Navbar />
        <div style={{ maxWidth: 560, margin: "48px auto", padding: "0 16px" }}>
          <div
            role="status"
            style={{
              background: "#ffffff",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 28,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 18, fontWeight: 700, color: "#b91c1c", margin: 0 }}>
              Order #{activeOrder.order_id} was cancelled
            </p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "8px 0 20px" }}>
              Sorry about that. You won't be charged ₱
              {(activeOrder.total_amount ?? 0).toFixed(2)} for this order.
            </p>
            <button
              onClick={() => {
                setActiveOrder(null);
                navigate("menu");
              }}
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
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeOrder) {
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
            No active order found.
          </p>
          <button
            onClick={() => navigate("checkout")}
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
            ← Place an Order First
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "transparent" }}
      className="track-page"
    >
      <Navbar />

      <div
        style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}
        className="track-content"
      >
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

        {/* Main card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #f3e8df",
            padding: 0,
            marginBottom: 16,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(31, 41, 55, 0.04)",
          }}
        >
          {/* Warm hero strip — sets the food-delivery tone right at the top. */}
          <div
            style={{
              height: 6,
              background:
                "linear-gradient(90deg, #FF5A36 0%, #FB923C 50%, #FBBF24 100%)",
            }}
          />
          <div style={{ padding: 32 }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#111827",
                  margin: "0 0 8px",
                }}
              >
                {activeOrder.status === "Pending"
                  ? "Order Placed Successfully!"
                  : activeOrder.status === "Delivered"
                  ? "Order Delivered"
                  : "Track Your Order"}
              </h1>
              <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
                Order ID:{" "}
                <span
                  style={{
                    fontWeight: 600,
                    color: "#111827",
                    fontFamily: "monospace",
                  }}
                >
                  #{activeOrder.order_id}
                </span>
              </p>
            </div>

            {/* ── Vertical stepper ─────────────────────────────────────────── */}
            <div style={{ marginBottom: 32 }}>
              {STATUS_CYCLE.map((stage, i) => {
                const isCompleted = i <= currentIdx;
                const isCurrent = i === currentIdx;
                const descriptions = {
                  Pending: "Order Received",
                  Preparing: "In the Kitchen",
                  Ready: "Rider on the way",
                  Delivered: "Enjoy Your Meal!",
                };

                return (
                  <div
                    key={stage}
                    style={{ display: "flex", gap: 16, position: "relative" }}
                  >
                    {/* Connector line */}
                    {i < STATUS_CYCLE.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 19,
                          top: 44,
                          width: 2,
                          height: 56,
                          background: i < currentIdx ? "#FF5A36" : "#e5e7eb",
                          transition: "background 0.4s",
                          zIndex: 0,
                        }}
                      />
                    )}

                    {/* Circle */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: isCompleted ? "#FF5A36" : "#f3f4f6",
                        color: isCompleted ? "#fff" : "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                        zIndex: 1,
                        boxShadow: isCurrent
                          ? "0 0 0 4px rgba(255, 90, 54, 0.22)"
                          : "none",
                        transition: "all 0.3s",
                      }}
                    >
                      <StatusIcon
                        status={stage}
                        color={isCompleted ? "#fff" : "#9ca3af"}
                        size={20}
                      />
                    </div>

                    {/* Label */}
                    <div style={{ paddingTop: 6, paddingBottom: 32 }}>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: isCurrent
                            ? "#FF5A36"
                            : isCompleted
                            ? "#111827"
                            : "#6b7280",
                          margin: "0 0 2px",
                          transition: "color 0.3s",
                        }}
                      >
                        {stage}
                      </h3>
                      <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                        {descriptions[stage]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Status banner ─────────────────────────────────────────────── */}
            {/* aria-live=polite announces status changes to screen readers without
              interrupting; aria-atomic ensures the full new status reads, not a diff. */}
            <div
              aria-live="polite"
              aria-atomic="true"
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: "14px 16px",
                background: meta.bg,
                border: `1px solid ${meta.color}33`,
                borderLeft: `4px solid ${meta.color}`,
                borderRadius: 10,
                marginBottom: 28,
              }}
            >
              <StatusIcon status={activeOrder.status} color={meta.color} />
              <div>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: meta.color,
                    margin: "0 0 2px",
                  }}
                >
                  {meta.label}
                </p>
                <p style={{ fontSize: 13, color: "#4b5563", margin: 0 }}>
                  {meta.desc}
                </p>
              </div>
            </div>

            {/* ── Live delivery map (simulated rider) — orders with a map pin ── */}
            {activeOrder.delivery_lat != null && activeOrder.delivery_lng != null && (
              <DeliveryMap
                orderId={activeOrder.order_id}
                status={activeOrder.status}
                dropoff={{ lat: activeOrder.delivery_lat, lng: activeOrder.delivery_lng }}
              />
            )}

            {/* ── Order Details (ERD fields) ─────────────────────────────────── */}
            <div
              style={{
                background: "#fdf6ef",
                borderRadius: 12,
                padding: 24,
                border: "1px solid #f3e8df",
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111827",
                  margin: "0 0 16px",
                }}
              >
                Order Details
              </h2>

              {/* Order details fields */}
              {[
                ["Status", activeOrder.status, true],
                ["Payment Method", PAYMENT_LABEL[activePayment?.payment_method] ?? activePayment?.payment_method ?? "—", false],
                ["Delivery Address", activeOrder.delivery_address ?? "—", false],
                ["Order Placed", activeOrder.created_at ? new Date(activeOrder.created_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—", false],
              ].map(([key, val, isStatus]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: 14,
                    gap: 12,
                  }}
                >
                  <span style={{ color: "#6b7280" }}>{key}</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: isStatus ? meta.color : "#111827",
                      textAlign: "right",
                    }}
                  >
                    {String(val)}
                  </span>
                </div>
              ))}

              {/* Divider */}
              <div
                style={{ height: 1, background: "#d1d5db", margin: "16px 0" }}
              />

              {/* OrderItems */}
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  margin: "0 0 12px",
                }}
              >
                Order Items
              </h3>
              {orderItems.map((oi) => {
                // Prefer the live menu (authoritative price), but fall back to
                // the snapshot stored on the order item itself so deleted/renamed
                // menu entries still display correctly.
                const food = menuItems.find((f) => f.food_id === oi.food_id);
                const displayName = food?.name ?? oi.name ?? "Item";
                const lineTotal = food
                  ? food.price * oi.quantity
                  : (oi.price ?? 0) * oi.quantity;
                return (
                  <div
                    key={oi.order_item_id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 14,
                      padding: "6px 0",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>
                      {oi.quantity}× {displayName}
                    </span>
                    <span style={{ color: "#FF5A36", fontWeight: 600 }}>
                      ₱{lineTotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}

              {/* Pricing Breakdown */}
<div style={{ marginTop: 16 }}>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 14,
      padding: "6px 0",
    }}
  >
    <span style={{ color: "#6b7280" }}>Subtotal</span>
    <span>₱{(activeOrder.subtotal ?? 0).toFixed(2)}</span>
  </div>

  {activeOrder.discount_amount > 0 && (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 14,
        padding: "6px 0",
      }}
    >
      <span style={{ color: "#16a34a" }}>
        Discount ({activeOrder.coupon_code})
      </span>

      <span style={{ color: "#16a34a", fontWeight: 600 }}>
        -₱{(activeOrder.discount_amount ?? 0).toFixed(2)}
      </span>
    </div>
  )}

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 14,
      padding: "6px 0",
      borderBottom: "1px solid #e5e7eb",
    }}
  >
    <span style={{ color: "#6b7280" }}>Delivery Fee</span>

    <span>
      ₱{(activeOrder.delivery_fee ?? 0).toFixed(2)}
    </span>
  </div>
</div>

{/* Total */}
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    fontSize: 16,
    fontWeight: 700,
    marginTop: 16,
  }}
>
  <span>Total</span>

  <span style={{ color: "#FF5A36" }}>
    ₱{(activeOrder.total_amount ?? 0).toFixed(2)}
  </span>
</div>
            </div>
          </div>
        </div>

        {/* ── Cancel Order — only available while still Pending ────────────── */}
        {canCancel && !showCancelConfirm && (
          <div style={{ textAlign: "right", marginBottom: 12 }}>
            <button
              onClick={() => {
                setCancelError(null);
                setShowCancelConfirm(true);
              }}
              style={{
                padding: "8px 18px",
                background: "#fff",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                color: "#dc2626",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel Order
            </button>
          </div>
        )}

        {/* Locked notice once the kitchen has started — explains why no cancel button. */}
        {(activeOrder?.status === "Preparing" || activeOrder?.status === "Ready") && (
          <div
            style={{
              border: "1px solid #fde68a",
              background: "#fffbeb",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 12,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            Cancellation is locked — the kitchen is already preparing your order.
          </div>
        )}

        {canCancel && showCancelConfirm && (
          <div
            style={{
              border: "1px solid #fca5a5",
              borderRadius: 10,
              background: "#fef2f2",
              padding: 14,
              marginBottom: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
            role="alertdialog"
            aria-label="Confirm cancel order"
          >
            <p
              style={{
                fontSize: 13,
                color: "#991b1b",
                margin: 0,
                fontWeight: 500,
              }}
            >
              Cancel this order? This action cannot be undone.
            </p>
            {cancelError && (
              <p style={{ fontSize: 12, color: "#991b1b", margin: 0 }}>
                {cancelError}
              </p>
            )}
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Keep Order
              </button>
              <button
                onClick={async () => {
                  const result = await cancelOrder();
                  if (result?.success) {
                    navigate("menu");
                  } else {
                    setCancelError(result?.message || "Failed to cancel.");
                  }
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        )}

        {/* Developer Toggle — only visible in dev builds (vite dev server). */}
        {!isDelivered && import.meta.env.DEV && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              background: "#111827",
              borderRadius: 12,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "#9ca3af",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14.7 6.3a4 4 0 1 0 5.7 5.7l-7 7-3.7.7.7-3.7 7-7z" />
                <path d="M3 21l4-4" />
              </svg>
              Developer Toggle
            </span>
            <button
              onClick={advanceStatus}
              style={{
                padding: "8px 16px",
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: 8,
                color: "#f9fafb",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
              }}
            >
              Advance →{" "}
              <strong style={{ color: meta.color }}>
                {STATUS_CYCLE[currentIdx + 1]}
              </strong>
            </button>
          </div>
        )}

        {/* Delivery-app style paid summary — only shown after delivery completes. */}
        {isDelivered && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* Green header — the "PAID" stamp */}
            <div
              style={{
                background: "#dcfce7",
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: "1px solid #bbf7d0",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#15803d",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#15803d",
                    margin: 0,
                  }}
                >
                  Payment Successful
                </p>
                <p
                  style={{ fontSize: 12, color: "#166534", margin: "2px 0 0" }}
                >
                  Your order has been delivered.
                </p>
              </div>
            </div>

            {/* Total paid — large, the focal point */}
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: 0,
                }}
              >
                Total Paid
              </p>
              <p
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#111827",
                  margin: "6px 0 0",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ₱{(activeOrder.total_amount ?? 0).toFixed(2)}
              </p>
            </div>

            {/* Meta rows — payment method, order id, delivered timestamp */}
            <div style={{ padding: "0 24px 20px" }}>
              <div
                style={{ height: 1, background: "#f3f4f6", marginBottom: 14 }}
              />
              {[
                [
                  "Paid via",
                  PAYMENT_LABEL[activePayment?.payment_method] ?? "—",
                ],
                ["Order #", String(activeOrder.order_id)],
                [
                  "Ordered",
                  formatDeliveredAt(activeOrder.created_at) ?? "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "6px 0",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>{label}</span>
                  <span style={{ color: "#111827", fontWeight: 500 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer — light affirmation */}
            <div
              style={{
                background: "transparent",
                padding: "14px 24px",
                textAlign: "center",
                fontSize: 12,
                color: "#6b7280",
                borderTop: "1px solid #f3f4f6",
              }}
            >
              Thank you for ordering with DevFood.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
