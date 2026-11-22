import { useState, useEffect, useCallback } from "react";
import { OrderContext } from "./OrderContext";
import { useApp } from "./useApp";
import {
  fetchAllOrders,
  fetchActiveOrder,
  createOrder,
  cancelOrderRequest,
  splitOrderRecord,
} from "../services/orderService";

// Holds the customer's active order. All /api/orders calls go through
// services/orderService.js; local state mirrors the server response.
export function OrderProvider({ children }) {
  const { user } = useApp();
  const userId = user?.id;

  const [activeOrder, setActiveOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [activePayment, setActivePayment] = useState(null);
  const [orders, setOrders] = useState([]);
  // True while the active order is being fetched from the server. Lets TrackOrder
  // distinguish "still loading" from "no order exists" so it doesn't flash empty state.
  const [loadingActive, setLoadingActive] = useState(Boolean(userId));
  // Which user the order state above belongs to.
  const [stateUserId, setStateUserId] = useState(userId);

  // When the user changes (login, logout, switching accounts), adjust the
  // order state right away, during render — React's recommended way to react
  // to a changed value, instead of calling setState inside an effect.
  //   logout -> drop the previous user's order
  //   login  -> mark the order as loading; the effect below fetches it
  if (stateUserId !== userId) {
    setStateUserId(userId);
    if (userId) {
      setLoadingActive(true);
    } else {
      setActiveOrder(null);
      setOrderItems([]);
      setActivePayment(null);
      setLoadingActive(false);
    }
  }

  // Refresh the admin-facing "all orders" list from the server.
  // Returns the promise so callers can wait; state is only set in the callback.
  const refreshAllOrders = useCallback(
    () =>
      fetchAllOrders().then((all) => {
        // null = request failed — keep stale local copy.
        if (all) setOrders(all);
      }),
    [],
  );

  // Load the active order for a given user from the server. Every state
  // update happens in the promise callbacks (the loading flag is already set
  // during render above), so the effect itself never calls setState.
  const hydrateActiveOrder = useCallback((userId) => {
    fetchActiveOrder(userId)
      .then((record) => {
        if (!record) {
          setActiveOrder(null);
          setOrderItems([]);
          setActivePayment(null);
          return;
        }
        const { order, items, payment } = splitOrderRecord(record);
        setActiveOrder(order);
        setOrderItems(items);
        setActivePayment(payment);
      })
      .catch(() => {})
      .finally(() => setLoadingActive(false));
  }, []);

  // Load the logged-in user's order in progress from the server whenever the
  // user changes (logout is handled above, during render).
  useEffect(() => {
    if (userId) hydrateActiveOrder(userId);
    refreshAllOrders();
  }, [userId, refreshAllOrders, hydrateActiveOrder]);

  // Quietly re-read the account's order in progress (no loading skeleton).
  // Used when a tab comes back into view and right before placing an order,
  // so a tab opened earlier learns about an order placed in another tab.
  // Only adopts an order the server reports; returns it (or null).
  const refreshActiveOrder = useCallback(async () => {
    if (!userId) return null;
    try {
      const record = await fetchActiveOrder(userId);
      if (!record) return null;
      const { order, items, payment } = splitOrderRecord(record);
      setActiveOrder(order);
      setOrderItems(items);
      setActivePayment(payment);
      return order;
    } catch {
      return null; // Network failure — the server check on placing still applies.
    }
  }, [userId]);

  // Another tab may have placed an order while this one was in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshActiveOrder();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshActiveOrder]);

  // order: { order_id, status, total_amount } — maps to Order ERD entity
  // items: [{ order_item_id, order_id, food_id, quantity }] — maps to OrderItem
  // payment: { payment_method: "cod" } — the server creates the Payment row (status Unpaid)
  const placeOrder = async ({ order, items, payment }) => {
    // Throws with the server's reason (item sold out, invalid coupon, ...).
    const saved = await createOrder({ order, items, payment });
    const { order: savedOrder, items: savedItems, payment: savedPayment } =
      splitOrderRecord(saved);
    setActiveOrder(savedOrder);
    setOrderItems(savedItems);
    setActivePayment(savedPayment);
    refreshAllOrders();
  };

  // Cancel marks the order as "Cancelled" so it stays in records (visible in
  // admin and order history) instead of disappearing. Server enforces that
  // customers can only cancel while the order is still "Pending".
  const cancelOrder = async () => {
    if (!activeOrder) return { success: false, message: "No active order." };
    const result = await cancelOrderRequest(activeOrder.order_id);
    if (!result.success) return result;
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
        setActivePayment,
        placeOrder,
        cancelOrder,
        orders,
        setOrders,
        loadingActive,
        refreshActiveOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}
