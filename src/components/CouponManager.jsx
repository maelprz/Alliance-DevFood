import { useEffect, useState } from "react";

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);

  const [message, setMessage] = useState("");

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountPercent: "",
    minOrder: "",
    expiresAt: "",
  });

  async function fetchCoupons() {
    try {
      const res = await fetch("http://localhost:5000/api/coupons");
      const data = await res.json();
      setCoupons(data);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    }
  }

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function addCoupon() {
    setMessage("");

    if (
        !newCoupon. code ||
        !newCoupon.discountPercent ||
        !newCoupon.minOrder ||
        !newCoupon.expiresAt
      ) {
        setMessage("Please fill in all fields to add a coupon.");
        setTimeout(() => setMessage(""), 1000);
        return;
      }

    try {
      const res = await fetch("http://localhost:5000/api/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newCoupon,
          discountPercent: Number(newCoupon.discountPercent),
          minOrder: Number(newCoupon.minOrder),
        }),
      });

      if (!res.ok) {
        setMessage("Failed to add coupon. Please check the details and try again.");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

      setNewCoupon({
        code: "",
        discountPercent: "",
        minOrder: "",
        expiresAt: "",
      });

      fetchCoupons();

      setMessage("Coupon added successfully!");
      setTimeout(() => setMessage(""), 1000);

    } catch (err) {
      console.error(err);
    }
  }

  async function deleteCoupon(code) {
    try {
      await fetch(`http://localhost:5000/api/coupons/${code}`, {
        method: "DELETE",
      });

      fetchCoupons();
    } catch (err) {
      console.error(err);
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
  };

  return (
  <div>
    <h1
      style={{
        fontSize: 24,
        fontWeight: 700,
        marginBottom: 24,
        color: "#111827",
      }}
    >
      Manage Coupons
    </h1>

    {message && (
      <div
        style={{
          background: "#fef2f2",
          color: "#dc2626",
          padding: "12px 16px",
          border: "1px solid #fecaca",
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {message}
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
        <input
          placeholder="Code"
          value={newCoupon.code}
          onChange={(e) =>
            setNewCoupon({ ...newCoupon, code: e.target.value })
          }
          style={inputStyle}
        />

        <input
          placeholder="Discount %"
          type="number"
          value={newCoupon.discountPercent}
          onChange={(e) =>
            setNewCoupon({
              ...newCoupon,
              discountPercent: e.target.value,
            })
          }
          style={inputStyle}
        />

        <input
          placeholder="Minimum Order"
          type="number"
          value={newCoupon.minOrder}
          onChange={(e) =>
            setNewCoupon({
              ...newCoupon,
              minOrder: e.target.value,
            })
          }
          style={inputStyle}
        />

        <input
          type="date"
          value={newCoupon.expiresAt}
          onChange={(e) =>
            setNewCoupon({
              ...newCoupon,
              expiresAt: e.target.value,
            })
          }
          style={inputStyle}
        />
      </div>

      <button
        onClick={addCoupon}
        style={{
          marginTop: 16,
          padding: "10px 18px",
          background: "#FF5A36",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Add Coupon
      </button>
    </div>

    {/* COUPON TABLE */}
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#fdf6ef",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {["Code", "Discount", "Min Order", "Expires", "Action"].map(
              (head) => (
                <th
                  key={head}
                  style={{
                    padding: "14px 20px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#6b7280",
                  }}
                >
                  {head}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {coupons.filter((coupon) => coupon.code).map((coupon) => (
            <tr
              key={coupon.code}
              style={{
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <td style={{ padding: "16px 20px", fontWeight: 600 }}>
                {coupon.code}
              </td>

              <td style={{ padding: "16px 20px" }}>
                {coupon.discountPercent}%
              </td>

              <td style={{ padding: "16px 20px" }}>
                ₱{coupon.minOrder}
              </td>

              <td style={{ padding: "16px 20px" }}>
                {coupon.expiresAt}
              </td>

              <td style={{ padding: "16px 20px" }}>
                <button
                  onClick={() => deleteCoupon(coupon.code)}
                  style={{
                    padding: "8px 14px",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    background: "#fef2f2",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );

}
