import { useState, useEffect } from "react";
import { useNav } from "../context/useNav";
import { useApp } from "../context/useApp";

// Admin-only login page — separate from customer login
// Admin entry point: navigate to 'admin-login' view
// Exports only AdminLogin component — React Compiler rule
export default function AdminLogin() {
  const { navigate } = useNav();
  const { setAdminUser } = useApp();
  const [formData, setFormData] = useState({ email: "", password: "" });

  // Lock page scroll on the auth screen — there's nothing to scroll to.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      if (data.user.role !=="admin") {

        seetError("Unauthorized: Admin access only");
        return;
      }
      setAdminUser(data.user);
      navigate("admin");

    } catch (err) {
      setError("An error occurred during login. Please try again.");
    }

  };

  return (
    <>
      {/* Pinned dark background — fills viewport always, never scrolls away. */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(135deg, #0f172a 0%, #1f2937 60%, #111827 100%)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* Shield icon — inline SVG so it renders identically across OS. */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#FF5A36",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(255, 90, 54, 0.35)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 8px",
            }}
          >
            DevFood Admin
          </h1>
          <p style={{ color: "#9ca3af", margin: 0 }}>Admin Portal Access</p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #374151",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            padding: 0,
            overflow: "hidden",
          }}
        >
          {/* Admin gradient strip — cooler tones to differentiate from customer login */}
          <div
            style={{
              height: 6,
              background:
                "linear-gradient(90deg, #1f2937 0%, #FF5A36 100%)",
            }}
          />
          <div style={{ padding: 32 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#111827",
              margin: "0 0 24px",
            }}
          >
            Admin Login
          </h2>

          {/* Error message */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: "#374151",
                }}
              >
                Admin Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@devfood.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "#fdf6ef",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: "#374151",
                }}
              >
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "#fdf6ef",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "#FF5A36",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                marginTop: 4,
              }}
            >
              Sign In to Admin Panel
            </button>
          </form>

          {/* Back to customer link */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button
              onClick={() => navigate("login")}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Back to Customer Login
            </button>
          </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
