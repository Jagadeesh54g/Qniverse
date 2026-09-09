export default function Logo({ compact=false }) {
  return <span className="logo" aria-label="Qniverse">
    <svg viewBox="0 0 44 44" className="logo-mark" aria-hidden="true">
      <defs><linearGradient id="qg" x1="0" x2="1"><stop stopColor="#7c6cff"/><stop offset="1" stopColor="#38ddff"/></linearGradient></defs>
      <circle cx="22" cy="22" r="8" fill="none" stroke="url(#qg)" strokeWidth="2.5"/>
      <ellipse cx="22" cy="22" rx="18" ry="7" fill="none" stroke="#38ddff" strokeWidth="1.5" transform="rotate(-32 22 22)"/>
      <ellipse cx="22" cy="22" rx="18" ry="7" fill="none" stroke="#8b7cff" strokeWidth="1.5" transform="rotate(32 22 22)"/>
      <circle cx="37" cy="14" r="2.5" fill="#fff"/><circle cx="8" cy="29" r="2" fill="#fff"/>
    </svg>
    {!compact && <span className="logo-word">Q<span>niverse</span></span>}
  </span>
}
