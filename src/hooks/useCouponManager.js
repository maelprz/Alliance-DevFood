import { useEffect, useRef, useState } from "react";
import { DISCOUNT_TYPE } from "../constants/coupon";
import { createCoupon, listCoupons, removeCoupon, updateCoupon } from "../services/couponService";

const FIRST_PAGE = 1;
const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: DISCOUNT_TYPE.PERCENT,
  value: "",
  maxDiscount: "",
  minOrder: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  perUserLimit: "1",
};
const EMPTY_PAGE = { items: [], page: FIRST_PAGE, totalPages: FIRST_PAGE, total: 0 };
const ACTION = { CREATE: "create", TOGGLE: "toggle", DELETE: "delete" };

function couponPayload(form) {
  const isPercent = form.discountType === DISCOUNT_TYPE.PERCENT;
  return {
    code: form.code.trim(),
    description: form.description.trim() || null,
    discountType: form.discountType,
    discountPercent: isPercent ? Number(form.value) : null,
    fixedAmount: isPercent ? null : Number(form.value),
    maxDiscount: isPercent && form.maxDiscount !== "" ? Number(form.maxDiscount) : null,
    minOrder: Number(form.minOrder),
    startsAt: form.startsAt || null,
    expiresAt: form.expiresAt,
    usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
    perUserLimit: form.perUserLimit === "" ? null : Number(form.perUserLimit),
  };
}

function validate(form) {
  const isPercent = form.discountType === DISCOUNT_TYPE.PERCENT;
  const value = Number(form.value);
  if (!form.code.trim()) return "Enter a coupon code.";
  if (!(value > 0)) return isPercent ? "Enter a discount percentage." : "Enter a discount amount in pesos.";
  if (isPercent && (!Number.isInteger(value) || value > 100))
    return "Discount must be a whole number from 1 to 100.";
  if (isPercent && form.maxDiscount !== "" && !(Number(form.maxDiscount) > 0))
    return "Maximum discount must be more than zero.";
  if (Number(form.minOrder) < 0) return "Minimum order cannot be negative.";
  if (!form.expiresAt) return "Choose the date the coupon expires.";
  if (form.startsAt && form.startsAt > form.expiresAt)
    return "The start date must be on or before the expiry date.";
  for (const [label, value] of [["Usage limit", form.usageLimit], ["Per-customer limit", form.perUserLimit]]) {
    if (value !== "" && (!Number.isInteger(Number(value)) || Number(value) < 1))
      return `${label} must be a whole number of at least 1, or left blank.`;
  }
  return null;
}

export function useCouponManager() {
  const [requestedPage, setRequestedPage] = useState(FIRST_PAGE);
  const [result, setResult] = useState(null);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [action, setAction] = useState(null);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [message, setMessage] = useState(null);
  const mutation = useRef(false);
  const currentResult = result?.requestedPage === requestedPage && result.reload === reload ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    listCoupons(requestedPage, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ requestedPage, reload, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ requestedPage, reload, error: error.message });
      });
    return () => controller.abort();
  }, [requestedPage, reload]);

  function refresh() {
    setReload((value) => value + 1);
  }

  async function mutate(nextAction, save) {
    if (mutation.current) return;
    mutation.current = true;
    setAction(nextAction);
    setMessage(null);
    try {
      await save();
      refresh();
    } catch (error) {
      setMessage({ error: true, text: error.message });
    } finally {
      mutation.current = false;
      setAction(null);
    }
  }

  function addCoupon() {
    const problem = validate(form);
    if (problem) {
      setMessage({ error: true, text: problem });
      return;
    }
    return mutate(ACTION.CREATE, async () => {
      const coupon = await createCoupon(couponPayload(form));
      setForm(EMPTY_FORM);
      setRequestedPage(FIRST_PAGE);
      setMessage({ text: `Coupon ${coupon.code} added.` });
    });
  }

  function toggleCoupon(coupon) {
    return mutate(ACTION.TOGGLE, () => updateCoupon(coupon.code, !coupon.isDisabled));
  }

  function deleteCoupon() {
    if (couponToDelete === null) return;
    return mutate(ACTION.DELETE, async () => {
      await removeCoupon(couponToDelete);
      setCouponToDelete(null);
      setMessage({ text: "Coupon deleted." });
    });
  }

  function selectCouponToDelete(code) {
    setMessage(null);
    setCouponToDelete(code);
  }

  return {
    ...((currentResult?.data ?? result?.data) || EMPTY_PAGE),
    loading: !currentResult,
    listError: currentResult?.error,
    refresh,
    setCouponPage: setRequestedPage,
    message,
    form,
    setField: (field, value) => setForm((previous) => ({ ...previous, [field]: value })),
    isPercent: form.discountType === DISCOUNT_TYPE.PERCENT,
    busy: action !== null,
    saving: action === ACTION.CREATE,
    deleting: action === ACTION.DELETE,
    couponToDelete,
    selectCouponToDelete,
    addCoupon,
    toggleCoupon,
    deleteCoupon,
  };
}
