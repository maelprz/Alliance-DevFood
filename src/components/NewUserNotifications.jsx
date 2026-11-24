import { useEffect, useState } from "react";
import FormAlert from "./FormAlert";
import {
  getNewUserMessages,
  saveNewUserMessage,
  removeNewUserMessage,
  getCouponChoices,
} from "../services/notificationService";
import { describeCoupon } from "../utils/coupon";

// Admin box: messages every new account gets right after sign-up, so they
// don't have to be sent again for each new customer.

const EMPTY_FORM = { title: "", body: "", couponCode: "" };

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

export default function NewUserNotifications() {
  const [messages, setMessages] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getNewUserMessages()
      .then((list) => { if (active) setMessages(list); })
      .catch(() => { if (active) setNotice({ tone: "error", text: "Couldn't load the messages. Please try again." }); });
    getCouponChoices()
      .then((list) => { if (active) setCoupons(list); })
      .catch(() => null);
    return () => { active = false; };
  }, []);

  function reload() {
    getNewUserMessages().then(setMessages).catch(() => null);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      setNotice({ tone: "error", text: "Add a title and a message." });
      return;
    }
    setSaving(true);
    try {
      const { ok, data } = await saveNewUserMessage({
        title: form.title,
        message: form.body,
        couponCode: form.couponCode,
      });
      if (!ok) {
        setNotice({ tone: "error", text: data.message || "Couldn't save. Please try again." });
        return;
      }
      setForm(EMPTY_FORM);
      setNotice({ tone: "success", text: "Saved. New users will get this." });
      reload();
    } catch {
      setNotice({ tone: "error", text: "Couldn't reach the server. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      const { ok, data } = await removeNewUserMessage(id);
      if (!ok) {
        setNotice({ tone: "error", text: data.message || "Couldn't remove. Please try again." });
        return;
      }
      setNotice({ tone: "success", text: "Removed. New users won't get it anymore." });
      reload();
    } catch {
      setNotice({ tone: "error", text: "Couldn't reach the server. Please try again." });
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>Messages for new users</h2>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
        New users get these automatically when they sign up.
      </p>

      {notice && (
        <FormAlert tone={notice.tone} style={{ marginBottom: 16 }}>
          {notice.text}
        </FormAlert>
      )}

      {messages.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px" }}>No messages yet.</p>
      ) : (
        <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, marginBottom: 16, maxHeight: 150, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderTop: i === 0 ? "none" : "1px solid #f3f4f6",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                  {m.title}
                  {m.couponCode && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "2px 6px",
                        background: "#fdf6ef",
                        border: "1px dashed #FF5A36",
                        borderRadius: 4,
                        fontSize: 11,
                        color: "#c2410c",
                      }}
                    >
                      {m.couponCode}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>{m.message}</div>
              </div>
              <button
                onClick={() => remove(m.id)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #fecaca",
                  borderRadius: 6,
                  background: "#fef2f2",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: 12,
                  fontFamily: "inherit",
                  flexShrink: 0,
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Title, e.g. Welcome to DevFood!"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          style={inputStyle}
        />
        <textarea
          placeholder="Message"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <select
          value={form.couponCode}
          onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
          style={inputStyle}
          aria-label="Coupon (optional)"
        >
          <option value="">No coupon (optional)</option>
          {coupons.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} ({describeCoupon(c)})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={save}
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
          fontFamily: "inherit",
        }}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
