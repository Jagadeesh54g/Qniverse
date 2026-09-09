
export default function QniverseLogo({ compact = false }) {
  return (
    <span className={`qn-logo ${compact ? 'qn-logo-compact' : ''}`} aria-label="Qniverse">
      <span className="qn-mark" aria-hidden="true">
        <span className="qn-orbit qn-orbit-a" />
        <span className="qn-orbit qn-orbit-b" />
        <span className="qn-core" />
      </span>
      {!compact && <span className="qn-word">Q<span>niverse</span></span>}
    </span>
  );
}
