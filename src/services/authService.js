// Exports only authService functions — React Compiler rule (one export type per file)
// Checklist: separate API service layer from UI components.
// All fetch() calls go to /api which Vite proxies to the Express server (localhost:5000).

import { API_BASE, STORAGE_KEYS } from "../constants/auth";

// ── Internal helper ───────────────────────────────────────────────────────────

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
      "Cannot reach the server. Make sure it is running:\n  cd server && npm start",
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

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Registers a new customer account.
 * The server hashes the password with bcryptjs and writes to users.json.
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
 * Authenticates a user. On success, persists the session token in sessionStorage.
 * Checklist: token stored in sessionStorage (not localStorage).
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ success: boolean, message: string, user?: object }>}
 */
export async function loginUser({ email, password }) {
  const { res, data } = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    return {
      success: false,
      message: data.message || "Invalid email or password.",
    };
  }

  // Persist session — token in sessionStorage, clears when tab closes
  sessionStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
  sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

  return { success: true, message: data.message, user: data.user };
}

/**
 * Fetches a user's profile from the server (no passwordHash).
 * @param {string} userId
 * @returns {Promise<{ success: boolean, message?: string, user?: object }>}
 */
export async function getUserProfile(userId) {
  const { res, data } = await apiFetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
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
  const { res, data } = await apiFetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { success: false, message: data.message || "Failed to update profile." };

  // Keep the cached user in sync so Navbar etc. update without a re-login
  try {
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable — non-fatal
  }
  return { success: true, user: data };
}

// ── Session helpers ───────────────────────────────────────────────────────────

/**
 * Restores a session from sessionStorage on app mount.
 * @returns {{ user: object|null, token: string|null }}
 */
export function restoreSession() {
  try {
    const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    const user = JSON.parse(
      sessionStorage.getItem(STORAGE_KEYS.USER) || "null",
    );
    if (token && user) return { user, token };
  } catch {
    clearSession();
  }
  return { user: null, token: null };
}

/**
 * Clears all auth session data from sessionStorage.
 * Checklist: logout clears token completely.
 */
export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.USER);
}
