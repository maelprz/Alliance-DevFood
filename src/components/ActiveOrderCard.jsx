import { useOrder } from "../context/useOrder";
import { useNav } from "../context/useNav";
import { useOrderStatus } from "../hooks/useOrderStatus";
import {
  useRiderProgress,
  describeTrip,
  overallProgress,
} from "../hooks/useRiderProgress";
import { useCancelWindow } from "../hooks/useCancelWindow";
import OrderStatusIcon from "./OrderStatusIcon";
import { ORDER_STATUS, formatOrderId } from "../constants/orderStatus";
import { VIEW } from "../constants/views";

// Floating "order in progress" card (Grab-style), bottom-left of every page
// with the navbar while an order is live. Clicking it opens Track Order.
// Navbar mounts it only when it should show, so it polls only then.
export default function ActiveOrderCard() {
  const { activeOrder } = useOrder();
  const { navigate } = useNav();

  // Keep the status fresh away from Track Order too (polls every second).
  useOrderStatus();

  const hasMap = activeOrder?.delivery_lat != null && activeOrder?.delivery_lng != null;
  const trip = useRiderProgress({
    orderId: activeOrder?.order_id,
    status: activeOrder?.status,
    dropoff: hasMap ? { lat: activeOrder.delivery_lat, lng: activeOrder.delivery_lng } : null,
  });

  const cancelWindow = useCancelWindow(activeOrder);

  if (!activeOrder) return null;
  const text = describeTrip(activeOrder.status, trip);
  const progress = overallProgress(activeOrder.status, trip.fraction);
  // The card is small: show the arrival time when there is one, else the step.
  const line =
    activeOrder.status === ORDER_STATUS.PENDING && cancelWindow.canCancel
      ? `Free to cancel · ${cancelWindow.label}`
      : activeOrder.status === ORDER_STATUS.READY && trip.arriveAt
        ? text.subtitle
        : `${formatOrderId(activeOrder.order_id)} · ${activeOrder.status}`;

  return (
    <button
      onClick={() => navigate(VIEW.TRACK)}
      aria-label={`${text.title}. ${line}. Open order tracking.`}
      className="active-order-card"
      style={{
        // Bottom-left: notification toasts use the bottom-right corner.
        position: "fixed",
        left: 24,
        bottom: 24,
        zIndex: 60,
        width: 320,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "#ffffff",
        border: "1px solid #f3e8df",
        borderRadius: 14,
        boxShadow: "0 8px 24px rgba(31, 41, 55, 0.14)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "#fff4f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <OrderStatusIcon status={activeOrder.status} color="#c2410c" size={20} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {text.short}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 12,
            color: "#6b7280",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {line}
        </span>
        <span
          aria-hidden="true"
          style={{
            display: "block",
            height: 4,
            borderRadius: 2,
            background: "#f3f4f6",
            marginTop: 7,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              display: "block",
              height: 4,
              width: `${Math.round(progress * 100)}%`,
              background: "#FF5A36",
              borderRadius: 2,
              transition: "width 0.8s ease",
            }}
          />
        </span>
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#c2410c", flexShrink: 0 }}>
        Track ›
      </span>
      <style>{`
        .active-order-card { transition: transform 0.18s, box-shadow 0.18s; }
        .active-order-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(31, 41, 55, 0.18) !important; }
        .active-order-card:focus-visible { outline: 2px solid #FF5A36; outline-offset: 2px; }
      `}</style>
    </button>
  );
}
