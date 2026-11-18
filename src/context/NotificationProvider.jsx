import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationContext } from "./NotificationContext";
import { useApp } from "./useApp";
import { authHeaders, clearSession } from "../services/authService";
import { SESSION_EXPIRED_EVENT } from "../constants/auth";
import NotificationToasts from "../components/NotificationToasts";

// Notification types that also pop up as an in-app toast when they arrive.
const TOAST_TYPES = new Set(["order_confirmed", "order_status"]);

// Polls /api/notifications for the logged-in user. Server returns both direct
// notifications and broadcasts, each tagged with isRead — the provider just
// mirrors that list, and raises a toast for new order notifications.
export function NotificationProvider({ children }) {
  const { user } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const intervalRef = useRef(null);
  // ids already shown to this user; null until the first fetch so existing
  // notifications don't all pop up as toasts on login.
  const seenIdsRef = useRef(null);

  const fetchNotifications = useCallback((userId) => {
    fetch(`/api/notifications?user_id=${encodeURIComponent(userId)}`, {
      headers: authHeaders(),
    })
      .then((r) => {
        if (r.status === 401) {
          // Token expired / revoked / account deactivated — log the customer out.
          clearSession();
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then((list) => {
        const items = Array.isArray(list) ? list : [];
        const seen = seenIdsRef.current;
        if (seen) {
          const fresh = items.filter(
            (n) => !seen.has(n.id) && !n.isRead && TOAST_TYPES.has(n.type)
          );
          if (fresh.length > 0) setToasts((prev) => [...prev, ...fresh]);
        }
        seenIdsRef.current = new Set(items.map((n) => n.id));
        setNotifications(items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    seenIdsRef.current = null;
    if (!user?.id) {
      setNotifications([]);
      setToasts([]);
      return undefined;
    }
    fetchNotifications(user.id);
    intervalRef.current = setInterval(() => fetchNotifications(user.id), 5000);
    return () => clearInterval(intervalRef.current);
  }, [user?.id, fetchNotifications]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markRead = useCallback(
    async (id) => {
      if (!user?.id) return;
      // Optimistic update — flip isRead locally, then sync with the server.
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      try {
        await fetch(`/api/notifications/${id}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ user_id: user.id }),
        });
      } catch {
        // Network error — next poll will reconcile.
      }
    },
    [user?.id]
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch(`/api/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ user_id: user.id }),
      });
    } catch {
      // Network error — next poll will reconcile.
    }
  }, [user?.id]);

  const unreadCount = notifications.reduce(
    (n, item) => n + (item.isRead ? 0 : 1),
    0
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead }}
    >
      {children}
      <NotificationToasts toasts={toasts} onDismiss={dismissToast} onOpen={markRead} />
    </NotificationContext.Provider>
  );
}
