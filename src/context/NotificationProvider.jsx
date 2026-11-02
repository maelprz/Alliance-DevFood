import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationContext } from "./NotificationContext";
import { useApp } from "./useApp";

// Polls /api/notifications for the logged-in user. Server returns both direct
// notifications and broadcasts, each tagged with isRead — the provider just
// mirrors that list.
export function NotificationProvider({ children }) {
  const { user } = useApp();
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback((userId) => {
    fetch(`/api/notifications?user_id=${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setNotifications(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return undefined;
    }
    fetchNotifications(user.id);
    intervalRef.current = setInterval(() => fetchNotifications(user.id), 5000);
    return () => clearInterval(intervalRef.current);
  }, [user?.id, fetchNotifications]);

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
          headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
    </NotificationContext.Provider>
  );
}
