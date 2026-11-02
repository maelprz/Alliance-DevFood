import { useContext } from "react";
import { AppContext } from "./AppContext";

// Exports only useApp hook — React Compiler rule
export function useApp() {
  return useContext(AppContext);
}
