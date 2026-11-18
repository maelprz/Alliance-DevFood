// Inline message for forms (errors, confirmations). One style everywhere.
// Exports only FormAlert component — React Compiler rule
const TONES = {
  error: { bg: "#fef3f2", fg: "#b42318" },
  success: { bg: "#ecfdf3", fg: "#067647" },
  info: { bg: "#f2f4f7", fg: "#344054" },
};

function Icon({ tone }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: { flexShrink: 0, marginTop: 1 } };
  if (tone === "success") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export default function FormAlert({ tone = "error", children, style }) {
  const { bg, fg } = TONES[tone] ?? TONES.error;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        background: bg,
        color: fg,
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 13,
        lineHeight: 1.45,
        ...style,
      }}
    >
      <Icon tone={tone} />
      <span>{children}</span>
    </div>
  );
}
