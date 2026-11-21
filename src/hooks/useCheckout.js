import { useState, useEffect } from "react";
import { useOrder } from "../context/useOrder";
import { useNav } from "../context/useNav";
import { useApp } from "../context/useApp";
import { useCart } from "../context/CartContext";
import { MAX_DELIVERY_KM } from "../constants/delivery";
import { formatDeliveryAddress } from "../utils/geo";
import {
  calcDiscount,
  readStoredCoupon,
  clearStoredCoupon,
} from "../utils/coupon";

export const DELIVERY_FEE = 49.0;

// Checkout logic: cart totals, coupon, map-pin validation and placing the
// order (Cash on Delivery only). Checkout.jsx only renders what this returns.
export function useCheckout() {
  const { placeOrder } = useOrder();
  const { navigate } = useNav();
  const { user } = useApp();
  const { cartItems, clearCart } = useCart();

  // Redirect to the menu if not logged in
  useEffect(() => {
    if (!user) {
      navigate("menu");
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [savedCoupon, setSavedCoupon] = useState(() => readStoredCoupon(user?.id));
  // Delivery location from the map picker (null until a pin resolves).
  const [location, setLocation] = useState(null);

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
  const total_amount = subtotal - discountAmount + DELIVERY_FEE;

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

  // "Place Order" click: show the confirm step only if the pin is valid.
  const requestConfirm = () => {
    if (validate()) setShowConfirm(true);
  };

  const dismissConfirm = () => setShowConfirm(false);

  // "Yes, Place Order"
  const confirmOrder = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError(null);
    try {
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
      const payment = { payment_method: "cod" }; // Cash on Delivery only

      await placeOrder({ order, items, payment });

      clearStoredCoupon();
      clearCart();
      setPlaced(true);
      setTimeout(() => navigate("track"), 700);
    } catch (err) {
      // A coupon the server rejects (used up, expired, ...) is dropped so the
      // customer can try again without it.
      if (/coupon/i.test(err.message || "")) {
        clearStoredCoupon();
        setSavedCoupon(null);
      }
      setError(err.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    navigate,
    lineItems,
    subtotal,
    deliveryFee: DELIVERY_FEE,
    appliedCoupon,
    discountAmount,
    total_amount,
    savedAddress,
    fieldErrors,
    error,
    loading,
    placed,
    showConfirm,
    changeLocation,
    requestConfirm,
    dismissConfirm,
    confirmOrder,
  };
}
