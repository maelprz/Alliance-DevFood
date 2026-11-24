import { useState, useEffect, useRef } from "react";
import { useNotifications } from "../context/useNotifications";
import NotificationIcon from "./NotificationIcon";

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding: "10px 16px 6px", fontSize: 13, fontWeight: 600, color: "#101828" }}>
      {children}
    </div>
  );
}

function NotificationRow({ n, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 16px",
        border: "none",
        borderTop: "1px solid #f2f4f7",
        background: n.isRead ? "#fff" : "#fffaf8",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <NotificationIcon type={n.type} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 600, color: "#101828" }}>
            {n.title}
          </span>
          <span style={{ fontSize: 11, color: "#98a2b3", whiteSpace: "nowrap" }}>
            {timeAgo(n.createdAt)}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "#475467", lineHeight: 1.4, marginTop: 2 }}>
          {n.message}
        </div>
        {n.couponCode && (
          <span
            style={{
              marginTop: 8,
              display: "inline-block",
              padding: "3px 8px",
              background: "#f2f4f7",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "#344054",
              letterSpacing: "0.04em",
            }}
          >
            {n.couponCode}
          </span>
        )}
      </div>
      {!n.isRead && (
        <span
          aria-label="Unread"
          style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5A36", marginTop: 6, flexShrink: 0 }}
        />
      )}
    </button>
  );
}

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    olderNotifications,
    hasMoreOlder,
    loadingOlder,
    loadOlder,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  
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
            border: "1px solid #eaecf0",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(16, 24, 40, 0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "14px 16px 10px",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "#101828" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#667085",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 && olderNotifications.length === 0 ? (
              <div style={{ padding: "28px 16px 24px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 14, color: "#344054" }}>You're all caught up</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#98a2b3" }}>
                  Nothing new this week.
                </p>
              </div>
            ) : (
              <>
                {notifications.length > 0 && <SectionLabel>Last 7 days</SectionLabel>}
                {notifications.map((n) => (
                  <NotificationRow key={n.id} n={n} onClick={() => handleItemClick(n)} />
                ))}
                {olderNotifications.length > 0 && <SectionLabel>Older</SectionLabel>}
                {olderNotifications.map((n) => (
                  <NotificationRow key={n.id} n={n} onClick={() => handleItemClick(n)} />
                ))}
              </>
            )}

            <div style={{ padding: "10px 16px 14px", borderTop: "1px solid #f2f4f7" }}>
              {hasMoreOlder ? (
                <button
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: 8,
                    background: "#f2f4f7",
                    color: "#344054",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: loadingOlder ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {loadingOlder ? "Loading…" : "See previous notifications"}
                </button>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: "#98a2b3", textAlign: "center" }}>
                  No older notifications.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
