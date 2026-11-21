import { authHeaders } from "./authService";

// orderService — every /api/orders call for Place Order and Track Order.
// Views and providers call these instead of using fetch directly.

// Split a server order record into { order, items, payment }.
export function splitOrderRecord(record) {
  const { items, payment, ...order } = record;
  return { order, items: items ?? [], payment: payment ?? null };
}

// All orders (admin list). Returns null when the request fails so callers
// can keep their current copy.
export async function fetchAllOrders() {
  try {
    const res = await fetch("/api/orders");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// The user's active order record, or null when there is none.
export async function fetchActiveOrder(userId) {
  const res = await fetch(`/api/orders/active?user_id=${encodeURIComponent(userId)}`);
  return res.json();
}

// One order by id, for status polling.
// Returns { notFound: true } on 404, null on other failures, else the record.
export async function fetchOrder(orderId) {
  const res = await fetch(`/api/orders/${orderId}`);
  if (res.status === 404) return { notFound: true };
  if (!res.ok) return null;
  return res.json();
}

// Place an order. Throws an Error with the server's reason on failure
// (item sold out, invalid coupon, outside the delivery zone, ...).
export async function createOrder({ order, items, payment }) {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ order, items, payment }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to place your order. Please try again.");
  }
  return res.json();
}

// Customer cancel. The server only allows it while the order is Pending.
// Returns { success, message? } and never throws.
export async function cancelOrderRequest(orderId) {
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status: "Cancelled" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, message: data.message || "Cancel failed." };
    }
    return { success: true };
  } catch {
    return { success: false, message: "Network error while cancelling." };
  }
}
