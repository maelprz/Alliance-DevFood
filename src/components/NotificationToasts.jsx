import { useEffect } from "react";

const AUTO_DISMISS_MS = 6000;

const TOAST_STYLE = {
  order_confirmed: { accent: "#16a34a", icon: "✓" },
  order_status: { accent: "#FF5A36", icon: "🔔" },
};

// One toast; dismisses itself after a few seconds.
function Toast({ toast, onDismiss, onOpen }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const { accent, icon } = TOAST_STYLE[toast.type] ?? TOAST_STYLE.order_status;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: "#ffffff",
        borderLeft: `4px solid ${accent}`,
        borderRadius: 10,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
        padding: "12px 14px",
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
        pointerEvents: "auto",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, color: accent, lineHeight: 1.2 }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{toast.title}</p>
        <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>{toast.message}</p>
      </div>
      <button
        onClick={() => {
          onOpen(toast.id);
          onDismiss(toast.id);
        }}
        aria-label="Dismiss notification"
        style={{
          background: "none",
          border: "none",
          color: "#9ca3af",
          fontSize: 16,
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// In-app alerts for Order Confirmed / Order Status Update notifications,
// stacked in the bottom-right corner.
// Exports only NotificationToasts component — React Compiler rule
export default function NotificationToasts({ toasts, onDismiss, onOpen }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 2000,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} onOpen={onOpen} />
      ))}
    </div>
  );
}
