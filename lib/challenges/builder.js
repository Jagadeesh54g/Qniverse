// Pure helpers behind the drag-and-click circuit builder (kept UI-free so they can be unit-tested).
// A builder op is a circuit op plus a column:  { id, g, q: [..], p?, pe?, col }
import { GATES } from './gates.js';
import { evalExpr } from './qasm.js';

export const PALETTE = [
  { group: 'Single-qubit', items: ['h', 'x', 'y', 'z', 's', 'sdg', 't', 'tdg', 'sx'] },
  { group: 'Rotations', items: ['rx', 'ry', 'rz', 'p'] },
  { group: 'Controlled', items: ['cx', 'cy', 'cz', 'ch', 'cp', 'crx', 'cry', 'crz'] },
  { group: 'Multi-qubit', items: ['swap', 'ccx', 'ccz', 'cswap'] },
];

export const PALETTE_LABEL = {
  h: 'H', x: 'X', y: 'Y', z: 'Z', s: 'S', sdg: 'S†', t: 'T', tdg: 'T†', sx: '√X',
  rx: 'Rx', ry: 'Ry', rz: 'Rz', p: 'P',
  cx: 'CNOT', cy: 'CY', cz: 'CZ', ch: 'CH', cp: 'CP', crx: 'CRx', cry: 'CRy', crz: 'CRz',
  swap: 'SWAP', ccx: 'Toffoli', ccz: 'CCZ', cswap: 'Fredkin',
};

// what to click for each operand, in order
export function roles(g) {
  const def = GATES[g];
  if (def.base === 'swap') {
    const r = Array.from({ length: def.c }, (_, i) => (def.c > 1 ? `control ${i + 1}` : 'control'));
    return [...r, 'first qubit', 'second qubit'];
  }
  const r = Array.from({ length: def.c }, (_, i) => (def.c > 1 ? `control ${i + 1}` : 'control'));
  return [...r, 'target'];
}

export const span = (op) => [Math.min(...op.q), Math.max(...op.q)];

// A column can hold several ops as long as their vertical spans don't overlap.
export function canPlace(ops, cand, ignoreId = null) {
  const [lo, hi] = span(cand);
  return !ops.some((o) => {
    if (o.id === ignoreId || o.col !== cand.col) return false;
    const [a, b] = span(o);
    return !(b < lo || a > hi);
  });
}

let nextId = 1;
export const newId = () => nextId++;

export const opAt = (ops, col, q) => ops.find((o) => o.col === col && o.q.includes(q));

export const place = (ops, cand) => [...ops, { ...cand, id: newId() }];
export const remove = (ops, id) => ops.filter((o) => o.id !== id);

// angle text → { p, pe }  (pe only when it is plain "pi" arithmetic, so exported code stays readable)
export function parseAngle(text) {
  const src = String(text).trim().replace(/π/g, 'pi');
  if (!src) throw new Error('Enter an angle, e.g. pi/2');
  const p = evalExpr(src);
  const plain = /^[\d\s.+\-*/()pi]*$/.test(src) && /^(?:[\d\s.+\-*/()]|pi)*$/.test(src);
  return plain && /pi/.test(src) ? { p, pe: src } : { p, pe: undefined };
}

export function toCircuit(n, ops) {
  const sorted = [...ops].sort((a, b) => a.col - b.col || a.id - b.id);
  return {
    n,
    ops: sorted.map((o) => {
      const out = { g: o.g, q: [...o.q] };
      if (o.p) out.p = [...o.p];
      if (o.pe) out.pe = [...o.pe];
      return out;
    }),
  };
}

// Lay a plain circuit out on a grid (used to load the reference solution into the builder).
export function fromCircuit(circuit, n) {
  const free = new Array(n).fill(0);
  const out = [];
  for (const op of circuit.ops) {
    if (op.g === 'measure' || op.g === 'barrier') continue;
    const [lo, hi] = span(op);
    let col = 0;
    for (let q = lo; q <= hi; q++) col = Math.max(col, free[q]);
    for (let q = lo; q <= hi; q++) free[q] = col + 1;
    out.push({ ...op, q: [...op.q], id: newId(), col });
  }
  return out;
}

export const maxCol = (ops) => ops.reduce((m, o) => Math.max(m, o.col), -1);
