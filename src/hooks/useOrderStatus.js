import { useEffect } from "react";
import { useOrder } from "../context/useOrder";
import { useNav } from "../context/useNav";
import { fetchOrder } from "../services/orderService";

const POLL_MS = 1000;

// Polls the active order every second so Track Order follows the status the
// admin sets. Stops once the order is Delivered or Cancelled (final states).
// If the order no longer exists on the server, it sends the customer to the menu.
export function useOrderStatus() {
  const { activeOrder, setActiveOrder, setActivePayment } = useOrder();
  const { navigate } = useNav();

  const orderId = activeOrder?.order_id;
  const isFinal =
    activeOrder?.status === "Delivered" || activeOrder?.status === "Cancelled";

  useEffect(() => {
    if (!orderId || isFinal) return;

    const interval = setInterval(async () => {
      try {
        const updated = await fetchOrder(orderId);
        if (!updated) return;
        if (updated.notFound) {
          navigate("menu");
          return;
        }
        setActiveOrder((prev) => ({ ...prev, status: updated.status || "Pending" }));
        if (updated.payment) setActivePayment(updated.payment);
      } catch (err) {
        console.error("Error fetching order status:", err);
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [orderId, isFinal, navigate, setActiveOrder, setActivePayment]);
}
