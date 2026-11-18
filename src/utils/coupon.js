// Coupon helpers shared by the Cart and Checkout pages.
//
// The server is the source of truth: it checks the coupon again and works out the
// discount when the order is placed. These helpers only keep the two screens in sync.

const STORAGE_KEY = "appliedCoupon";

// Round to centavos, half up. Going through a string avoids float noise like 10.344999.
function toPesos(n) {
  return Number(Math.round(Number(n.toFixed(8) + "e2")) + "e-2");
}

// Same rule as CouponRules.Discount on the server.
export function calcDiscount(coupon, subtotal) {
  if (!coupon || !(subtotal > 0)) return 0;
  let raw;
  if (coupon.discountType === "fixed") {
    raw = Number(coupon.fixedAmount) || 0;
  } else {
    raw = (subtotal * (Number(coupon.discountPercent) || 0)) / 100;
    if (coupon.maxDiscount > 0) raw = Math.min(raw, Number(coupon.maxDiscount));
  }
  return toPesos(Math.min(raw, subtotal));
}

// "20% off (up to ₱100.00)" or "₱50.00 off"
export function describeCoupon(coupon) {
  if (!coupon) return "";
  if (coupon.discountType === "fixed") {
    return `₱${Number(coupon.fixedAmount).toFixed(2)} off`;
  }
  const cap =
    coupon.maxDiscount > 0
      ? ` (up to ₱${Number(coupon.maxDiscount).toFixed(2)})`
      : "";
  return `${coupon.discountPercent}% off${cap}`;
}

// The coupon the customer applied in the cart, kept so it survives a page reload.
// It belongs to one user, so another account never inherits it.
export function readStoredCoupon(userId) {
  if (userId == null) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved && saved.userId === userId ? saved : null;
  } catch {
    return null;
  }
}

export function storeCoupon(coupon) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupon));
}

export function clearStoredCoupon() {
  localStorage.removeItem(STORAGE_KEY);
}
