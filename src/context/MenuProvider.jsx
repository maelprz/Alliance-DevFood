import { useState, useEffect } from "react";
import menuData from "../data/menuData.json";
import { MenuContext } from "./MenuContext";

// Loads the menu from the API so admin edits are shared; falls back to the
// bundled menuData.json (same ids as the API seed) if the server is unreachable.
export function MenuProvider({ children }) {
  const [menuItems, setMenuItems] = useState(() => menuData.map((f) => ({ ...f })));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/menu")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((items) => {
        if (!cancelled && Array.isArray(items) && items.length > 0) setMenuItems(items);
      })
      .catch(() => {
        // Keep the bundled menu.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MenuContext.Provider value={{ menuItems, setMenuItems }}>
      {children}
    </MenuContext.Provider>
  );
}
