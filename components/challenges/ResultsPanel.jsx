'use client';
import { useEffect, useState } from 'react';
import { VERDICT_TITLES } from '../../lib/challenges/grader.js';

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function ProbBars({ detail }) {
  const keys = [...new Set([...Object.keys(detail.got), ...Object.keys(detail.expected)])].sort();
  return (
    <div className="cx-bars" role="table" aria-label="Outcome probabilities">
      <div className="cx-bars-legend"><span className="cx-key-exp">expected</span><span className="cx-key-got">your circuit</span>
        <span className="cx-bars-q">qubit{detail.qubits.length > 1 ? 's' : ''} {detail.qubits.join(', ')} (left → right)</span></div>
      {keys.map((k) => (
        <div className="cx-bar-row" key={k} role="row">
          <code>{k}</code>
          <div className="cx-bar-track">
            <div className="cx-bar-exp" style={{ width: `${(detail.expected[k] || 0) * 100}%` }} />
            <div className="cx-bar-got" style={{ width: `${(detail.got[k] || 0) * 100}%` }} />
          </div>
          <span>{pct(detail.got[k] || 0)} <em>/ {pct(detail.expected[k] || 0)}</em></span>
        </div>
      ))}
    </div>
  );
}

function CaseDetail({ c }) {
  const d = c.detail;
  return (
    <div className="cx-case-detail">
      <p className="cx-case-name">{c.visible ? c.name : `Hidden case — ${c.name}`}</p>
      {c.message && <p className="cx-case-msg">{c.message}</p>}
      {d && d.kind === 'probs' && <ProbBars detail={d} />}
      {d && d.kind === 'prob' && (
        <div className="cx-gauge">
          <div className="cx-bar-track">
            <div className="cx-bar-got" style={{ width: `${d.value * 100}%` }} />
            <div className="cx-gauge-mark" style={{ left: `${d.bound * 100}%` }} title={`${d.atLeast ? 'minimum' : 'maximum'} ${pct(d.bound)}`} />
          </div>
          <span>P({d.bits}) = {pct(d.value)}</span>
        </div>
      )}
      {d && d.kind === 'fidelity' && (
        <div className="cx-gauge">
          <div className="cx-bar-track"><div className="cx-bar-got" style={{ width: `${Math.max(0, Math.min(1, d.value)) * 100}%` }} /></div>
          <span>match {d.value.toFixed(4)} / 1.0000</span>
        </div>
      )}
      {c.pass && <p className="cx-case-ok">This case passes.</p>}
    </div>
  );
}

export default function ResultsPanel({ result, running, oracleNote }) {
  const [sel, setSel] = useState(0);
  useEffect(() => {
    if (!result || !result.cases) return;
    const firstFail = result.cases.findIndex((c) => !c.pass);
    setSel(firstFail >= 0 ? firstFail : 0);
  }, [result]);

  if (running) {
    return (
      <div className="cx-results is-empty" aria-live="polite">
        <span className="cx-spinner" aria-hidden="true" /> {running === 'submit' ? 'Submitting…' : 'Running…'}
        {' '}<span className="cx-dim">(the first Python run downloads the runtime — a few seconds)</span>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="cx-results is-empty">
        <p>Run checks the sample cases. Submit also checks the hidden ones{oracleNote ? ` — ${oracleNote}` : ''}.</p>
        <p className="cx-dim">Shortcuts: Ctrl/⌘ + Enter to run, Ctrl/⌘ + Shift + Enter to submit.</p>
      </div>
    );
  }

  const good = result.verdict === 'accepted' || result.verdict === 'samples';
  const cases = result.cases || [];
  const hiddenIdx = cases.filter((c) => !c.visible);
  const current = cases[sel];
  return (
    <div className="cx-results" aria-live="polite">
      <div className="cx-res-head">
        <span className={`cx-verdict ${good ? 'is-good' : 'is-bad'}`}>{VERDICT_TITLES[result.verdict]}</span>
        {result.total ? <span className="cx-dim">{result.passed} / {result.total} cases passed</span> : null}
        <span className="cx-dim">{result.ms} ms{result.ranOn === 'server' ? ' · server runtime' : ''}</span>
      </div>

      {result.fellBack && <p className="cx-note">The browser runtime doesn&apos;t cover part of this code, so it ran on the server with the real library.</p>}

      {(result.verdict === 'error' || result.verdict === 'rule') && (
        <pre className={`cx-errbox${result.verdict === 'rule' ? ' is-rule' : ''}`}>{result.message}</pre>
      )}

      {result.stats && (
        <div className="cx-stats">
          <span><b>{result.stats.gates}</b> gates</span>
          <span><b>{result.stats.depth}</b> depth</span>
          <span><b>{result.stats.twoQubit}</b> multi-qubit</span>
          {result.stats.oracleCalls > 0 && <span><b>{result.stats.oracleCalls}</b> oracle call{result.stats.oracleCalls > 1 ? 's' : ''}</span>}
        </div>
      )}

      {cases.length > 0 && (
        <>
          <div className="cx-case-tabs" role="tablist" aria-label="Test cases">
            {cases.map((c, i) => (
              <button key={i} type="button" role="tab" aria-selected={sel === i} className={`cx-case-tab${sel === i ? ' is-on' : ''} ${c.pass ? 'is-pass' : 'is-fail'}`} onClick={() => setSel(i)}>
                <span aria-hidden="true">{c.pass ? '✓' : '✗'}</span> {c.visible ? `Case ${c.index + 1}` : `Hidden ${hiddenIdx.indexOf(c) + 1}`}
              </button>
            ))}
          </div>
          {current && <CaseDetail c={current} />}
        </>
      )}

      {result.stdout ? (<details className="cx-stdout"><summary>Program output</summary><pre>{result.stdout}</pre></details>) : null}
      {result.verdict === 'samples' && <p className="cx-note">Sample cases pass. Press Submit to check the hidden cases too.</p>}
    </div>
  );
}
