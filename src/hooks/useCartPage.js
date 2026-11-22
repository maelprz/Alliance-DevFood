import { useEffect, useRef, useState } from "react";
import { DELIVERY_FEE } from "../constants/delivery";
import { VIEW } from "../constants/views";
import { useApp } from "../context/useApp";
import { useCart } from "../context/useCart";
import { useNav } from "../context/useNav";
import { previewCoupon } from "../services/cartService";
import { calcDiscount, clearStoredCoupon, readStoredCoupon, storeCoupon } from "../utils/coupon";

export function useCartPage() {
  const { navigate } = useNav();
  const cart = useCart();
  const { user } = useApp();
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(() => readStoredCoupon(user?.id));
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const couponRequest = useRef(null);
  const checkoutRequest = useRef(null);

  useEffect(() => {
    if (!user) navigate(VIEW.LOGIN, { replace: true });
  }, [user, navigate]);

  useEffect(() => () => {
    couponRequest.current?.abort();
    checkoutRequest.current?.abort();
  }, []);

  const subtotal = Number(
    cart.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
  );
  const couponBelowMin = Boolean(appliedCoupon && subtotal < (appliedCoupon.minOrder ?? 0));
  const activeCoupon = couponBelowMin ? null : appliedCoupon;
  const discountAmount = calcDiscount(activeCoupon, subtotal);
  const total = subtotal - discountAmount + (cart.cartItems.length ? DELIVERY_FEE.BASE : 0);

  async function handleApplyCoupon() {
    if (!user || couponRequest.current) return;
    if (!couponCode.trim()) {
      setCouponMessage("Enter a coupon code.");
      return;
    }

    const controller = new AbortController();
    couponRequest.current = controller;
    setApplyingCoupon(true);
    setCouponMessage("");
    try {
      const { code, description, discountType, discountPercent, fixedAmount, maxDiscount, minOrder } =
        await previewCoupon(couponCode, subtotal, controller.signal);
      if (controller.signal.aborted) return;
      const coupon = { code, description, discountType, discountPercent, fixedAmount, maxDiscount, minOrder, userId: user.id };
      storeCoupon(coupon);
      setAppliedCoupon(coupon);
      setCouponCode("");
    } catch (error) {
      if (!controller.signal.aborted) setCouponMessage(error.message || "Could not apply this coupon.");
    } finally {
      couponRequest.current = null;
      if (!controller.signal.aborted) setApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    clearStoredCoupon();
    setAppliedCoupon(null);
    setCouponMessage("");
  }

  async function goToCheckout() {
    if (checkoutRequest.current) return;
    const controller = new AbortController();
    checkoutRequest.current = controller;
    setOpeningCheckout(true);
    const saved = await cart.flushCart();
    checkoutRequest.current = null;
    if (controller.signal.aborted) return;
    if (saved) navigate(VIEW.CHECKOUT);
    else setOpeningCheckout(false);
  }

  return {
    ...cart, navigate, subtotal, total, couponCode, setCouponCode, couponMessage,
    activeCoupon, appliedCoupon, couponBelowMin, discountAmount, applyingCoupon, handleApplyCoupon, removeCoupon,
    goToCheckout, openingCheckout,
  };
}
