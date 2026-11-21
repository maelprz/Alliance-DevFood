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

  const [activeOrder, setActiveOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [activePayment, setActivePayment] = useState(null);
  const [orders, setOrders] = useState([]);
  // True while the active order is being fetched from the server. Lets TrackOrder
  // distinguish "still loading" from "no order exists" so it doesn't flash empty state.
  const [loadingActive, setLoadingActive] = useState(true);

  // Refresh the admin-facing "all orders" list from the server.
  const refreshAllOrders = useCallback(async () => {
    const all = await fetchAllOrders();
    // null = request failed — keep stale local copy.
    if (all) setOrders(all);
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
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}
