import { API_ROUTES, ROLES, TOTAL_COUNT_HEADER } from "../constants/auth";
import { authHeaders } from "./authService";

// Admin "Registered Users" calls. A 401 comes back as { expired: true }
// so the screen can send the admin back to the login page.

export async function listUsers({ page, pageSize, search, sort, dir }) {
  const params = new URLSearchParams({ page, pageSize });
  if (search) params.set("search", search);
  if (sort) params.set("sort", sort);
  if (dir) params.set("dir", dir);
  const res = await fetch(`${API_ROUTES.USERS}?${params}`, { headers: authHeaders(ROLES.ADMIN) });
  if (res.status === 401) return { expired: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const users = await res.json();
  return { users, total: Number(res.headers.get(TOTAL_COUNT_HEADER) || 0) };
}

export async function setUserActive(userId, active) {
  const action = active ? "reactivate" : "deactivate";
  const res = await fetch(`${API_ROUTES.USERS}/${encodeURIComponent(userId)}/${action}`, {
    method: "PATCH",
    headers: authHeaders(ROLES.ADMIN),
  });
  if (res.status === 401) return { expired: true };
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}
