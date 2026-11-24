import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationContext } from "./NotificationContext";
import { useApp } from "./useApp";
import {
  getNotifications,
  getOlderNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";
import { NOTIFICATION_TYPES } from "../constants/auth";
import NotificationToasts from "../components/NotificationToasts";


const TOAST_TYPES = new Set([NOTIFICATION_TYPES.ORDER_CONFIRMED, NOTIFICATION_TYPES.ORDER_STATUS]);

// Older-than-7-days pages loaded with "See previous notifications". Kept per user id,
// so a different account never sees the previous account's list.
const NO_OLDER = { userId: null, items: [], page: 0, totalPages: null, loading: false };




export function NotificationProvider({ children }) {
  const { user } = useApp();
  const userId = user?.id;
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [olderState, setOlderState] = useState(NO_OLDER);
  const older = olderState.userId === userId ? olderState : NO_OLDER;
  const intervalRef = useRef(null);
  
  
  const seenIdsRef = useRef(null);

  const fetchNotifications = useCallback((id) => {
    getNotifications(id)
      .then((items) => {
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
    if (!userId) {
      setNotifications([]);
      setToasts([]);
      return undefined;
    }
    fetchNotifications(userId);
    intervalRef.current = setInterval(() => fetchNotifications(userId), 5000);
    return () => clearInterval(intervalRef.current);
  }, [userId, fetchNotifications]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markRead = useCallback(
    async (id) => {
      if (!userId) return;
      const markOne = (list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      setNotifications(markOne);
      setOlderState((prev) => ({ ...prev, items: markOne(prev.items) }));
      await markNotificationRead(id, userId);
    },
    [userId]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const markAll = (list) => list.map((n) => ({ ...n, isRead: true }));
    setNotifications(markAll);
    setOlderState((prev) => ({ ...prev, items: markAll(prev.items) }));
    await markAllNotificationsRead(userId);
  }, [userId]);

  const loadOlder = useCallback(() => {
    if (!userId || older.loading) return;
    const nextPage = older.page + 1;
    setOlderState({ ...older, userId, loading: true });
    getOlderNotifications(userId, nextPage)
      .then((data) => {
        if (!data) return;
        setOlderState((prev) => {
          const base = prev.userId === userId ? prev : { ...NO_OLDER, userId };
          const known = new Set(base.items.map((n) => n.id));
          return {
            userId,
            items: [...base.items, ...data.items.filter((n) => !known.has(n.id))],
            page: data.page,
            totalPages: data.totalPages,
            loading: false,
          };
        });
      })
      .catch(() => setOlderState((prev) => ({ ...prev, loading: false })));
  }, [userId, older]);

  // An item right at the 7-day line can briefly be in both lists; show it once.
  const recentIds = new Set(notifications.map((n) => n.id));
  const olderNotifications = older.items.filter((n) => !recentIds.has(n.id));
  const hasMoreOlder = older.totalPages === null || older.page < older.totalPages;

  const unreadCount = notifications.reduce(
    (n, item) => n + (item.isRead ? 0 : 1),
    0
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        olderNotifications,
        hasMoreOlder,
        loadingOlder: older.loading,
        loadOlder,
      }}
    >
      {children}
      <NotificationToasts toasts={toasts} onDismiss={dismissToast} onOpen={markRead} />
    </NotificationContext.Provider>
  );
}
