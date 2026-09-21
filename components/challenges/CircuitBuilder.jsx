'use client';
// Click-to-place circuit builder.  Pick a gate, click a cell.  Multi-qubit gates: click the operand qubits in the
// same column, in the order shown in the hint (controls first, target last).  Right-click or the eraser removes.
import { useEffect, useMemo, useRef, useState } from 'react';
import { GATES } from '../../lib/challenges/gates.js';
import {
  PALETTE, PALETTE_LABEL, roles, canPlace, place, remove, opAt, parseAngle, maxCol, span,
} from '../../lib/challenges/builder.js';

const CW = 48; // column width
const RH = 46; // row height
const LW = 60; // label width

const pretty = (op) => {
  if (!op.p) return '';
  if (op.pe && op.pe[0]) return op.pe[0].replace(/pi/g, 'π');
  return String(+op.p[0].toFixed(3));
};

function glyphsFor(op) {
  const def = GATES[op.g];
  const out = [];
  op.q.forEach((q, i) => {
    if (i < def.c) out.push({ q, kind: 'dot' });
    else if (def.base === 'swap') out.push({ q, kind: 'cross' });
    else if (def.base === 'x' && def.c > 0) out.push({ q, kind: 'plus' });
    else if (def.base === 'z' && def.c > 0) out.push({ q, kind: 'dot' });
    else out.push({ q, kind: 'box', label: PALETTE_LABEL[op.g] || def.label, sub: pretty(op) });
  });
  return out;
}

export default function CircuitBuilder({ n, ops, onChange, disabled = [], oracleQubits = null }) {
  const [tool, setTool] = useState('h');
  const [angle, setAngle] = useState('pi/2');
  const [pending, setPending] = useState(null); // { col, qs }
  const [notice, setNotice] = useState('');
  const history = useRef([]);
  const off = useMemo(() => new Set(disabled), [disabled]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3200);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setPending(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commit = (next) => {
    history.current.push(ops);
    if (history.current.length > 100) history.current.shift();
    onChange(next);
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) onChange(prev);
  };

  const def = GATES[tool];
  const needsAngle = def && def.np > 0;
  const cols = Math.min(32, Math.max(10, maxCol(ops) + 4));
  const stepRoles = def && def.n > 1 ? roles(tool) : [];

  const withParam = (cand) => {
    if (!needsAngle) return cand;
    const { p, pe } = parseAngle(angle);
    return { ...cand, p: [p], ...(pe ? { pe: [pe] } : {}) };
  };

  const tryPlace = (base, cand) => {
    if (!canPlace(base, cand)) {
      setNotice('That step is already used in that part of the column — try the next step.');
      return false;
    }
    commit(place(base, cand));
    return true;
  };

  const clickCell = (q, col) => {
    setNotice('');
    const here = opAt(ops, col, q);
    if (tool === 'erase') {
      if (here) commit(remove(ops, here.id));
      setPending(null);
      return;
    }
    if (tool === 'oracle') {
      const spanQ = oracleQubits;
      const blocked = ops.filter((o) => o.col === col);
      if (blocked.length) { setNotice('The oracle needs a whole empty column.'); return; }
      tryPlace(ops, { g: 'oracle', q: [...spanQ], col });
      return;
    }
    if (!def) return;
    try {
      if (def.n === 1) {
        let base = ops;
        if (here) {
          if (here.q.length > 1 || here.g === 'oracle') { setNotice('Erase that gate first (eraser, or right-click it).'); return; }
          base = remove(ops, here.id);
        }
        tryPlace(base, withParam({ g: tool, q: [q], col }));
        return;
      }
      // multi-qubit
      if (!pending || pending.col !== col) {
        if (here) { setNotice('Pick an empty spot to start a multi-qubit gate.'); return; }
        setPending({ col, qs: [q] });
        return;
      }
      if (pending.qs.includes(q)) { setPending(null); return; }
      if (here) { setNotice('That spot is taken.'); return; }
      const qs = [...pending.qs, q];
      if (qs.length < def.n) { setPending({ col, qs }); return; }
      setPending(null);
      tryPlace(ops, withParam({ g: tool, q: qs, col }));
    } catch (err) {
      setNotice(err.message);
    }
  };

  const hint = (() => {
    if (tool === 'erase') return 'Click a gate to remove it.';
    if (tool === 'oracle') return 'Click an empty column to drop the black-box oracle across all its qubits.';
    if (def && def.n > 1) {
      const next = stepRoles[pending ? pending.qs.length : 0];
      return pending ? `${PALETTE_LABEL[tool]}: now click the ${next}.` : `${PALETTE_LABEL[tool]}: click the ${next} (${stepRoles.join(' → ')}), all in one column.`;
    }
    return 'Click a wire to place the gate. Right-click a gate to remove it.';
  })();

  return (
    <div className="cx-cb">
      <div className="cx-palette" role="toolbar" aria-label="Gate palette">
        {PALETTE.map((grp) => (
          <div className="cx-pal-group" key={grp.group}>
            <span className="cx-pal-title">{grp.group}</span>
            <div className="cx-pal-items">
              {grp.items.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`cx-pal-btn${tool === g ? ' is-on' : ''}`}
                  disabled={off.has(g)}
                  title={off.has(g) ? 'Not allowed in this challenge' : g}
                  aria-pressed={tool === g}
                  onClick={() => { setTool(g); setPending(null); }}
                >
                  {PALETTE_LABEL[g]}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="cx-pal-group">
          <span className="cx-pal-title">Tools</span>
          <div className="cx-pal-items">
            {oracleQubits && (
              <button type="button" className={`cx-pal-btn cx-pal-oracle${tool === 'oracle' ? ' is-on' : ''}`} aria-pressed={tool === 'oracle'}
                onClick={() => { setTool('oracle'); setPending(null); }}>
                Oracle
              </button>
            )}
            <button type="button" className={`cx-pal-btn${tool === 'erase' ? ' is-on' : ''}`} aria-pressed={tool === 'erase'}
              onClick={() => { setTool('erase'); setPending(null); }}>
              Erase
            </button>
            <button type="button" className="cx-pal-btn" onClick={undo} disabled={!history.current.length}>Undo</button>
            <button type="button" className="cx-pal-btn" onClick={() => commit([])} disabled={!ops.length}>Clear</button>
          </div>
        </div>
      </div>

      <div className="cx-cb-bar">
        {needsAngle && (
          <label className="cx-angle">
            angle
            <input value={angle} onChange={(e) => setAngle(e.target.value)} spellCheck={false} aria-label="Rotation angle" />
            <span>rad · try pi/2, pi/3, 0.5</span>
          </label>
        )}
        <span className={`cx-cb-hint${notice ? ' is-notice' : ''}`} role="status">{notice || hint}</span>
      </div>

      <div className="cx-cb-scroll">
        <div className="cx-cb-grid" style={{ width: LW + cols * CW + 12, height: n * RH }}>
          {Array.from({ length: n }, (_, q) => (
            <div key={q} className="cx-cb-row" style={{ top: q * RH, height: RH }}>
              <div className="cx-cb-label">q{q}<span> |0⟩</span></div>
              <div className="cx-cb-wire" style={{ left: LW - 6, right: 0 }} />
            </div>
          ))}

          {ops.map((op) => {
            const [lo, hi] = span(op);
            const x = LW + op.col * CW + CW / 2;
            if (op.g === 'oracle') {
              return (
                <div key={op.id} className="cx-oracle" style={{ left: LW + op.col * CW + 4, top: lo * RH + 4, width: CW - 8, height: (hi - lo + 1) * RH - 8 }}>
                  <span>oracle</span>
                </div>
              );
            }
            return (
              <div key={op.id}>
                {hi > lo && <div className="cx-conn" style={{ left: x - 1, top: lo * RH + RH / 2, height: (hi - lo) * RH }} />}
                {glyphsFor(op).map((gl) => {
                  const cy = gl.q * RH + RH / 2;
                  if (gl.kind === 'box') {
                    return (
                      <div key={gl.q} className="cx-glyph cx-box" style={{ left: x - 17, top: cy - 17 }}>
                        <b>{gl.label}</b>{gl.sub && <i>{gl.sub}</i>}
                      </div>
                    );
                  }
                  return <div key={gl.q} className={`cx-glyph cx-${gl.kind}`} style={{ left: x - 10, top: cy - 10 }}>{gl.kind === 'plus' ? '⊕' : gl.kind === 'cross' ? '×' : ''}</div>;
                })}
              </div>
            );
          })}

          {Array.from({ length: n }, (_, q) => Array.from({ length: cols }, (_, col) => {
            const isPending = pending && pending.col === col && pending.qs.includes(q);
            return (
              <button
                key={`${q}-${col}`}
                type="button"
                className={`cx-cell${isPending ? ' is-pending' : ''}`}
                style={{ left: LW + col * CW, top: q * RH, width: CW, height: RH }}
                aria-label={`qubit ${q}, step ${col + 1}`}
                onClick={() => clickCell(q, col)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const here = opAt(ops, col, q);
                  if (here) commit(remove(ops, here.id));
                }}
              />
            );
          }))}
        </div>
      </div>
      <p className="cx-cb-foot">Measurement is automatic: the grader reads the exact probabilities at the end of your circuit.</p>
    </div>
  );
}
