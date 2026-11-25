import { useState, useEffect, useRef } from "react";
import { useOrder } from "../context/useOrder";
import { useNav } from "../context/useNav";
import { useApp } from "../context/useApp";
import { useCart } from "../context/CartContext";
import { MAX_DELIVERY_KM, DELIVERY_FEE, deliveryFeeFor } from "../constants/delivery";
import { formatDeliveryAddress } from "../utils/geo";
import {
  calcDiscount,
  readStoredCoupon,
  clearStoredCoupon,
} from "../utils/coupon";
import { isOrderFinished, PAYMENT_METHOD } from "../constants/orderStatus";
import { VIEW } from "../constants/views";


// Checkout logic: cart totals, coupon, map-pin validation and placing the
// order (Cash on Delivery only). Checkout.jsx only renders what this returns.
export function useCheckout() {
  const { placeOrder, activeOrder, refreshActiveOrder } = useOrder();
  const { navigate } = useNav();
  const { user } = useApp();
  // cartReady is false until the cart has loaded from the server (e.g. right
  // after a refresh). Until then an empty list means "not loaded yet", not
  // "empty", so Checkout must wait before showing the empty-cart message.
  const { cartItems, cartReady, cartError, retryCart, clearCart } = useCart();

  // Redirect to the menu if not logged in
  useEffect(() => {
    if (!user) {
      navigate(VIEW.MENU);
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [savedCoupon, setSavedCoupon] = useState(() => readStoredCoupon(user?.id));
  // Delivery location from the map picker (null until a pin resolves).
  const [location, setLocation] = useState(null);
  // Blocks a fast double-click from sending two orders before `loading` renders.
  const placingRef = useRef(false);

  // Saved profile address is only used to pre-place the pin.
  // Prefer the structured fields; fall back to the legacy `address` string.
  const savedStreet = user?.addressStreet?.trim() ?? "";
  const savedCity = user?.addressCity?.trim() ?? "";
  const savedZip = user?.addressZip?.trim() ?? "";
  const savedAddress =
    savedStreet && savedCity
      ? [savedStreet, `${savedCity} ${savedZip}`.trim()].join(", ")
      : user?.address?.trim() ?? "";

  // CartContext spreads food data directly into each item — no separate lookup needed
  const lineItems = cartItems.map((ci) => ({
    ...ci,
    food: ci,
    subtotal: ci.price * ci.quantity,
  }));

  const subtotal = Number(lineItems.reduce((sum, li) => sum + li.subtotal, 0).toFixed(2));

  // Coupon applied in the Cart. It only counts while the cart still meets its
  // minimum order; the server checks it again when the order is placed.
  const appliedCoupon =
    savedCoupon && savedCoupon.userId === user?.id && subtotal >= (savedCoupon.minOrder ?? 0)
      ? savedCoupon
      : null;

  const discountAmount = calcDiscount(appliedCoupon, subtotal);

  // Final total after discount + delivery fee
  // Delivery fee follows the pin's distance (same rule the server charges).
  // Before a valid pin there's no fee yet: show "from ₱39" and a "from" total.
  const deliveryFee = location?.inZone ? deliveryFeeFor(location.distanceKm) : null;
  const feeIsEstimate = deliveryFee === null;
  const total_amount = subtotal - discountAmount + (deliveryFee ?? DELIVERY_FEE.BASE);

  // One order at a time: Track Order follows a single order, so a second one
  // would hide the first. Block checkout until the current order is finished.
  // (`placed` = the order this page just placed, which is about to open Track Order.)
  const orderInProgress =
    !placed && activeOrder && !isOrderFinished(activeOrder.status)
      ? activeOrder
      : null;

  // The map pin decides whether we can deliver (Grab-style zone check).
  const validate = () => {
    const errors = {};
    if (!location) {
      errors.address = "Drop your pin on the map so the rider can find you.";
    } else if (!location.inZone) {
      errors.address = `This spot is ${location.distanceKm.toFixed(1)} km away. We only deliver within ${MAX_DELIVERY_KM} km.`;
    } else if (!formatDeliveryAddress(location)) {
      errors.address = "We couldn't read an address at this spot. Move the pin slightly.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // New pin from AddressPicker — clears the old address error.
  const changeLocation = (loc) => {
    setLocation(loc);
    setFieldErrors((prev) => ({ ...prev, address: undefined }));
  };

  // "Place Order" click: places the order right away once the pin is valid
  // (no extra "Yes, Place Order" step).
  const placeOrderNow = async () => {
    if (orderInProgress || placingRef.current) return;
    if (!validate()) return;
    placingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // Re-check with the server: another tab may have placed an order since
      // this page loaded. If so, the "order in progress" notice takes over.
      const current = await refreshActiveOrder();
      if (current && !isOrderFinished(current.status)) return;

      // The server trusts only these fields; ids, prices and totals are
      // recomputed there from the menu and coupon tables.
      const order = {
        user_id: user.id,
        coupon_code: appliedCoupon?.code || null,
        delivery_address: formatDeliveryAddress(location),
        // Map pin — the API re-checks the delivery zone with these.
        delivery_lat: location.lat,
        delivery_lng: location.lng,
      };
      const items = cartItems.map((ci) => ({
        food_id: ci.food_id,
        quantity: ci.quantity,
      }));
      const payment = { payment_method: PAYMENT_METHOD.COD }; // Cash on Delivery only

      await placeOrder({ order, items, payment });

      clearStoredCoupon();
      clearCart();
      setPlaced(true);
      setTimeout(() => navigate(VIEW.TRACK), 700);
    } catch (err) {
      // A coupon the server rejects (used up, expired, ...) is dropped so the
      // customer can try again without it.
      if (/coupon/i.test(err.message || "")) {
        clearStoredCoupon();
        setSavedCoupon(null);
      }
      // The server refuses a second order in progress — show the notice instead.
      if (/order in progress/i.test(err.message || "")) {
        await refreshActiveOrder();
        return;
      }
      setError(err.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
      placingRef.current = false;
    }
  };

  return {
    navigate,
    cartReady,
    cartError,
    retryCart,
    lineItems,
    subtotal,
    deliveryFee: deliveryFee ?? DELIVERY_FEE.BASE,
    deliveryKm: feeIsEstimate ? null : location.distanceKm,
    feeIsEstimate,
    appliedCoupon,
    discountAmount,
    total_amount,
    savedAddress,
    orderInProgress,
    fieldErrors,
    error,
    loading,
    placed,
    changeLocation,
    placeOrderNow,
  };
}
