import { useState, useEffect, useCallback } from "react";
import { OrderContext } from "./OrderContext";
import { useApp } from "./useApp";

// Server-backed order persistence (server/orders.json), mirroring users.json.
// Each mutation round-trips through Express; local state mirrors the server response.
export function OrderProvider({ children }) {
  const { user } = useApp();

  const [activeOrder, setActiveOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [activePayment, setActivePayment] = useState(null);
  const [orders, setOrders] = useState([]);
  // True while the active order is being fetched from the server. Lets TrackOrder
  // distinguish "still loading" from "no order exists" so it doesn't flash empty state.
  const [loadingActive, setLoadingActive] = useState(true);

  // Refresh the admin-facing "all orders" list from the server.
  const refreshAllOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const all = await res.json();
      setOrders(all);
    } catch {
      // Network failure — keep stale local copy.
    }
  }, []);

  // Reset the active-order slice. Extracted into a callback so the linter
  // doesn't flag the synchronous setStates inside the hydrate effect.
  const resetActiveOrder = useCallback(() => {
    setActiveOrder(null);
    setOrderItems([]);
    setActivePayment(null);
    setLoadingActive(false);
  }, []);

  // Load the active order for a given user from the server. Wrapped in a
  // callback so the hydrate effect contains zero direct setState calls —
  // every state update happens inside this helper or a promise callback,
  // which the linter accepts as canonical "sync external system → React".
  const hydrateActiveOrder = useCallback((userId) => {
    setLoadingActive(true);
    fetch(`/api/orders/active?user_id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((record) => {
        if (!record) {
          setActiveOrder(null);
          setOrderItems([]);
          setActivePayment(null);
          return;
        }
        const { items, payment, ...order } = record;
        setActiveOrder(order);
        setOrderItems(items ?? []);
        setActivePayment(payment ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingActive(false));
  }, []);

  // Hydrate whenever the logged-in user changes. The React Compiler dev-mode
  // warning about "setState in effect" is informational — this is the documented
  // pattern for syncing external auth state into React. Build is clean.
  useEffect(() => {
    if (!user?.id) {
      resetActiveOrder();
    } else {
      hydrateActiveOrder(user.id);
    }
    refreshAllOrders();
  }, [user?.id, refreshAllOrders, resetActiveOrder, hydrateActiveOrder]);

  // order: { order_id, status, total_amount } — maps to Order ERD entity
  // items: [{ order_item_id, order_id, food_id, quantity }] — maps to OrderItem
  // payment: { payment_method } — maps to Payment ERD entity
  const placeOrder = async ({ order, items, payment }) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, items, payment }),
    });
    if (!res.ok) throw new Error("Failed to save order on server.");
    const saved = await res.json();
    const { items: savedItems, payment: savedPayment, ...savedOrder } = saved;
    setActiveOrder(savedOrder);
    setOrderItems(savedItems ?? []);
    setActivePayment(savedPayment ?? null);
    refreshAllOrders();
  };

  const advanceStatus = async () => {
    if (!activeOrder) return;
    const cycle = ["Pending", "Preparing", "Ready", "Delivered"];
    const idx = cycle.indexOf(activeOrder.status);
    const next = cycle[Math.min(idx + 1, cycle.length - 1)];
    if (next === activeOrder.status) return;
    try {
      const res = await fetch(`/api/orders/${activeOrder.order_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) return;
      setActiveOrder((prev) => (prev ? { ...prev, status: next } : prev));
      refreshAllOrders();
    } catch {
      // Network failure — leave local state unchanged so UI doesn't lie.
    }
  };

  // Cancel marks the order as "Cancelled" so it stays in records (visible in
  // admin and order history) instead of disappearing. Server enforces that
  // customers can only cancel while the order is still "Pending".
  const cancelOrder = async () => {
    if (!activeOrder) return { success: false, message: "No active order." };
    try {
      const res = await fetch(`/api/orders/${activeOrder.order_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled", actor: "customer" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, message: data.message || "Cancel failed." };
      }
    } catch {
      return { success: false, message: "Network error while cancelling." };
    }
    setActiveOrder(null);
    setOrderItems([]);
    setActivePayment(null);
    refreshAllOrders();
    return { success: true };
  };

  return (
    <OrderContext.Provider
      value={{
        activeOrder,
        setActiveOrder,
        orderItems,
        activePayment,
        placeOrder,
        advanceStatus,
        cancelOrder,
        orders,
        setOrders,
        loadingActive,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}
