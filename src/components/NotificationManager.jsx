import { useEffect, useState } from "react";

const AUDIENCE_LABEL = {
  all: "Everyone",
  user: "Single user",
};

export default function NotificationManager() {
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    body: "",
    couponCode: "",
  });
  const [coupons, setCoupons] = useState([]);

  async function fetchHistory() {
    try {
      const res = await fetch("http://localhost:5000/api/notifications/all");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }

  async function fetchCoupons() {
    try {
      const res = await fetch("http://localhost:5000/api/coupons");
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      // Coupon list is optional — composer still works without it.
    }
  }

  useEffect(() => {
    fetchHistory();
    fetchCoupons();
  }, []);

  async function sendBroadcast() {
    setMessage("");
    if (!form.title.trim() || !form.body.trim()) {
      setMessage("Title and message are both required.");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          message: form.body,
          audience: "all",
          couponCode: form.couponCode.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setMessage("Failed to send notification.");
        setTimeout(() => setMessage(""), 2000);
        return;
      }
      setForm({ title: "", body: "", couponCode: "" });
      setMessage("Notification sent to all customers.");
      setTimeout(() => setMessage(""), 2000);
      fetchHistory();
    } catch (err) {
      console.error(err);
      setMessage("Network error. Try again.");
      setTimeout(() => setMessage(""), 2000);
    }
  }

  async function deleteNotification(id) {
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}`, {
        method: "DELETE",
      });
      fetchHistory();
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
        Send Notifications
      </h1>

      {message && (
        <div
          style={{
            background: message.startsWith("Failed") || message.startsWith("Network") || message.startsWith("Title")
              ? "#fef2f2"
              : "#ecfdf5",
            color: message.startsWith("Failed") || message.startsWith("Network") || message.startsWith("Title")
              ? "#dc2626"
              : "#065f46",
            padding: "12px 16px",
            border: "1px solid",
            borderColor: message.startsWith("Failed") || message.startsWith("Network") || message.startsWith("Title")
              ? "#fecaca"
              : "#a7f3d0",
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      )}

      {/* COMPOSE BROADCAST */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>
          New broadcast to all customers
        </h2>

        <div style={{ display: "grid", gap: 12 }}>
          <input
            placeholder="Title (e.g. New coupon dropped!)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={inputStyle}
          />

          <textarea
            placeholder="Message body — what should customers know?"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
                color: "#374151",
              }}
            >
              Attach coupon code (optional)
            </label>
            <select
              value={form.couponCode}
              onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
              style={inputStyle}
            >
              <option value="">— None —</option>
              {coupons.filter((c) => c.code).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.discountPercent}% off, min ₱{c.minOrder})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={sendBroadcast}
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
          Send to all customers
        </button>
      </div>

      {/* HISTORY */}
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
        Recent notifications
      </h2>
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        {history.length === 0 ? (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: 13,
            }}
          >
            No notifications sent yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fdf6ef", borderBottom: "1px solid #e5e7eb" }}>
                {["Type", "Audience", "Title", "Message", "Sent", "Action"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#6b7280",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((n) => (
                <tr key={n.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151" }}>
                    {n.type}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#374151" }}>
                    {AUDIENCE_LABEL[n.audience] || n.audience}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>
                    {n.title}
                    {n.couponCode && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "2px 6px",
                          background: "#fdf6ef",
                          border: "1px dashed #FF5A36",
                          borderRadius: 4,
                          fontSize: 11,
                          color: "#c2410c",
                          fontFamily: "monospace",
                        }}
                      >
                        {n.couponCode}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#4b5563", maxWidth: 280 }}>
                    {n.message}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => deleteNotification(n.id)}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid #fecaca",
                        borderRadius: 6,
                        background: "#fef2f2",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
