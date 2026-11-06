import { useState } from "react";
import { useNav } from "../context/useNav";
import AuthCard from "../components/AuthCard";
import { resetPassword } from "../services/authService";
import { validatePassword } from "../utils/validation";
import { authInputStyle, authButtonStyle, authLinkStyle } from "../constants/authStyles";

// Used as a lazy useState initializer so the URL is read once, not on every render.
function tokenFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get("reset_token") || "";
  } catch {
    return "";
  }
}

// Drops ?reset_token from the address bar so the token isn't left in history.
function clearTokenFromUrl() {
  try {
    window.history.replaceState(null, "", window.location.pathname);
  } catch {
    // history API unavailable — harmless.
  }
}

// Reset Password — opened from the emailed link (/?reset_token=...).
// Exports only ResetPassword component — React Compiler rule
export default function ResetPassword() {
  const { navigate } = useNav();
  const [token] = useState(tokenFromUrl);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState("");
  const [loading, setLoading] = useState(false);

  function goToLogin() {
    clearTokenFromUrl();
    navigate("login");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    const next = {};
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) next.password = pwCheck.message;
    if (form.password !== form.confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await resetPassword(token, form.password);
      if (res.success) {
        clearTokenFromUrl();
        setDone(res.message);
      } else {
        setServerError(res.message);
      }
    } catch (err) {
      setServerError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title="Reset link missing" subtitle="Open the link from your password reset email, or request a new one.">
        <button type="button" onClick={() => navigate("forgot-password")} style={authButtonStyle(false)}>
          Request a new link
        </button>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button type="button" onClick={goToLogin} style={authLinkStyle}>
            ← Back to login
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Your new password will replace the old one and sign you out everywhere.">
      {done ? (
        <>
          <p
            role="status"
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 14,
              margin: "0 0 16px",
            }}
          >
            {done}
          </p>
          <button type="button" onClick={goToLogin} style={authButtonStyle(false)}>
            Go to login
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {serverError && (
            <p
              role="alert"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                margin: 0,
              }}
            >
              {serverError}
            </p>
          )}
          {[
            { key: "password", label: "New password" },
            { key: "confirm", label: "Confirm new password" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label
                htmlFor={`reset-${key}`}
                style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}
              >
                {label}
              </label>
              <input
                id={`reset-${key}`}
                type="password"
                autoComplete="new-password"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                style={authInputStyle(!!errors[key])}
              />
              {errors[key] && (
                <p role="alert" style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>
                  {errors[key]}
                </p>
              )}
            </div>
          ))}
          <button type="submit" disabled={loading} style={authButtonStyle(loading)}>
            {loading ? "Saving…" : "Reset password"}
          </button>
          <div style={{ textAlign: "center" }}>
            <button type="button" onClick={goToLogin} style={authLinkStyle}>
              ← Back to login
            </button>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
