import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useApp } from "./useApp";

const CartContext = createContext();

// CartProvider — server-backed cart persistence (server/cart.json).
// Mirrors the auth pattern: GET on user change, PUT whenever the cart mutates.
export function CartProvider({ children }) {
  const { user } = useApp();
  const [cartItems, setCartItems] = useState([]);
  // hydrating ref blocks the sync effect from firing during the initial GET,
  // which would otherwise overwrite the freshly-fetched cart with [].
  const hydrating = useRef(true);

  // Hydrate from server whenever the logged-in user changes.
  useEffect(() => {
    hydrating.current = true;
    if (!user?.id) {
      setCartItems([]);
      hydrating.current = false;
      return;
    }
    fetch(`/api/cart?user_id=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => setCartItems(data.items ?? []))
      .catch(() => setCartItems([]))
      .finally(() => {
        hydrating.current = false;
      });
  }, [user?.id]);

  // Sync local state → server on every mutation (skipped during hydration).
  useEffect(() => {
    if (hydrating.current || !user?.id) return;
    fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, items: cartItems }),
    }).catch(() => {});
  }, [cartItems, user?.id]);

  const addToCart = (food) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.food_id === food.food_id);
      if (existing) {
        return prev.map((i) =>
          i.food_id === food.food_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...food, quantity: 1 }];
    });
  };

  const removeFromCart = (food_id) => {
    setCartItems((prev) => prev.filter((i) => i.food_id !== food_id));
  };

  const updateQty = (food_id, qty) => {
    if (qty < 1) {
      removeFromCart(food_id);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.food_id === food_id ? { ...i, quantity: qty } : i))
    );
  };

  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
