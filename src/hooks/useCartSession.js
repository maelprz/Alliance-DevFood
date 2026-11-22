import { useEffect, useRef, useState } from "react";
import { MAX_CART_QUANTITY } from "../constants/cart";
import { getCart, saveCart } from "../services/cartService";

const SAVE_DELAY_MS = 400;
const EMPTY_ITEMS = [];

function addItem(items, food) {
  const existing = items.find((item) => item.food_id === food.food_id);
  if (!existing) return [...items, { ...food, quantity: 1 }];
  if (existing.quantity >= MAX_CART_QUANTITY) return items;
  return items.map((item) => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
}

function flushSession(session, setItems, setError) {
  if (!session?.items || session.signal.aborted) return Promise.resolve(false);
  clearTimeout(session.timer);

  // A later save waits for the preceding write, so an older snapshot cannot win.
  session.queue = session.queue.then(async () => {
    if (session.signal.aborted) return false;
    const pending = session.pending;
    if (!pending) return true;

    try {
      const saved = await saveCart(pending, session.signal);
      if (session.signal.aborted) return false;
      if (session.pending === pending) {
        session.pending = null;
        session.items = saved;
        setItems(saved);
      }
      setError("");
      return true;
    } catch {
      if (!session.signal.aborted) setError("Could not save your cart. Please try again.");
      return false;
    }
  });
  return session.queue;
}

export function useCartSession(userId) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const sessionRef = useRef(null);
  const queuedAdds = useRef([]);

  useEffect(() => {
    if (userId == null) return;

    const controller = new AbortController();
    const session = {
      signal: controller.signal,
      items: null,
      pending: null,
      timer: null,
      queue: Promise.resolve(),
    };
    sessionRef.current = session;

    getCart(session.signal).then((loadedItems) => {
      if (session.signal.aborted) return;
      const merged = queuedAdds.current.reduce(addItem, loadedItems);
      queuedAdds.current = [];
      session.items = merged;
      setItems(merged);
      if (merged !== loadedItems) {
        session.pending = merged;
        void flushSession(session, setItems, setError);
      }
    }).catch(() => {
      if (!session.signal.aborted) setError("Could not load your cart. Please try again.");
    });

    return () => {
      clearTimeout(session.timer);
      controller.abort();
    };
  }, [userId, loadAttempt]);

  function flushCart() {
    return flushSession(sessionRef.current, setItems, setError);
  }

  function changeItems(update) {
    const session = sessionRef.current;
    if (!session?.items || session.signal.aborted) return;

    const nextItems = update(session.items);
    if (nextItems === session.items) return;
    session.items = nextItems;
    session.pending = nextItems;
    setItems(nextItems);
    clearTimeout(session.timer);
    session.timer = setTimeout(flushCart, SAVE_DELAY_MS);
  }

  function addToCart(food) {
    if (userId == null) return;
    if (!sessionRef.current?.items) {
      queuedAdds.current.push(food);
      return;
    }
    changeItems((current) => addItem(current, food));
  }

  function removeFromCart(foodId) {
    changeItems((current) => current.filter((item) => item.food_id !== foodId));
  }

  function updateQty(foodId, quantity) {
    if (quantity < 1) {
      removeFromCart(foodId);
      return;
    }
    changeItems((current) => current.map((item) => item.food_id === foodId
      ? { ...item, quantity: Math.min(quantity, MAX_CART_QUANTITY) }
      : item));
  }

  function clearCart() {
    const session = sessionRef.current;
    if (!session || session.signal.aborted) return;
    // Order placement already clears the cart in the database.
    clearTimeout(session.timer);
    session.pending = null;
    session.items = EMPTY_ITEMS;
    setItems(EMPTY_ITEMS);
    setError("");
  }

  function retryCart() {
    setError("");
    if (items === null) setLoadAttempt((attempt) => attempt + 1);
    else void flushCart();
  }

  return {
    cartItems: items ?? EMPTY_ITEMS,
    cartReady: items !== null,
    cartError: error,
    addToCart,
    removeFromCart,
    updateQty,
    flushCart,
    clearCart,
    retryCart,
  };
}
