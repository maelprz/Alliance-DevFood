import { useEffect } from "react";
import NotificationIcon from "./NotificationIcon";

const AUTO_DISMISS_MS = 6000;

function Toast({ toast, onDismiss, onOpen }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        background: "#1f2937",
        color: "#f9fafb",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(17, 24, 39, 0.25)",
        padding: "12px 12px 12px 14px",
        width: 340,
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
        pointerEvents: "auto",
      }}
    >
      <NotificationIcon type={toast.type} size={34} background="rgba(255, 90, 54, 0.18)" color="#ff8a65" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{toast.title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#d1d5db", lineHeight: 1.4 }}>{toast.message}</p>
      </div>
      <button
        onClick={() => {
          onOpen(toast.id);
          onDismiss(toast.id);
        }}
        aria-label="Dismiss"
        style={{
          alignSelf: "flex-start",
          background: "none",
          border: "none",
          color: "#9ca3af",
          fontSize: 18,
          lineHeight: 1,
          cursor: "pointer",
          padding: 2,
        }}
      >
        ×
      </button>
    </div>
  );
}

// Order Confirmed / Order Update pop-ups, bottom-right.
// Exports only NotificationToasts component — React Compiler rule
export default function NotificationToasts({ toasts, onDismiss, onOpen }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
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
