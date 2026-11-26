



import { API_ROUTES, STORAGE_KEYS, SESSION_EXPIRED_EVENT, ROLES } from "../constants/auth";




async function apiFetch(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    
    throw new Error(
      "Can't reach the server. Is the API running?",
    );
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Something went wrong (error ${res.status}).`);
  }

  return { res, data };
}


// Browser storage can throw (private mode, blocked site data); then nothing is saved.
function tryStorage(action) {
  try {
    return action();
  } catch {
    return null;
  }
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
  const { res, data } = await apiFetch(API_ROUTES.REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    return {
      success: false,
      message: data.message || "Sign up failed. Please try again.",
    };
  }

  return { success: true, message: data.message, user: data.user };
}


export async function loginUser({ email, password }) {
  const { res, data } = await apiFetch(API_ROUTES.LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
  }

  return { success: true, message: data.message, user: data.user };
}


export async function logoutUser() {
  const headers = authHeaders();
  clearSession();
  if (!headers.Authorization) return;
  await fetch(API_ROUTES.LOGOUT, { method: "POST", headers }).catch(() => null);
}


export async function fetchCurrentUser() {
  try {
    const { res, data } = await authorizedFetch(API_ROUTES.ME, { method: "GET" });
    if (!res.ok) return null;
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data));
    return data;
  } catch {
    
    return restoreSession().user;
  }
}


export async function fetchCurrentAdmin() {
  const headers = authHeaders(ROLES.ADMIN);
  if (!headers.Authorization) return null;
  try {
    const res = await fetch(API_ROUTES.ME, { headers });
    return res.ok ? await res.json() : null;
  } catch {
    return undefined;
  }
}


export async function getUserProfile(userId) {
  const { res, data } = await authorizedFetch(`${API_ROUTES.USERS}/${encodeURIComponent(userId)}`, {
    method: "GET",
  });
  if (!res.ok) return { success: false, message: data.message || "Couldn't load your profile." };
  return { success: true, user: data };
}


export async function updateUserProfile(userId, payload) {
  const { res, data } = await authorizedFetch(`${API_ROUTES.USERS}/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { success: false, message: data.message || "Couldn't save your changes." };

  
  
  const user = { ...data, permissions: restoreSession().user?.permissions ?? [] };
  tryStorage(() => sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)));
  return { success: true, user };
}


export async function requestPasswordReset(email) {
  const { res, data } = await apiFetch(API_ROUTES.FORGOT_PASSWORD, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) return { success: false, message: data.message || "Couldn't send the reset link." };
  return { success: true, message: data.message, devResetLink: data.devResetLink };
}


export async function resetPassword(token, newPassword) {
  const { res, data } = await apiFetch(API_ROUTES.RESET_PASSWORD, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  return {
    success: res.ok,
    message: data.message || (res.ok ? "Password reset." : "Couldn't reset your password."),
  };
}




export function authHeaders(kind = ROLES.CUSTOMER) {
  try {
    const token =
      kind === ROLES.ADMIN
        ? sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN)
        : sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}


export function restoreSession() {
  try {
    const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    const user = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.USER) || "null");
    if (token && user) return { user, token };
  } catch {
    clearSession();
  }
  return { user: null, token: null };
}


// Also clears localStorage, where the old "Remember me" option used to keep the login.
export function clearSession() {
  for (const store of [sessionStorage, localStorage]) {
    tryStorage(() => {
      store.removeItem(STORAGE_KEYS.TOKEN);
      store.removeItem(STORAGE_KEYS.USER);
    });
  }
}


export function saveAdminToken(token) {
  tryStorage(() => sessionStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token));
}


export async function logoutAdmin() {
  const headers = authHeaders(ROLES.ADMIN);
  tryStorage(() => sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN));
  if (!headers.Authorization) return;
  await fetch(API_ROUTES.LOGOUT, { method: "POST", headers }).catch(() => null);
}
