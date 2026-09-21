// Exact state-vector simulator.  Qubit i is bit i of the amplitude index.
// Bitstrings shown to users are written q0 q1 q2 … (left → right).
import { GATES, mat1 } from './gates.js';

export function zeroState(n) {
  const re = new Float64Array(1 << n);
  const im = new Float64Array(1 << n);
  re[0] = 1;
  return { n, re, im };
}

export function basisState(n, idx) {
  const st = zeroState(n);
  st.re[0] = 0;
  st.re[idx] = 1;
  return st;
}

function apply1(st, m, t, cmask) {
  const { re, im } = st;
  const size = re.length;
  const tb = 1 << t;
  const [ar, ai, br, bi, cr, ci, dr, di] = m;
  for (let i = 0; i < size; i++) {
    if (i & tb) continue;
    if ((i & cmask) !== cmask) continue;
    const j = i | tb;
    const xr = re[i], xi = im[i], yr = re[j], yi = im[j];
    re[i] = ar * xr - ai * xi + br * yr - bi * yi;
    im[i] = ar * xi + ai * xr + br * yi + bi * yr;
    re[j] = cr * xr - ci * xi + dr * yr - di * yi;
    im[j] = cr * xi + ci * xr + dr * yi + di * yr;
  }
}

function applySwap(st, a, b, cmask) {
  const { re, im } = st;
  const ab = 1 << a;
  const bb = 1 << b;
  for (let i = 0; i < re.length; i++) {
    if (!(i & ab) || (i & bb)) continue;
    if ((i & cmask) !== cmask) continue;
    const j = (i ^ ab) | bb;
    let t = re[i]; re[i] = re[j]; re[j] = t;
    t = im[i]; im[i] = im[j]; im[j] = t;
  }
}

export function applyOp(st, op) {
  const def = GATES[op.g];
  if (!def) throw new Error(`Unknown gate "${op.g}"`);
  const q = op.q;
  let cmask = 0;
  for (let k = 0; k < def.c; k++) cmask |= 1 << q[k];
  if (def.base === 'swap') applySwap(st, q[def.c], q[def.c + 1], cmask);
  else apply1(st, mat1(def.base, op.p ? op.p[0] : 0), q[def.c], cmask);
}

export function runOps(n, ops, init) {
  const st = init || zeroState(n);
  for (const op of ops) applyOp(st, op);
  return st;
}

/* ---------- read-outs ---------- */

// Marginal distribution over `qubits`; index bit j ↔ qubits[j].
export function marginal(st, qubits) {
  const out = new Float64Array(1 << qubits.length);
  for (let i = 0; i < st.re.length; i++) {
    const p = st.re[i] * st.re[i] + st.im[i] * st.im[i];
    if (p === 0) continue;
    let k = 0;
    for (let j = 0; j < qubits.length; j++) k |= ((i >> qubits[j]) & 1) << j;
    out[k] += p;
  }
  return out;
}

export const bitsOf = (idx, k) => {
  let s = '';
  for (let j = 0; j < k; j++) s += (idx >> j) & 1;
  return s;
};

export const idxOfBits = (bits) => {
  let k = 0;
  for (let j = 0; j < bits.length; j++) if (bits[j] === '1') k |= 1 << j;
  return k;
};

export function distribution(st, qubits) {
  const m = marginal(st, qubits);
  const d = {};
  for (let i = 0; i < m.length; i++) if (m[i] > 1e-12) d[bitsOf(i, qubits.length)] = m[i];
  return d;
}

// |<a|b>|^2 for two normalised states of equal size.
export function fidelity(a, b) {
  let zr = 0, zi = 0;
  for (let i = 0; i < a.re.length; i++) {
    zr += a.re[i] * b.re[i] + a.im[i] * b.im[i];
    zi += a.re[i] * b.im[i] - a.im[i] * b.re[i];
  }
  return zr * zr + zi * zi;
}

// <t| rho_q |t> for a pure single-qubit target t = [[re,im],[re,im]].
export function qubitFidelity(st, q, t) {
  const bit = 1 << q;
  let r00 = 0, r11 = 0, cr = 0, ci = 0;
  for (let i = 0; i < st.re.length; i++) {
    if (i & bit) continue;
    const j = i | bit;
    r00 += st.re[i] ** 2 + st.im[i] ** 2;
    r11 += st.re[j] ** 2 + st.im[j] ** 2;
    // rho01 += psi_i * conj(psi_j)
    cr += st.re[i] * st.re[j] + st.im[i] * st.im[j];
    ci += st.im[i] * st.re[j] - st.re[i] * st.im[j];
  }
  const [[t0r, t0i], [t1r, t1i]] = t;
  // conj(t0) * rho01 * t1
  const ar = t0r * cr + t0i * ci;
  const ai = t0r * ci - t0i * cr;
  const term01 = ar * t1r - ai * t1i;
  return r00 * (t0r * t0r + t0i * t0i) + r11 * (t1r * t1r + t1i * t1i) + 2 * term01;
}

// Full unitary as an array of column states (column k = U|k>).
export function unitaryColumns(n, ops) {
  const cols = [];
  for (let k = 0; k < 1 << n; k++) cols.push(runOps(n, ops, basisState(n, k)));
  return cols;
}

// 1 when equal up to a global phase, smaller otherwise.
export function unitaryOverlap(a, b) {
  let zr = 0, zi = 0;
  for (let k = 0; k < a.length; k++) {
    for (let i = 0; i < a[k].re.length; i++) {
      zr += a[k].re[i] * b[k].re[i] + a[k].im[i] * b[k].im[i];
      zi += a[k].re[i] * b[k].im[i] - a[k].im[i] * b[k].re[i];
    }
  }
  return Math.hypot(zr, zi) / a.length;
}

export const cabs2 = (st, i) => st.re[i] * st.re[i] + st.im[i] * st.im[i];
