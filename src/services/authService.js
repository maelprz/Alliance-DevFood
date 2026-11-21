



import { API_BASE, STORAGE_KEYS, SESSION_EXPIRED_EVENT, ROLES } from "../constants/auth";




async function apiFetch(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    
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


function sessionStore() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.TOKEN)) return localStorage;
  } catch {
    
  }
  return sessionStorage;
}


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


export async function loginUser({ email, password, rememberMe = false }) {
  const { res, data } = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe }),
  });

  if (!res.ok) {
    return {
      success: false,
      
      deactivated: res.status === 403,
      message: data.message || "Invalid email or password.",
    };
  }

  clearSession();
  if (data.user.role === ROLES.ADMIN) {
    saveAdminToken(data.token);
  } else {
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(STORAGE_KEYS.TOKEN, data.token);
    store.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
  }

  return { success: true, message: data.message, user: data.user };
}


export async function logoutUser() {
  const headers = authHeaders();
  clearSession();
  if (!headers.Authorization) return;
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers });
  } catch {
    
  }
}


export async function fetchCurrentUser() {
  try {
    const { res, data } = await authorizedFetch(`${API_BASE}/auth/me`, { method: "GET" });
    if (!res.ok) return null;
    sessionStore().setItem(STORAGE_KEYS.USER, JSON.stringify(data));
    return data;
  } catch {
    
    return restoreSession().user;
  }
}


export async function fetchCurrentAdmin() {
  const headers = authHeaders("admin");
  if (!headers.Authorization) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { headers });
    return res.ok ? await res.json() : null;
  } catch {
    return undefined;
  }
}


export async function getUserProfile(userId) {
  const { res, data } = await authorizedFetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
    method: "GET",
  });
  if (!res.ok) return { success: false, message: data.message || "Failed to load profile." };
  return { success: true, user: data };
}


export async function updateUserProfile(userId, payload) {
  const { res, data } = await authorizedFetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { success: false, message: data.message || "Failed to update profile." };

  
  
  const user = { ...data, permissions: restoreSession().user?.permissions ?? [] };
  try {
    sessionStore().setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch {
    
  }
  return { success: true, user };
}


export async function requestPasswordReset(email) {
  const { res, data } = await apiFetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) return { success: false, message: data.message || "Could not send the reset link." };
  return { success: true, message: data.message, devResetLink: data.devResetLink };
}


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


export function clearSession() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(STORAGE_KEYS.TOKEN);
      store.removeItem(STORAGE_KEYS.USER);
    } catch {
      
    }
  }
}


export function saveAdminToken(token) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
  } catch {
    
  }
}


export async function logoutAdmin() {
  const headers = authHeaders("admin");
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  } catch {
    
  }
  if (!headers.Authorization) return;
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers });
  } catch {
    
  }
}
