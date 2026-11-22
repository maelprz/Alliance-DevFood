import { API_BASE } from "../constants/auth";
import { authHeaders } from "./authService";

const CART_URL = `${API_BASE}/cart`;

async function request(path, errorMessage, { method = "GET", body, signal } = {}) {
  const headers = authHeaders();
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${CART_URL}${path}`, {
    method,
    headers,
    signal,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message || errorMessage);
  return data;
}

export async function getCart(signal) {
  const { items } = await request("", "Could not load your cart.", { signal });
  return items;
}

export async function saveCart(items, signal) {
  const data = await request("", "Could not save your cart.", {
    method: "PUT",
    body: { items: items.map(({ food_id, quantity }) => ({ food_id, quantity })) },
    signal,
  });
  return data.items;
}

export function previewCoupon(code, subtotal, signal) {
  return request("/apply-coupon", "Could not apply this coupon.", {
    method: "POST",
    body: { code, subtotal },
    signal,
  });
}
