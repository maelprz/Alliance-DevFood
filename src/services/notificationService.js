import { API_ROUTES, SESSION_EXPIRED_EVENT, ROLES, NOTIFICATION_AUDIENCES } from "../constants/auth";
import { authHeaders, clearSession } from "./authService";

// Customer notification calls used by NotificationProvider.

function expireSession() {
  clearSession();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

// The bell: notifications from the last 7 days.
export async function getNotifications(userId) {
  const res = await fetch(`${API_ROUTES.NOTIFICATIONS}?user_id=${encodeURIComponent(userId)}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    expireSession();
    return [];
  }
  const list = res.ok ? await res.json() : [];
  return Array.isArray(list) ? list : [];
}

// "See previous notifications": older than 7 days, one page at a time.
// Returns { items, total, page, totalPages }, or null when the session expired.
export async function getOlderNotifications(userId, page) {
  const params = new URLSearchParams({ user_id: userId, page });
  const res = await fetch(`${API_ROUTES.NOTIFICATIONS}/older?${params}`, { headers: authHeaders() });
  if (res.status === 401) {
    expireSession();
    return null;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// The bell already shows the item as read, so a failed request is not shown to the user.
function sendRead(url, userId) {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ user_id: userId }),
  }).catch(() => null);
}

export function markNotificationRead(notificationId, userId) {
  return sendRead(`${API_ROUTES.NOTIFICATIONS}/${notificationId}/read`, userId);
}

export function markAllNotificationsRead(userId) {
  return sendRead(`${API_ROUTES.NOTIFICATIONS}/read-all`, userId);
}

// Admin "Messages for new users" box. Each saved message is copied into a
// customer's bell right after they sign up.

export async function getNewUserMessages() {
  const res = await fetch(`${API_ROUTES.NOTIFICATIONS}/new-users`, { headers: authHeaders(ROLES.ADMIN) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function saveNewUserMessage({ title, message, couponCode }) {
  const res = await fetch(API_ROUTES.NOTIFICATIONS, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(ROLES.ADMIN) },
    body: JSON.stringify({
      title,
      message,
      couponCode: couponCode || undefined,
      audience: NOTIFICATION_AUDIENCES.NEW_USERS,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function removeNewUserMessage(id) {
  const res = await fetch(`${API_ROUTES.NOTIFICATIONS}/${id}`, {
    method: "DELETE",
    headers: authHeaders(ROLES.ADMIN),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// Coupon statuses (from the coupon module) that can still be attached to a message.
const PICKABLE_COUPON_STATUSES = new Set(["Active", "Scheduled"]);

export async function getCouponChoices() {
  const res = await fetch(API_ROUTES.COUPONS, { headers: authHeaders(ROLES.ADMIN) });
  if (!res.ok) return [];
  const list = await res.json();
  return Array.isArray(list) ? list.filter((c) => PICKABLE_COUPON_STATUSES.has(c.status)) : [];
}
