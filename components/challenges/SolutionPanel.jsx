'use client';
import { useMemo, useState } from 'react';
import { BACKENDS, exportCode } from '../../lib/challenges/export.js';
import { analyze, compareToReference } from '../../lib/challenges/grader.js';
import { Paragraphs, Inline } from './RichText.jsx';

const VERDICT_TEXT = {
  better: 'Your circuit beats our reference. Nice work.',
  equal: 'Your circuit matches the optimised reference.',
  close: 'Same size as the reference, but not quite as compact.',
  worse: 'The reference is smaller — compare the two below.',
};

export default function SolutionPanel({ problem, unlocked, failed, revealed, userStats, onReveal, onLoadCode, onLoadCircuit, backend }) {
  const [tab, setTab] = useState(backend === 'qasm3' || backend === 'cirq' || backend === 'pennylane' ? backend : 'qiskit');
  const [copied, setCopied] = useState(false);
  const circuit = useMemo(() => ({ n: problem.n, ops: problem.reference.ops }), [problem]);
  const ref = useMemo(() => analyze(circuit), [circuit]);
  const code = useMemo(() => exportCode(tab, circuit), [tab, circuit]);

  if (!unlocked) {
    return (
      <div className="cx-locked">
        <div className="cx-lock-icon" aria-hidden="true">🔒</div>
        <h3>Solution locked</h3>
        <p>Solve this challenge to unlock the optimised circuit, its code in every backend, and a walkthrough.</p>
        {failed > 0 ? (
          <>
            <p className="cx-dim">Stuck after {failed} unsuccessful submission{failed > 1 ? 's' : ''}? You can peek — but solving it yourself is what earns XP.</p>
            <button type="button" className="cx-btn cx-btn-ghost" onClick={onReveal}>Reveal without XP</button>
          </>
        ) : (
          <p className="cx-dim">Try the hints first. If you get stuck, the reveal option appears after your first unsuccessful Submit.</p>
        )}
      </div>
    );
  }

  const verdict = userStats ? compareToReference(userStats, ref) : null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="cx-solution">
      {revealed && !userStats && <p className="cx-note">Revealed without solving — no XP for this one, but you can still submit your own version.</p>}
      {verdict && <p className={`cx-note cx-note-${verdict}`}>{VERDICT_TEXT[verdict]}</p>}

      <table className="cx-cmp">
        <thead><tr><th /><th>Optimised</th>{userStats && <th>Yours</th>}</tr></thead>
        <tbody>
          <tr><th scope="row">Gates</th><td>{ref.gates}</td>{userStats && <td className={userStats.gates <= ref.gates ? 'is-good' : ''}>{userStats.gates}</td>}</tr>
          <tr><th scope="row">Depth</th><td>{ref.depth}</td>{userStats && <td className={userStats.depth <= ref.depth ? 'is-good' : ''}>{userStats.depth}</td>}</tr>
          <tr><th scope="row">Multi-qubit gates</th><td>{ref.twoQubit}</td>{userStats && <td className={userStats.twoQubit <= ref.twoQubit ? 'is-good' : ''}>{userStats.twoQubit}</td>}</tr>
        </tbody>
      </table>

      <h3>Why it works</h3>
      <Paragraphs items={problem.explanation} />

      <h3>Optimisation notes</h3>
      <ul className="cx-list">
        {problem.reference.notes.map((n, i) => <li key={i}><Inline text={n} /></li>)}
      </ul>

      <h3>Optimised code</h3>
      <div className="cx-seg" role="tablist" aria-label="Backend">
        {BACKENDS.map((b) => (
          <button key={b.id} type="button" role="tab" aria-selected={tab === b.id} className={tab === b.id ? 'is-on' : ''} onClick={() => setTab(b.id)}>{b.label}</button>
        ))}
      </div>
      <pre className="cx-code-block"><code>{code}</code></pre>
      <div className="cx-sol-actions">
        <button type="button" className="cx-btn cx-btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        <button type="button" className="cx-btn cx-btn-ghost" onClick={() => onLoadCode(tab, code)}>Load into editor</button>
        <button type="button" className="cx-btn cx-btn-ghost" onClick={() => onLoadCircuit(circuit)}>Show in circuit builder</button>
      </div>
      {problem.grading.oracle && <p className="cx-dim">The oracle call is a placeholder: the grader swaps in the hidden black box, so the same circuit works for every hidden case.</p>}
    </div>
  );
}
