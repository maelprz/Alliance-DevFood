import { useState, useEffect } from "react";
import { NavContext } from "./NavContext";

// Valid views: 'login' | 'forgot-password' | 'reset-password' | 'menu' | 'cart' |
//              'checkout' | 'track' | 'admin-login' | 'admin'
// Exports only NavProvider component — React Compiler rule.
//
// View is persisted in sessionStorage so a page refresh keeps the user where
// they were. Cleared automatically when the tab closes (sessionStorage scope).
const VIEW_KEY = "devfood:view";

export function NavProvider({ children }) {
  const [view, setView] = useState(() => {
    try {
      // Password reset emails link to /?reset_token=... — open that page first.
      if (new URLSearchParams(window.location.search).has("reset_token")) {
        return "reset-password";
      }
      return sessionStorage.getItem(VIEW_KEY) || "menu";
    } catch {
      return "menu";
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(VIEW_KEY, view);
    } catch {
      // sessionStorage unavailable (private mode quota) — non-fatal.
    }
  }, [view]);

  const navigate = (to) => setView(to);

  return (
    <NavContext.Provider value={{ view, navigate }}>
      {children}
    </NavContext.Provider>
  );
}
