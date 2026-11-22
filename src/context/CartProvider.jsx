import { CartContext } from "./CartStateContext";
import { useApp } from "./useApp";
import { useCartSession } from "../hooks/useCartSession";

function CartSession({ children, userId }) {
  const cart = useCartSession(userId);
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function CartProvider({ children }) {
  const { user } = useApp();
  return <CartSession key={user?.id} userId={user?.id}>{children}</CartSession>;
}
