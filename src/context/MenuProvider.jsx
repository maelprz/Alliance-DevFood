import { useState, useEffect } from "react";
import menuData from "../data/menuData.json";
import { MenuContext } from "./MenuContext";

export function MenuProvider({ children }) {
  const [menuItems, setMenuItems] = useState([]);

  // Re-sync state whenever menuData changes (e.g. HMR picks up JSON update)
  useEffect(() => {
    setMenuItems(menuData.map((f) => ({ ...f })));
  }, [menuData]); // re-runs when Vite HMR reloads the JSON module

  return (
    <MenuContext.Provider value={{ menuItems, setMenuItems }}>
      {children}
    </MenuContext.Provider>
  );
}
