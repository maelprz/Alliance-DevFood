// Countdown ring for the cancel window on Track Order.
const SIZE = 44;
const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CancelCountdown({ progress, label }) {
  const center = SIZE / 2;
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`${label} left to cancel`}
      style={{ flexShrink: 0 }}
    >
      <circle cx={center} cy={center} r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth="4" />
      <circle
        cx={center}
        cy={center}
        r={RADIUS}
        fill="none"
        stroke="#FF5A36"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.25s linear" }}
      />
      <text
        x={center}
        y={center + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="#111827"
      >
        {label}
      </text>
    </svg>
  );
}
