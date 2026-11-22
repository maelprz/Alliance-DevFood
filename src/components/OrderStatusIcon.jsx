// Inline SVG icons for the order steps — render identically across
// OS/browsers, unlike emoji. Placed (receipt) → Preparing (pot) →
// On the way (scooter) → Delivered (home).
export default function OrderStatusIcon({ status, color = "currentColor", size = 20 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (status) {
    case "Pending":
      return (
        <svg {...props}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
        </svg>
      );
    case "Preparing":
      return (
        <svg {...props}>
          <path d="M6 13h12l-1 7H7z" />
          <path d="M9 9c0-2 1-3 3-3s3 1 3 3" />
          <path d="M5 13h14" />
        </svg>
      );
    case "Ready":
      return (
        <svg {...props}>
          <circle cx="5.5" cy="17.5" r="2.5" />
          <circle cx="18.5" cy="17.5" r="2.5" />
          <path d="M8 17.5h7l3-6h-4l-2-4H9" />
          <path d="M5.5 15l2-5h3" />
        </svg>
      );
    case "Delivered":
      return (
        <svg {...props}>
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      );
    default:
      return null;
  }
}
