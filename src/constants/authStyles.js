// Shared inline styles for the auth pages (Forgot / Reset Password).
// Exports only style constants — React Compiler rule (one export type per file)

export const authInputStyle = (hasError) => ({
  width: "100%",
  padding: "10px 14px",
  border: hasError ? "1px solid #ef4444" : "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  background: "#fdf6ef",
  boxSizing: "border-box",
  fontFamily: "inherit",
});

export const authButtonStyle = (disabled) => ({
  width: "100%",
  padding: "11px 16px",
  background: disabled ? "#fca58f" : "#FF5A36",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "inherit",
});

export const authLinkStyle = {
  background: "none",
  border: "none",
  color: "#FF5A36",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: 0,
};
