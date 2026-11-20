import { useEffect, useState } from "react";
import { authHeaders } from "../services/authService";
import { describeCoupon } from "../utils/coupon";

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "percent",
  value: "",
  maxDiscount: "",
  minOrder: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  perUserLimit: "1",
};

const STATUS_STYLE = {
  Active: { bg: "#f0fdf4", color: "#166534" },
  Scheduled: { bg: "#eff6ff", color: "#1d4ed8" },
  Expired: { bg: "#f3f4f6", color: "#6b7280" },
  Disabled: { bg: "#fff7ed", color: "#c2410c" },
  "Used up": { bg: "#fef2f2", color: "#b91c1c" },
};

// "2026-11-20" -> "Nov 20, 2026" (parsed as a plain date, so no timezone shift)
function formatDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [couponPage, setCouponPage] = useState(1);
  const [totalCouponPages, setTotalCouponPages] = useState(1);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isPercent = form.discountType === "percent";

  function show(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // Bumping this number reloads the list (after adding, enabling or deleting).
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);

  useEffect(() => {
    let ignore = false;
    fetch("/api/coupons/admin-page?page=" + couponPage, { headers: authHeaders("admin") })
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then((data) => {
        if (ignore === false) {
          setCoupons(data.items);
          setTotalCoupons(data.total);
          setTotalCouponPages(data.totalPages);
          if (data.page !== couponPage) setCouponPage(data.page);
        }
      })
      .catch(() => {
        if (ignore) return;
        setMessage({
          type: "error",
          text: "Could not load coupons. Please check your admin login.",
        });
        setTimeout(() => setMessage(null), 3000);
      });
    return () => {
      ignore = true;
    };
  }, [reload, couponPage]);

  function validate() {
    if (!form.code.trim()) return "Enter a coupon code.";
    const value = Number(form.value);
    if (!form.value || !(value > 0)) {
      return isPercent
        ? "Enter a discount percentage."
        : "Enter a discount amount in pesos.";
    }
    if (isPercent && (!Number.isInteger(value) || value > 100)) {
      return "Discount must be a whole number from 1 to 100.";
    }
    if (isPercent && form.maxDiscount !== "" && !(Number(form.maxDiscount) > 0)) {
      return "Maximum discount must be more than zero.";
    }
    if (form.minOrder !== "" && Number(form.minOrder) < 0) {
      return "Minimum order cannot be negative.";
    }
    if (!form.expiresAt) return "Choose the date the coupon expires.";
    if (form.startsAt && form.startsAt > form.expiresAt) {
      return "The start date must be on or before the expiry date.";
    }
    for (const [label, v] of [
      ["Usage limit", form.usageLimit],
      ["Per-customer limit", form.perUserLimit],
    ]) {
      if (v !== "" && (!Number.isInteger(Number(v)) || Number(v) < 1)) {
        return `${label} must be a whole number of at least 1, or left blank.`;
      }
    }
    return null;
  }

  async function addCoupon() {
    const problem = validate();
    if (problem) {
      show("error", problem);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders("admin") },
        body: JSON.stringify({
          code: form.code.trim(),
          description: form.description.trim() || null,
          discountType: form.discountType,
          discountPercent: isPercent ? Number(form.value) : null,
          fixedAmount: isPercent ? null : Number(form.value),
          maxDiscount:
            isPercent && form.maxDiscount !== "" ? Number(form.maxDiscount) : null,
          minOrder: form.minOrder === "" ? 0 : Number(form.minOrder),
          startsAt: form.startsAt || null,
          expiresAt: form.expiresAt,
          usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
          perUserLimit: form.perUserLimit === "" ? null : Number(form.perUserLimit),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        show("error", data.message || "Failed to add coupon. Please check the details.");
        return;
      }
      setForm(EMPTY_FORM);
      setCouponPage(1);
      refresh();
      show("ok", `Coupon ${data.code} added.`);
    } catch {
      show("error", "Server error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon) {
    try {
      const res = await fetch(`/api/coupons/${encodeURIComponent(coupon.code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders("admin") },
        body: JSON.stringify({ isDisabled: !coupon.isDisabled }),
      });
      if (!res.ok) {
        show("error", "Failed to update coupon.");
        return;
      }
      refresh();
    } catch {
      show("error", "Server error. Please try again.");
    }
  }

  async function deleteCoupon() {
    if (couponToDelete === null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/coupons/${encodeURIComponent(couponToDelete)}`, {
        method: "DELETE",
        headers: authHeaders("admin"),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok === false) {
        setCouponToDelete(null);
        show("error", data.message || "Failed to delete coupon. Please try again.");
        return;
      }
      setCouponToDelete(null);
      refresh();
      show("ok", "Coupon deleted.");
    } catch {
      setCouponToDelete(null);
      show("error", "Server error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  };
  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    marginBottom: 4,
  };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Manila" });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: "#111827" }}>
        Manage Coupons
      </h1>

      {message && (
        <div
          style={{
            background: message.type === "ok" ? "#f0fdf4" : "#fef2f2",
            color: message.type === "ok" ? "#166534" : "#dc2626",
            padding: "12px 16px",
            border: `1px solid ${message.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {message.text}
        </div>
      )}

      {/* ADD COUPON FORM */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Code</label>
            <input
              placeholder="e.g. WELCOME20"
              value={form.code}
              onChange={set("code")}
              maxLength={20}
              style={{ ...inputStyle, textTransform: "uppercase" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Discount type</label>
            <select
              value={form.discountType}
              onChange={set("discountType")}
              style={inputStyle}
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (₱)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>{isPercent ? "Discount (%)" : "Discount amount (₱)"}</label>
            <input
              type="number"
              min={isPercent ? "1" : "0.01"}
              max={isPercent ? 100 : undefined}
              step={isPercent ? "1" : "0.01"}
              placeholder={isPercent ? "e.g. 20" : "e.g. 50"}
              value={form.value}
              onChange={set("value")}
              style={inputStyle}
            />
          </div>

          {isPercent && (
            <div>
              <label style={labelStyle}>Max discount (₱, optional)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="No cap"
                value={form.maxDiscount}
                onChange={set("maxDiscount")}
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Minimum order (₱)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.minOrder}
              onChange={set("minOrder")}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Valid from (optional)</label>
            <input
              type="date"
              value={form.startsAt}
              onChange={set("startsAt")}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Valid until</label>
            <input
              type="date"
              min={today}
              value={form.expiresAt}
              onChange={set("expiresAt")}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Total uses (blank = unlimited)</label>
            <input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={form.usageLimit}
              onChange={set("usageLimit")}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Uses per customer (blank = unlimited)</label>
            <input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={form.perUserLimit}
              onChange={set("perUserLimit")}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Description (optional)</label>
          <input
            placeholder="e.g. Welcome offer for new customers"
            value={form.description}
            onChange={set("description")}
            maxLength={120}
            style={inputStyle}
          />
        </div>

        <button
          onClick={addCoupon}
          disabled={saving}
          style={{
            marginTop: 16,
            padding: "10px 18px",
            background: "#FF5A36",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
            fontFamily: "inherit",
          }}
        >
          {saving ? "Adding..." : "Add Coupon"}
        </button>
      </div>

      {/* COUPON TABLE */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fdf6ef", borderBottom: "1px solid #e5e7eb" }}>
              {["Code", "Discount", "Min Order", "Valid", "Used", "Status", "Action"].map(
                (head) => (
                  <th
                    key={head}
                    style={{
                      padding: "14px 20px",
                      textAlign: "left",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {head}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {coupons.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 14 }}
                >
                  No coupons yet.
                </td>
              </tr>
            )}
            {coupons.map((coupon) => {
              const style = STATUS_STYLE[coupon.status] || STATUS_STYLE.Expired;
              return (
                <tr key={coupon.code} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontWeight: 600 }}>{coupon.code}</div>
                    {coupon.description && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {coupon.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "16px 20px" }}>{describeCoupon(coupon)}</td>
                  <td style={{ padding: "16px 20px" }}>₱{Number(coupon.minOrder).toFixed(2)}</td>
                  <td style={{ padding: "16px 20px", whiteSpace: "nowrap", fontSize: 13 }}>
                    {coupon.startsAt ? `${formatDate(coupon.startsAt)} - ` : "Until "}
                    {formatDate(coupon.expiresAt)}
                  </td>
                  <td style={{ padding: "16px 20px", whiteSpace: "nowrap", fontSize: 13 }}>
                    {coupon.timesUsed}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                    {coupon.perUserLimit ? (
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {coupon.perUserLimit} per customer
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span
                      style={{
                        background: style.bg,
                        color: style.color,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {coupon.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => toggleCoupon(coupon)}
                      style={{
                        padding: "8px 14px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        background: "#fff",
                        color: "#374151",
                        cursor: "pointer",
                        fontWeight: 500,
                        marginRight: 8,
                        fontFamily: "inherit",
                      }}
                    >
                      {coupon.isDisabled ? "Enable" : "Disable"}
                    </button>
                    <button
                      onClick={() => setCouponToDelete(coupon.code)}
                      style={{
                        padding: "8px 14px",
                        border: "1px solid #fecaca",
                        borderRadius: 6,
                        background: "#fef2f2",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontFamily: "inherit",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalCoupons > 0 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, padding: 16 }}>
            <button type="button" onClick={() => setCouponPage(couponPage - 1)} disabled={couponPage === 1}>
              Previous
            </button>
            <span>Page {couponPage} of {totalCouponPages}</span>
            <button type="button" onClick={() => setCouponPage(couponPage + 1)} disabled={couponPage >= totalCouponPages}>
              Next
            </button>
          </div>
        )}
      </div>

      {couponToDelete !== null && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-coupon-title" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 14, width: "min(400px, 90vw)" }}>
            <h2 id="delete-coupon-title" style={{ fontSize: 18, margin: "0 0 12px" }}>Delete coupon?</h2>
            <p>Delete <strong>{couponToDelete}</strong>? Customers will no longer be able to use it.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button type="button" onClick={() => setCouponToDelete(null)} disabled={deleting} style={{
                padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8,
                background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
              <button type="button" onClick={deleteCoupon} disabled={deleting} style={{
                padding: "10px 18px", border: "1px solid #dc2626", borderRadius: 8,
                background: "#dc2626", color: "#fff", fontWeight: 600, cursor: "pointer",
              }}>
                {deleting && "Deleting..."}
                {deleting === false && "Delete coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
