import { useContext } from "react";
import { OrderContext } from "./OrderContext";

// This file exports only a hook, satisfying the React Compiler rule.
export function useOrder() {
  return useContext(OrderContext);
}
