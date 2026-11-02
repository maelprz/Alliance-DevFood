import { useState, useEffect, useRef } from "react";
import { useNotifications } from "../context/useNotifications";

const TYPE_LABELS = {
  order_status: "Order Update",
  coupon: "New Coupon",
  broadcast: "Announcement",
};

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return undefined;
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleItemClick = (n) => {
    if (!n.isRead) markRead(n.id);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        style={{
          position: "relative",
          background: open ? "#f3f4f6" : "none",
          border: "1px solid",
          borderColor: open ? "#e5e7eb" : "transparent",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              background: "#FF5A36",
              color: "#fff",
              borderRadius: "50%",
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 460,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#FF5A36",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: 13,
                }}
              >
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "block",
                    padding: "12px 16px",
                    border: "none",
                    borderBottom: "1px solid #f3f4f6",
                    background: n.isRead ? "#fff" : "#fff7ed",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#FF5A36",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {TYPE_LABELS[n.type] || "Notification"}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#111827",
                      marginBottom: 2,
                    }}
                  >
                    {n.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  {n.couponCode && (
                    <div
                      style={{
                        marginTop: 8,
                        display: "inline-block",
                        padding: "4px 10px",
                        background: "#fdf6ef",
                        border: "1px dashed #FF5A36",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#c2410c",
                        fontFamily: "monospace",
                        letterSpacing: 1,
                      }}
                    >
                      {n.couponCode}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
