// Order status config shared by Place Order, Track Order and the floating
// order card. Values match the ERD / server exactly — do not rename them.
export const ORDER_STATUS = {
  PENDING: "Pending",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

// Delivered and Cancelled end an order; anything else is still in progress.
export function isOrderFinished(status) {
  return status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.CANCELLED;
}

export const STATUS_CYCLE = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DELIVERED,
];

// Short labels under the step icons.
export const STEP_LABEL = {
  [ORDER_STATUS.PENDING]: "Placed",
  [ORDER_STATUS.PREPARING]: "Preparing",
  [ORDER_STATUS.READY]: "On the way",
  [ORDER_STATUS.DELIVERED]: "Delivered",
};

// Stored payment_method values (Cash on Delivery only).
export const PAYMENT_METHOD = {
  COD: "cod",
};

// Payment status from the payments table. The server sets it from the order
// status: Unpaid when placed, Paid when Delivered, Voided when Cancelled.
export const PAYMENT_STATUS = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  VOIDED: "Voided",
};

// Friendly labels for the stored payment_method values.
export const PAYMENT_LABEL = {
  [PAYMENT_METHOD.COD]: "Cash on Delivery",
};

// Friendly labels for the payment status.
export const PAYMENT_STATUS_LABEL = {
  [PAYMENT_STATUS.UNPAID]: "Unpaid (pay the rider in cash)",
  [PAYMENT_STATUS.PAID]: "Paid",
  [PAYMENT_STATUS.VOIDED]: "Voided",
};

// Order number as customers see it, e.g. 101 -> "ORD-0101". Matches the
// admin page. Display only: the API and URLs keep the plain number.
export const formatOrderId = (id) => `ORD-${String(id).padStart(4, "0")}`;

// Browser storage key for when this browser first saw an order as Ready.
export const rideStartKey = (orderId) => `devfood.ride.${orderId}`;

export function formatTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

export function formatDateTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}
