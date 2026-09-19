export default function QniverseLogo({ compact = false, spinning = false, size = 30 }) {
  return (
    <span className={`qn-logo ${compact ? 'qn-logo-compact' : ''}`} aria-label="Qniverse">
      <svg
        className={`qn-mark ${spinning ? 'qn-mark-spinning' : ''}`}
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden="true"
      >
        {/* The ring — the "Q" body. */}
        <circle
          cx="32"
          cy="32"
          r="21.5"
          fill="none"
          stroke="var(--qn-logo-ring, #6f3ff5)"
          strokeWidth="8.5"
        />
        {/* The hand — the "Q" tail. Rotates about the ring centre while loading. */}
        <g className="qn-hand">
          <line
            x1="28"
            y1="28"
            x2="50"
            y2="50"
            stroke="var(--qn-logo-hand, #08bdba)"
            strokeWidth="7.5"
            strokeLinecap="round"
          />
          <circle cx="52" cy="52" r="6" fill="var(--qn-logo-hand, #08bdba)" />
        </g>
      </svg>
      {!compact && (
        <span className="qn-word">
          Q<span>niverse</span>
        </span>
      )}
    </span>
  );
}