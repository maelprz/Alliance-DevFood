import { useState, useEffect } from "react";
import { AppContext } from "./AppContext";
import {
  restoreSession,
  fetchCurrentUser,
  fetchCurrentAdmin,
  logoutUser,
  logoutAdmin,
} from "../services/authService";
import { SESSION_EXPIRED_EVENT, PERMISSIONS } from "../constants/auth";
import { hasPermission } from "../utils/rbac";

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
  // The saved customer session is restored before the first render, so pages that
  // need a logged-in user (e.g. My Profile) don't treat a page refresh as a guest.
  const [user, setUser] = useState(() => restoreSession().user);
  const [adminUser, setAdminUserState] = useState(loadAdmin);

  // The server then confirms the saved token is still valid (not expired, logged
  // out, or deactivated) and refreshes the user.
  useEffect(() => {
    if (!restoreSession().user) return;
    fetchCurrentUser().then((current) => setUser(current));
  }, []);

  // Same for a saved admin session: re-read the role and permissions from the server,
  // so an admin whose role was changed (or who was logged out) loses the admin panel.
  useEffect(() => {
    if (!loadAdmin()) return;
    fetchCurrentAdmin().then((current) => {
      if (current === undefined) return; // server unreachable — keep the cached admin
      const stillAdmin = hasPermission(current, PERMISSIONS.ADMIN_PANEL);
      setAdminUserState(stillAdmin ? current : null);
      try {
        if (stillAdmin) sessionStorage.setItem(ADMIN_KEY, JSON.stringify(current));
        else sessionStorage.removeItem(ADMIN_KEY);
      } catch {
        // sessionStorage unavailable — state still updates in memory.
      }
      if (!stillAdmin) logoutAdmin();
    });
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
