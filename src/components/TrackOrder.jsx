import { useState } from "react";
import { useOrder } from "../context/useOrder";
import { useNav } from "../context/useNav";
import { useMenu } from "../hooks/useMenu";
import { useOrderStatus } from "../hooks/useOrderStatus";
import { useRiderProgress, describeTrip } from "../hooks/useRiderProgress";
import { useCancelWindow } from "../hooks/useCancelWindow";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  STATUS_CYCLE,
  STEP_LABEL,
  PAYMENT_LABEL,
  PAYMENT_STATUS_LABEL,
  formatTime,
  formatOrderId,
  formatDateTime,
} from "../constants/orderStatus";
import Navbar from "./Navbar";
import DeliveryMap from "./DeliveryMap";
import OrderStatusIcon from "./OrderStatusIcon";
import CancelCountdown from "./CancelCountdown";
import { VIEW } from "../constants/views";

// ─── TrackOrder — Feature 5 (John Calen Nombrado) ────────────────────────────
// Grab-style layout: the live map fills the page and a status panel sits on
// top of it on the right. The panel says what is happening and when, shows
// the four steps, the drop-off address, the order summary and Cancel.
// Logic lives in hooks/useOrderStatus.js (polling) and
// hooks/useRiderProgress.js (rider, arrival time, panel sentences).

const ORANGE = "#FF5A36";
const PANEL_WIDTH = 380;
const PANEL_INSET = 16;

// Placed → Preparing → On the way → Delivered, as icons joined by a line.
// Each label sits centred directly under its own icon.
function StepIcons({ currentIdx }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        // Room for the labels under the icons, and for the first/last label
        // to stay centred under its icon without leaving the panel.
        padding: "0 14px 22px",
      }}
    >
      {STATUS_CYCLE.map((stage, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={stage} style={{ display: "contents" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: done ? ORANGE : "#f3f4f6",
                  boxShadow: current ? "0 0 0 4px rgba(255, 90, 54, 0.2)" : "none",
                  transition: "background 0.3s",
                }}
              >
                <OrderStatusIcon status={stage} color={done ? "#fff" : "#9ca3af"} size={18} />
              </div>
              <span
                style={{
                  position: "absolute",
                  top: 40,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  fontSize: 11,
                  color: current ? "#c2410c" : "#6b7280",
                  fontWeight: current ? 600 : 400,
                }}
              >
                {STEP_LABEL[stage]}
              </span>
            </div>
            {i < STATUS_CYCLE.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i < currentIdx ? ORANGE : "#e5e7eb",
                  transition: "background 0.4s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, strong = false, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: strong ? 15 : 13,
        fontWeight: strong ? 700 : 400,
        padding: "3px 0",
      }}
    >
      <span style={{ color: color ?? (strong ? "#111827" : "#6b7280") }}>{label}</span>
      <span style={{ color: color ?? (strong ? ORANGE : "#111827"), textAlign: "right" }}>{value}</span>
    </div>
  );
}

const sectionStyle = { borderTop: "1px solid #f3f4f6", paddingTop: 14 };
const smallLabel = { fontSize: 12, color: "#6b7280", margin: "0 0 4px" };

export default function TrackOrder() {
  const {
    activeOrder,
    setActiveOrder,
    orderItems,
    activePayment,
    cancelOrder,
    loadingActive,
  } = useOrder();
  const { navigate } = useNav();
  const { menuItems } = useMenu();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Follows the status the admin sets (polls every second).
  useOrderStatus();

  const hasMap = activeOrder?.delivery_lat != null && activeOrder?.delivery_lng != null;
  const trip = useRiderProgress({
    orderId: activeOrder?.order_id,
    status: activeOrder?.status,
    dropoff: hasMap ? { lat: activeOrder.delivery_lat, lng: activeOrder.delivery_lng } : null,
  });

  const currentIdx = activeOrder
    ? STATUS_CYCLE.indexOf(activeOrder.status)
    : -1;
  const isDelivered = activeOrder?.status === ORDER_STATUS.DELIVERED;
  // Cancel is allowed only during the cancel window after placing. When it
  // ends, the server accepts the order automatically (Pending -> Preparing).
  const cancelWindow = useCancelWindow(activeOrder);
  const canCancel = activeOrder?.status === ORDER_STATUS.PENDING && cancelWindow.canCancel;

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
  if (activeOrder?.status === ORDER_STATUS.CANCELLED) {
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
              {formatOrderId(activeOrder.order_id)} was cancelled
            </p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "8px 0 20px" }}>
              Sorry about that. You won't be charged ₱
              {(activeOrder.total_amount ?? 0).toFixed(2)} for this order.
            </p>
            <button
              onClick={() => {
                setActiveOrder(null);
                navigate(VIEW.MENU);
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
            onClick={() => navigate(VIEW.CHECKOUT)}
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


  const text = describeTrip(activeOrder.status, trip);
  const total = (activeOrder.total_amount ?? 0).toFixed(2);
  const paid = activePayment?.status === PAYMENT_STATUS.PAID;

  // ── Status panel (sits on the map, or alone for orders without a pin) ────
  const panel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 20,
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* What is happening and when — announced to screen readers on change. */}
      <div aria-live="polite" aria-atomic="true">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3 }}>
          {text.title}
        </h1>
        {text.subtitle && (
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>{text.subtitle}</p>
        )}
      </div>

      <StepIcons currentIdx={currentIdx} />

      {text.hint && (
        <div
          style={{
            background: "#fff4f0",
            color: "#9a3412",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 13,
          }}
        >
          {text.hint}
        </div>
      )}
      {isDelivered && (
        <div
          role="status"
          style={{
            background: "#dcfce7",
            color: "#166534",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {paid ? `Payment received · ₱${total} paid in cash` : "Delivered · thank you for ordering"}
        </div>
      )}

      <div style={sectionStyle}>
        <p style={smallLabel}>Deliver to</p>
        <p style={{ fontSize: 14, color: "#111827", margin: 0 }}>
          {activeOrder.delivery_address ?? "—"}
        </p>
      </div>

      <div style={sectionStyle}>
        {/* Full breakdown always shown — no hidden "Details" toggle. */}
        <p style={{ ...smallLabel, marginBottom: 6 }}>
          Order ID: {formatOrderId(activeOrder.order_id)} ·{" "}
          {PAYMENT_LABEL[activePayment?.payment_method] ?? activePayment?.payment_method ?? "—"}
        </p>

        {orderItems.map((oi) => {
          // Prefer the live menu (authoritative price), but fall back to
          // the snapshot stored on the order item itself so deleted/renamed
          // menu entries still display correctly.
          const food = menuItems.find((f) => f.food_id === oi.food_id);
          const displayName = food?.name ?? oi.name ?? "Item";
          const lineTotal = food ? food.price * oi.quantity : (oi.price ?? 0) * oi.quantity;
          return (
            <Row
              key={oi.order_item_id}
              label={`${oi.quantity}× ${displayName}`}
              value={`₱${lineTotal.toFixed(2)}`}
            />
          );
        })}

        <Row label="Subtotal" value={`₱${(activeOrder.subtotal ?? 0).toFixed(2)}`} />
        {activeOrder.discount_amount > 0 && (
          <Row
            label={`Discount (${activeOrder.coupon_code})`}
            value={`-₱${(activeOrder.discount_amount ?? 0).toFixed(2)}`}
            color="#16a34a"
          />
        )}
        <Row label="Delivery fee" value={`₱${(activeOrder.delivery_fee ?? 0).toFixed(2)}`} />
        <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 6, paddingTop: 6 }}>
          <Row strong label={isDelivered ? "Total paid" : "Total to pay"} value={`₱${total}`} />
        </div>

        <div style={{ marginTop: 8 }}>
          <Row
            label="Payment"
            value={PAYMENT_STATUS_LABEL[activePayment?.status] ?? activePayment?.status ?? "—"}
          />
          <Row label="Placed" value={formatDateTime(activeOrder.created_at) ?? "—"} />
        </div>
      </div>

      {/* ── Bottom: countdown + Cancel during the window, otherwise why it's closed ── */}
      <div style={{ marginTop: "auto", ...sectionStyle }}>
        {canCancel && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <CancelCountdown progress={cancelWindow.progress} label={cancelWindow.label} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>
                Free to cancel
              </p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
                The kitchen starts when the timer ends
              </p>
            </div>
          </div>
        )}

        {canCancel && !showCancelConfirm && (
          <button
            onClick={() => {
              setCancelError(null);
              setShowCancelConfirm(true);
            }}
            style={{
              width: "100%",
              padding: "10px",
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
        )}

        {canCancel && showCancelConfirm && (
          <div
            role="alertdialog"
            aria-label="Confirm cancel order"
            style={{
              border: "1px solid #fca5a5",
              borderRadius: 10,
              background: "#fef2f2",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p style={{ fontSize: 13, color: "#991b1b", margin: 0, fontWeight: 500 }}>
              Cancel this order? This action cannot be undone.
            </p>
            {cancelError && (
              <p style={{ fontSize: 12, color: "#991b1b", margin: 0 }}>{cancelError}</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
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
                    navigate(VIEW.MENU);
                  } else {
                    setCancelError(result?.message || "Failed to cancel.");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
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

        {/* Window just ended; the server moves it to Preparing within a few seconds. */}
        {activeOrder.status === ORDER_STATUS.PENDING && !canCancel && (
          <p role="status" style={{ fontSize: 12, color: "#6b7280", margin: 0, textAlign: "center" }}>
            Order confirmed · cancellation closed, the kitchen is starting your order
          </p>
        )}

        {(activeOrder.status === ORDER_STATUS.PREPARING || activeOrder.status === ORDER_STATUS.READY) && (
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0, textAlign: "center" }}>
            Cancellation closed · the kitchen has started your order
          </p>
        )}

        {isDelivered && (
          <button
            onClick={() => navigate(VIEW.MENU)}
            className="track-cta"
            style={{
              width: "100%",
              padding: "11px",
              background: ORANGE,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Order Again
          </button>
        )}
      </div>
    </div>
  );

  const panelBox = {
    background: "#ffffff",
    borderRadius: 14,
    border: "1px solid #f3e8df",
    boxShadow: "0 8px 24px rgba(31, 41, 55, 0.12)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <Navbar />

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "16px 24px 24px" }}>
        {/* Back + order line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => navigate(VIEW.MENU)}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              fontSize: 14,
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            Back to Menu
          </button>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Order ID:{" "}
            <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#111827" }}>
              {formatOrderId(activeOrder.order_id)}
            </span>
            {activeOrder.created_at && ` · placed ${formatTime(activeOrder.created_at)}`}
          </span>
        </div>

        {hasMap ? (
          // Map fills the stage; the panel floats over its right side.
          <div
            style={{
              position: "relative",
              height: "calc(100vh - 64px - 16px - 24px - 34px)",
              minHeight: 600,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              background: "#f3f4f6",
            }}
          >
            <DeliveryMap
              dropoff={{ lat: activeOrder.delivery_lat, lng: activeOrder.delivery_lng }}
              route={trip.route}
              fraction={trip.fraction}
              padRight={PANEL_WIDTH + PANEL_INSET + 40}
            />
            <aside
              aria-label="Order status"
              style={{
                ...panelBox,
                position: "absolute",
                top: PANEL_INSET,
                right: PANEL_INSET,
                bottom: PANEL_INSET,
                width: PANEL_WIDTH,
                overflowY: "auto",
                zIndex: 1,
              }}
            >
              {panel}
            </aside>
          </div>
        ) : (
          // Orders placed before the map pin existed: panel on its own.
          <aside
            aria-label="Order status"
            style={{ ...panelBox, maxWidth: 440, margin: "24px auto 0" }}
          >
            {panel}
          </aside>
        )}
      </div>

      <style>{`
        .track-cta:hover { background: #e84a28 !important; }
      `}</style>
    </div>
  );
}
