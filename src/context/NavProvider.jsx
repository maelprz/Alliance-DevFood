import { useState, useEffect, useCallback } from "react";
import { NavContext } from "./NavContext";

// Valid views: 'login' | 'forgot-password' | 'reset-password' | 'menu' | 'cart' |
//              'checkout' | 'track' | 'admin-login' | 'admin'
// Exports only NavProvider component — React Compiler rule.
//
// View is persisted in sessionStorage so a page refresh keeps the user where
// they were. Cleared automatically when the tab closes (sessionStorage scope).
//
// Menu categories and the Cart page have their own addresses. Other views stay
// on "/" and are preserved in history state.
const VIEW_KEY = "devfood:view";
const VIEW_PATHS = new Map([["cart", "/cart"]]);
const currentPath = () => window.location.pathname.replace(/\/+$/, "") || "/";
const categorySlug = (category) =>
  category.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// The view and optional category the address bar asks for.
const routeFromUrl = () => {
  if (new URLSearchParams(window.location.search).has("reset_token")) {
    return { view: "reset-password", menuCategory: null };
  }
  const menuMatch = currentPath().match(/^\/menu(?:\/([a-z0-9-]+))?$/);
  if (menuMatch) {
    return { view: "menu", menuCategory: menuMatch[1] ?? null };
  }
  for (const [view, path] of VIEW_PATHS) {
    if (currentPath() === path) return { view, menuCategory: null };
  }
  return null;
};

export function NavProvider({ children }) {
  const [view, setView] = useState(() => {
    try {
      const fromUrl = routeFromUrl();
      if (fromUrl) return fromUrl.view;
      const saved = window.history.state?.devfoodView ?? sessionStorage.getItem(VIEW_KEY);
      return saved && !VIEW_PATHS.has(saved) ? saved : "menu";
    } catch {
      return "menu";
    }
  });
  const [menuCategory, setMenuCategory] = useState(() => {
    try {
      return routeFromUrl()?.menuCategory ?? null;
    } catch {
      return null;
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
    const onPopState = (event) => {
      const route = routeFromUrl();
      setView(route?.view ?? event.state?.devfoodView ?? "menu");
      setMenuCategory(route?.menuCategory ?? event.state?.devfoodCategory ?? null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to, { replace = false, category = null } = {}) => {
    const slug = category ? categorySlug(category) : null;
    const wanted = to === "menu"
      ? slug ? `/menu/${slug}` : "/menu"
      : VIEW_PATHS.get(to) ?? "/";
    const currentEntry = { ...window.history.state, devfoodView: view };
    const nextEntry = { devfoodView: to, devfoodCategory: slug };
    const url = to === "reset-password" ? wanted + window.location.search : wanted;

    if (!replace && currentPath() !== wanted) {
      window.history.replaceState(currentEntry, "");
      window.history.pushState(nextEntry, "", url);
    } else {
      window.history.replaceState({ ...currentEntry, ...nextEntry }, "", url);
    }
    setView(to);
    setMenuCategory(to === "menu" ? slug : null);
  }, [view]);

  return (
    <NavContext.Provider value={{ view, menuCategory, navigate }}>
      {children}
    </NavContext.Provider>
  );
}
