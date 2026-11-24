import { useState } from "react";
import { useNav } from "../context/useNav";
import AuthCard from "../components/AuthCard";
import FormAlert from "../components/FormAlert";
import { requestPasswordReset } from "../services/authService";
import { isValidEmail } from "../utils/validation";
import { authInputStyle, authButtonStyle, authLinkStyle } from "../constants/authStyles";



export default function ForgotPassword() {
  const { navigate } = useNav();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); 
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await requestPasswordReset(email.trim());
      if (res.success) setResult(res);
      else setError(res.message);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
    >
      {result ? (
        <div>
          <FormAlert tone="success" style={{ marginBottom: 16 }}>
            If that email has an account, a reset link is on its way. It expires in 30 minutes.
          </FormAlert>
          
          {result.devResetLink && (
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px", wordBreak: "break-all" }}>
              Dev mode (no email server):{" "}
              <a href={result.devResetLink} style={{ color: "#FF5A36" }}>
                open the reset link
              </a>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              htmlFor="forgot-email"
              style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}
            >
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={authInputStyle(!!error)}
            />
            {error && (
              <p role="alert" style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>
                {error}
              </p>
            )}
          </div>
          <button type="submit" disabled={loading} style={authButtonStyle(loading)}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button type="button" onClick={() => navigate("login")} style={authLinkStyle}>
          ← Back to login
        </button>
      </div>
    </AuthCard>
  );
}
