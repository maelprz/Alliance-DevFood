import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useApp } from "./useApp";
import { authHeaders } from "../services/authService";

const CartContext = createContext();

// CartProvider: server-backed cart (cart_items table in Supabase).
// The API knows who you are from the login token, so no user_id is sent.
export function CartProvider({ children }) {
  const { user } = useApp();
  const [cartItems, setCartItems] = useState([]);
  // Blocks the save effect while the initial GET is still loading.
  const hydrating = useRef(true);

  // Load the cart whenever the logged-in user changes.
  useEffect(() => {
    hydrating.current = true;
    if (!user?.id) {
      setCartItems([]);
      hydrating.current = false;
      return;
    }
    fetch("/api/cart", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setCartItems(data.items ?? []))
      .catch(() => setCartItems([]))
      .finally(() => {
        hydrating.current = false;
      });
  }, [user?.id]);

  // Save after the user stops clicking for 400 ms, so quick clicks make one request.
  useEffect(() => {
    if (hydrating.current || !user?.id) return;
    const timer = setTimeout(() => {
      fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          items: cartItems.map((i) => ({
            food_id: i.food_id,
            quantity: i.quantity,
          })),
        }),
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
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
      value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);