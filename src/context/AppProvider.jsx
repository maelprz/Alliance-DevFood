import { useState, useEffect } from "react";
import { AppContext } from "./AppContext";
import { restoreSession, clearSession } from "../services/authService";

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

  // Restore customer session on mount — same useEffect pattern as professor's Main.jsx
  useEffect(() => {
    const { user: savedUser } = restoreSession();
    if (savedUser) setUser(savedUser);
  }, []);

  // Wrap setAdminUser so callers automatically persist/clear sessionStorage.
  function setAdminUser(next) {
    setAdminUserState(next);
    try {
      if (next) sessionStorage.setItem(ADMIN_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(ADMIN_KEY);
    } catch {
      // sessionStorage unavailable — state still updates in memory.
    }
  }

  /**
   * Logs out the current customer.
   * Clears sessionStorage token and resets user state.
   * Checklist: logout clears token completely.
   */
  function logout() {
    clearSession();
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
