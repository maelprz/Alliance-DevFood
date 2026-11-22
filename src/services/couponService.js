import { API_BASE, ROLES } from "../constants/auth";
import { authHeaders } from "./authService";

const COUPONS_URL = `${API_BASE}/coupons`;

async function request(path, errorMessage, { method = "GET", body, signal } = {}) {
  const headers = authHeaders(ROLES.ADMIN);
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${COUPONS_URL}${path}`, {
    method,
    headers,
    signal,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message || errorMessage);
  return data;
}

export function listCoupons(page, signal) {
  return request(`/admin-page?page=${page}`, "Could not load coupons. Please check your admin login.", { signal });
}

export function createCoupon(coupon) {
  return request("", "Failed to add coupon. Please check the details.", { method: "POST", body: coupon });
}

export function updateCoupon(code, isDisabled) {
  return request(`/${encodeURIComponent(code)}`, "Failed to update coupon.", {
    method: "PATCH",
    body: { isDisabled },
  });
}

export function removeCoupon(code) {
  return request(`/${encodeURIComponent(code)}`, "Failed to delete coupon. Please try again.", { method: "DELETE" });
}
