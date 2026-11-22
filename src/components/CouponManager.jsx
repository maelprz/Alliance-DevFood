import { COUPON_STATUS, DISCOUNT_TYPE } from "../constants/coupon";
import { useCouponManager } from "../hooks/useCouponManager";
import { describeCoupon } from "../utils/coupon";

const STATUS_STYLE = {
  [COUPON_STATUS.ACTIVE]: { bg: "#f0fdf4", color: "#166534" },
  [COUPON_STATUS.SCHEDULED]: { bg: "#eff6ff", color: "#1d4ed8" },
  [COUPON_STATUS.EXPIRED]: { bg: "#f3f4f6", color: "#6b7280" },
  [COUPON_STATUS.DISABLED]: { bg: "#fff7ed", color: "#c2410c" },
  [COUPON_STATUS.USED_UP]: { bg: "#fef2f2", color: "#b91c1c" },
};

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CouponManager() {
  const {
    items: coupons, page: couponPage, totalPages: totalCouponPages, total: totalCoupons,
    loading, listError, refresh, setCouponPage, message, form, setField, isPercent, busy,
    saving, deleting, couponToDelete, selectCouponToDelete, addCoupon, toggleCoupon, deleteCoupon,
  } = useCouponManager();

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    fontFamily: "inherit",
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
  const set = (key) => (e) => setField(key, e.target.value);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Manila" });

  return (
    <div className="coupon-feature">
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: "#111827" }}>
        Manage Coupons
      </h1>

      {message && couponToDelete === null && (
        <div
          role={message.error ? "alert" : "status"}
          style={{
            background: !message.error ? "#f0fdf4" : "#fef2f2",
            color: !message.error ? "#166534" : "#dc2626",
            padding: "12px 16px",
            border: `1px solid ${!message.error ? "#bbf7d0" : "#fecaca"}`,
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
              <option value={DISCOUNT_TYPE.PERCENT}>Percentage (%)</option>
              <option value={DISCOUNT_TYPE.FIXED}>Fixed amount (₱)</option>
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
          type="button"
          onClick={addCoupon}
          disabled={busy}
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
        <table aria-busy={loading} style={{ width: "100%", borderCollapse: "collapse" }}>
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
            {(loading || listError || coupons.length === 0) && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 14 }}
                >
                  {loading && <span role="status">Loading coupons…</span>}
                  {listError && (
                    <div className="feature-status" role="alert">
                      <span>{listError}</span>
                      <button type="button" className="secondary-button" onClick={refresh}>Try again</button>
                    </div>
                  )}
                  {!loading && !listError && "No coupons yet."}
                </td>
              </tr>
            )}
            {!loading && !listError && coupons.map((coupon) => {
              const style = STATUS_STYLE[coupon.status] || STATUS_STYLE[COUPON_STATUS.EXPIRED];
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
                      type="button"
                      onClick={() => toggleCoupon(coupon)}
                      disabled={busy}
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
                      type="button"
                      onClick={() => selectCouponToDelete(coupon.code)}
                      disabled={busy}
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
        {!listError && totalCoupons > 0 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, padding: 16 }}>
            <button type="button" className="secondary-button" onClick={() => setCouponPage(couponPage - 1)} disabled={loading || busy || couponPage === 1}>
              Previous
            </button>
            <span>Page {couponPage} of {totalCouponPages}</span>
            <button type="button" className="secondary-button" onClick={() => setCouponPage(couponPage + 1)} disabled={loading || busy || couponPage >= totalCouponPages}>
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
            {message?.error && <p className="feature-status" role="alert">{message.text}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button type="button" onClick={() => selectCouponToDelete(null)} disabled={deleting} style={{
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
