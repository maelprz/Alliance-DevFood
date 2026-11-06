// Exports only authService functions — React Compiler rule (one export type per file)
// Checklist: separate API service layer from UI components.
// All fetch() calls go to /api which Vite proxies to the ASP.NET Core API (localhost:5143).

import { API_BASE, STORAGE_KEYS, SESSION_EXPIRED_EVENT } from "../constants/auth";

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Wrapper around fetch that converts a network failure (server not running)
 * into a readable Error so the UI catch block can show something actionable
 * instead of a silent "Something went wrong."
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<{ res: Response, data: object }>}
 * @throws {Error} with a user-friendly message on network failure
 */
async function apiFetch(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    // fetch() threw — server is not reachable (not running, wrong port, etc.)
    throw new Error(
      "Cannot reach the server. Make sure the API is running (start.bat).",
    );
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Unexpected server response (HTTP ${res.status}).`);
  }

  return { res, data };
}

/** Storage that currently holds the customer session ("Remember me" → localStorage). */
function sessionStore() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.TOKEN)) return localStorage;
  } catch {
    // localStorage unavailable — fall through to sessionStorage.
  }
  return sessionStorage;
}

/**
 * Like apiFetch, but sends the customer's token. A 401 means the session is no
 * longer valid, so it is cleared and SESSION_EXPIRED_EVENT tells the app to log out.
 */
async function authorizedFetch(url, options = {}) {
  const result = await apiFetch(url, {
    ...options,
    headers: { ...options.headers, ...authHeaders() },
  });
  if (result.res.status === 401) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return result;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Registers a new customer account. The server validates the fields, checks
 * that the email is unique and stores a bcrypt hash of the password.
 *
 * @param {{ name: string, email: string, password: string }} payload
 * @returns {Promise<{ success: boolean, message: string, user?: object }>}
 */
export async function registerUser({ name, email, password }) {
  const { res, data } = await apiFetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    return {
      success: false,
      message: data.message || "Registration failed. Please try again.",
    };
  }

  return { success: true, message: data.message, user: data.user };
}

/**
 * Authenticates a user and persists the JWT. By default the session lives in
 * sessionStorage (cleared when the tab closes); with rememberMe it goes to
 * localStorage and the server issues a 30-day token instead of an 8-hour one.
 *
 * @param {{ email: string, password: string, rememberMe?: boolean }} credentials
 * @returns {Promise<{ success: boolean, message: string, user?: object }>}
 */
export async function loginUser({ email, password, rememberMe = false }) {
  const { res, data } = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe }),
  });

  if (!res.ok) {
    return {
      success: false,
      // 403 = deactivated account; not counted as a failed password attempt
      deactivated: res.status === 403,
      message: data.message || "Invalid email or password.",
    };
  }

  clearSession();
  const store = rememberMe ? localStorage : sessionStorage;
  store.setItem(STORAGE_KEYS.TOKEN, data.token);
  store.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

  return { success: true, message: data.message, user: data.user };
}

/**
 * Revokes the customer's token on the server, then clears it locally.
 * Local logout always happens, even if the server can't be reached.
 */
export async function logoutUser() {
  const headers = authHeaders();
  clearSession();
  if (!headers.Authorization) return;
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers });
  } catch {
    // Server unreachable — the token will still expire on its own.
  }
}

/**
 * Asks the server whether the stored token is still valid and returns the
 * up-to-date user. Used on app start so a revoked or deactivated session
 * doesn't linger in storage.
 *
 * @returns {Promise<object|null>} the user, or null if the session is invalid
 */
export async function fetchCurrentUser() {
  try {
    const { res, data } = await authorizedFetch(`${API_BASE}/auth/me`, { method: "GET" });
    if (!res.ok) return null;
    sessionStore().setItem(STORAGE_KEYS.USER, JSON.stringify(data));
    return data;
  } catch {
    // Server unreachable — keep the cached session for now.
    return restoreSession().user;
  }
}

/**
 * Fetches a user's profile from the server (no passwordHash).
 * @param {string} userId
 * @returns {Promise<{ success: boolean, message?: string, user?: object }>}
 */
export async function getUserProfile(userId) {
  const { res, data } = await authorizedFetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
    method: "GET",
  });
  if (!res.ok) return { success: false, message: data.message || "Failed to load profile." };
  return { success: true, user: data };
}

/**
 * Updates the editable profile fields. Pass only the fields being changed.
 * For a password change, include both currentPassword and newPassword.
 *
 * @param {string} userId
 * @param {{ name?: string, email?: string, phone?: string, address?: string, currentPassword?: string, newPassword?: string }} payload
 * @returns {Promise<{ success: boolean, message?: string, user?: object }>}
 */
export async function updateUserProfile(userId, payload) {
  const { res, data } = await authorizedFetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { success: false, message: data.message || "Failed to update profile." };

  // Keep the cached user in sync so Navbar etc. update without a re-login
  try {
    sessionStore().setItem(STORAGE_KEYS.USER, JSON.stringify(data));
  } catch {
    // storage unavailable — non-fatal
  }
  return { success: true, user: data };
}

/**
 * Requests a password reset link for the given email. The server answers the
 * same way whether or not the account exists. In local development without an
 * email server configured, it also returns the link as devResetLink.
 *
 * @param {string} email
 * @returns {Promise<{ success: boolean, message: string, devResetLink?: string }>}
 */
export async function requestPasswordReset(email) {
  const { res, data } = await apiFetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) return { success: false, message: data.message || "Could not send the reset link." };
  return { success: true, message: data.message, devResetLink: data.devResetLink };
}

/**
 * Sets a new password using the token from the emailed reset link.
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function resetPassword(token, newPassword) {
  const { res, data } = await apiFetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  return {
    success: res.ok,
    message: data.message || (res.ok ? "Password reset." : "Could not reset the password."),
  };
}

// ── Session helpers ───────────────────────────────────────────────────────────

/**
 * Authorization header for API calls.
 * @param {"customer"|"admin"} kind which session's token to send
 * @returns {{ Authorization?: string }}
 */
export function authHeaders(kind = "customer") {
  try {
    const token =
      kind === "admin"
        ? sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN)
        : sessionStore().getItem(STORAGE_KEYS.TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Restores a session from storage on app mount (sessionStorage first,
 * then a remembered session in localStorage).
 * @returns {{ user: object|null, token: string|null }}
 */
export function restoreSession() {
  try {
    const store = sessionStore();
    const token = store.getItem(STORAGE_KEYS.TOKEN);
    const user = JSON.parse(store.getItem(STORAGE_KEYS.USER) || "null");
    if (token && user) return { user, token };
  } catch {
    clearSession();
  }
  return { user: null, token: null };
}

/**
 * Clears all customer session data from both storages.
 * Checklist: logout clears token completely.
 */
export function clearSession() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(STORAGE_KEYS.TOKEN);
      store.removeItem(STORAGE_KEYS.USER);
    } catch {
      // storage unavailable — nothing to clear
    }
  }
}

/** Stores the admin's JWT for the admin pages (tab-scoped, like the admin user). */
export function saveAdminToken(token) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
  } catch {
    // sessionStorage unavailable — admin API calls will be rejected.
  }
}

/** Revokes the admin's token on the server and clears it locally. */
export async function logoutAdmin() {
  const headers = authHeaders("admin");
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  } catch {
    // sessionStorage unavailable
  }
  if (!headers.Authorization) return;
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers });
  } catch {
    // Server unreachable — the token will still expire on its own.
  }
}
