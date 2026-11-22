import { useContext } from "react";
import { CartContext } from "./CartStateContext";

export function useCart() {
  return useContext(CartContext);
}
