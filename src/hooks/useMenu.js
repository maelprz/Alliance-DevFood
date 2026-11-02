import { useContext } from "react";
import { MenuContext } from "../context/MenuContext";

// Custom hook to consume MenuContext
export function useMenu() {
  return useContext(MenuContext);
}
