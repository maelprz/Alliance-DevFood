import { useState, useEffect } from "react";
import { AppContext } from "./AppContext";
import {
  restoreSession,
  fetchCurrentUser,
  logoutUser,
  logoutAdmin,
} from "../services/authService";
import { SESSION_EXPIRED_EVENT } from "../constants/auth";

// Admin session lives in sessionStorage so refresh on /admin doesn't bounce
// to login. Same scope as the customer token — cleared on tab close.
const ADMIN_KEY = "devfood:adminUser";

function loadAdmin() {
  try {
    const raw = sessionStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Exports only AppProvider component — React Compiler rule (one export type per file)
export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUserState] = useState(loadAdmin);

  // Restore customer session on mount — same useEffect pattern as professor's Main.jsx.
  // The cached user shows immediately; the server then confirms the token is still
  // valid (not expired, logged out, or deactivated) and refreshes the user.
  useEffect(() => {
    const { user: savedUser } = restoreSession();
    if (!savedUser) return;
    setUser(savedUser);
    fetchCurrentUser().then((current) => setUser(current));
  }, []);

  // The service layer fires this whenever the API answers 401 for the customer.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Wrap setAdminUser so callers automatically persist/clear sessionStorage.
  // Clearing it (admin logout) also revokes the admin's token on the server.
  function setAdminUser(next) {
    setAdminUserState(next);
    try {
      if (next) sessionStorage.setItem(ADMIN_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(ADMIN_KEY);
    } catch {
      // sessionStorage unavailable — state still updates in memory.
    }
    if (!next) logoutAdmin();
  }

  /**
   * Logs out the current customer.
   * Revokes the token on the server, clears storage and resets user state.
   * Checklist: logout clears token completely.
   */
  function logout() {
    logoutUser();
    setUser(null);
  }

  return (
    <AppContext.Provider
      value={{ user, setUser, adminUser, setAdminUser, logout }}
    >
      {children}
    </AppContext.Provider>
  );
}
