import { useState, useEffect, useCallback } from "react";
import { NavContext } from "./NavContext";

// Valid views: 'login' | 'forgot-password' | 'reset-password' | 'menu' | 'cart' |
//              'checkout' | 'track' | 'admin-login' | 'admin'
// Exports only NavProvider component — React Compiler rule.
//
// View is persisted in sessionStorage so a page refresh keeps the user where
// they were. Cleared automatically when the tab closes (sessionStorage scope).
//
// The Cart page also has its own address: http://localhost:5173/cart.
// Every other page stays on "/". To give another page its own address later,
// add it to VIEW_PATHS below.
const VIEW_KEY = "devfood:view";
const VIEW_PATHS = new Map([["cart", "/cart"]]);
const currentPath = () => window.location.pathname.replace(/\/+$/, "") || "/";

// The view the address bar asks for, or null when it is just "/".
const viewFromUrl = () => {
  if (new URLSearchParams(window.location.search).has("reset_token")) {
    return "reset-password";
  }
  for (const [view, path] of VIEW_PATHS) {
    if (currentPath() === path) return view;
  }
  return null;
};

export function NavProvider({ children }) {
  const [view, setView] = useState(() => {
    try {
      const fromUrl = viewFromUrl();
      if (fromUrl) return fromUrl;
      const saved = window.history.state?.devfoodView ?? sessionStorage.getItem(VIEW_KEY);
      return saved && !VIEW_PATHS.has(saved) ? saved : "menu";
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

  useEffect(() => {
    const onPopState = (event) => setView(viewFromUrl() ?? event.state?.devfoodView ?? "menu");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const wanted = VIEW_PATHS.get(to) ?? "/";
    const currentEntry = { ...window.history.state, devfoodView: view };
    const nextEntry = { devfoodView: to };
    const url = to === "reset-password" ? wanted + window.location.search : wanted;

    if (!replace && currentPath() !== wanted) {
      window.history.replaceState(currentEntry, "");
      window.history.pushState(nextEntry, "", url);
    } else {
      window.history.replaceState({ ...currentEntry, ...nextEntry }, "", url);
    }
    setView(to);
  }, [view]);

  return (
    <NavContext.Provider value={{ view, navigate }}>
      {children}
    </NavContext.Provider>
  );
}
