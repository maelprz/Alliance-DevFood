import { useContext } from "react";
import { NavContext } from "./NavContext";

// Exports only useNav hook — React Compiler rule
export function useNav() {
  return useContext(NavContext);
}
