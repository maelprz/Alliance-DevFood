// Shared full-screen layout for the small auth pages (Forgot / Reset Password):
// same coral gradient as Login with a centered white card.
// Exports only AuthCard component — React Compiler rule
export default function AuthCard({ title, subtitle, children }) {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255, 90, 54, 0.92) 0%, rgba(251, 146, 60, 0.85) 45%, rgba(251, 191, 36, 0.8) 100%)",
          zIndex: 0,
        }}
      />
      <main
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#ffffff",
            borderRadius: 16,
            padding: "32px 28px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
            boxSizing: "border-box",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px" }}>{subtitle}</p>
          )}
          {children}
        </div>
      </main>
    </>
  );
}
