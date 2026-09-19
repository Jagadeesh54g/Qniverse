// lib/quantum.js
// Dependency-free statevector simulator used by Qniverse Lab.
// Gate metadata lives in lib/gates.js so the simulator and Gate Inspector
// always use the same matrix definitions.

import { gateMatrix, GATE_LIBRARY } from './gates';

const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cconj = (a) => ({ re: a.re, im: -a.im });
const cscale = (a, x) => ({ re: a.re * x, im: a.im * x });
const mag2 = (a) => a.re * a.re + a.im * a.im;

function toComplex(v) {
  if (typeof v === 'number') return { re: v, im: 0 };
  return v ?? { re: 0, im: 0 };
}

// Generic k-qubit matrix application.
// `targets` are ordered as the matrix's qubit order: first target is the
// most-significant local matrix bit.
export function applyMatrix(s, n, targets, matrix) {
  const k = targets.length;
  const dim = 2 ** k;
  if (matrix.length !== dim) throw new Error(`Expected ${dim}x${dim} matrix`);

  const targetMask = targets.reduce((mask, q) => mask | (1 << q), 0);
  const out = s.map((x) => ({ ...x }));

  for (let base = 0; base < s.length; base++) {
    if ((base & targetMask) !== 0) continue;

    const indices = new Array(dim);
    for (let local = 0; local < dim; local++) {
      let global = base;
      for (let t = 0; t < k; t++) {
        const bit = (local >> (k - 1 - t)) & 1;
        if (bit) global |= 1 << targets[t];
      }
      indices[local] = global;
    }

    const input = indices.map((idx) => s[idx]);
    const output = Array.from({ length: dim }, () => ({ re: 0, im: 0 }));

    for (let row = 0; row < dim; row++) {
      let acc = { re: 0, im: 0 };
      for (let col = 0; col < dim; col++) {
        acc = cadd(acc, cmul(toComplex(matrix[row][col]), input[col]));
      }
      output[row] = acc;
    }

    for (let i = 0; i < dim; i++) out[indices[i]] = output[i];
  }

  return out;
}

function normalize(s) {
  const norm = Math.sqrt(s.reduce((sum, x) => sum + mag2(x), 0));
  if (!norm) return s;
  return s.map((x) => cscale(x, 1 / norm));
}

function resetQubit(s, n, q) {
  const mask = 1 << q;
  const out = s.map((x) => ({ ...x }));
  for (let i = 0; i < s.length; i++) {
    if ((i & mask) !== 0) {
      out[i] = { re: 0, im: 0 };
    }
  }
  return normalize(out);
}

function applyGate(s, n, gate) {
  const name = gate.name;
  const def = GATE_LIBRARY[name];

  if (!def) return s;

  // Older gate definitions in the registry omit `qubits` for many
  // single-qubit gates. A missing value means one qubit, not zero.
  const qubitCount = Number(def.qubits ?? 1);

  if (name === 'M' || name === 'BARRIER') return s;
  if (name === 'RESET') return resetQubit(s, n, gate.qubit);

  const matrix = gateMatrix(name, gate.params || {});
  if (!matrix) return s;

  const targets = [gate.qubit];

  if (qubitCount >= 2) {
    if (gate.target !== undefined) targets.push(gate.target);
    if (gate.targets) {
      targets.length = 0;
      targets.push(gate.qubit, ...gate.targets);
    }
  }

  // Fail loudly for malformed circuits instead of silently returning |0>.
  if (targets.length !== qubitCount) {
    throw new Error(`${name} expects ${qubitCount} qubits but received ${targets.length}.`);
  }

  for (const q of targets) {
    if (!Number.isInteger(q) || q < 0 || q >= n) {
      throw new Error(`${name} references q${q}, but the circuit has ${n} qubits.`);
    }
  }

  return applyMatrix(s, n, targets, matrix);
}

export function simulate(n, circuit, shots = 1000) {
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    throw new Error('Qniverse simulator supports 1–12 qubits.');
  }

  let s = Array.from({ length: 2 ** n }, () => ({ re: 0, im: 0 }));
  s[0] = { re: 1, im: 0 };

  // Circuit timing is represented by col. Gates in the same column are
  // independent only when they touch different qubits.
  const ordered = [...circuit].sort((a, b) => (a.col ?? 0) - (b.col ?? 0));
  for (const gate of ordered) {
    s = applyGate(s, n, gate);
  }

  const probabilities = s.map(mag2);
  const counts = Array.from({ length: 2 ** n }, () => 0);

  for (let k = 0; k < shots; k++) {
    const r = Math.random();
    let acc = 0;
    let idx = probabilities.length - 1;

    for (let i = 0; i < probabilities.length; i++) {
      acc += probabilities[i];
      if (r <= acc) {
        idx = i;
        break;
      }
    }
    counts[idx]++;
  }

  return {
    statevector: s,
    probabilities,
    counts: counts.map((count, i) => ({
      basis: i.toString(2).padStart(n, '0'),
      count,
      probability: count / shots,
    })),
  };
}

// Exact reduced single-qubit Bloch vector via a full partial trace.
export function blochFromState(s, n = 1, qubit = 0) {
  const mask = 1 << qubit;
  let rho00 = { re: 0, im: 0 };
  let rho01 = { re: 0, im: 0 };
  let rho10 = { re: 0, im: 0 };
  let rho11 = { re: 0, im: 0 };

  for (let i = 0; i < s.length; i++) {
    if ((i & mask) !== 0) continue;
    const j = i | mask;
    const a0 = s[i];
    const a1 = s[j];

    rho00 = cadd(rho00, cmul(a0, cconj(a0)));
    rho01 = cadd(rho01, cmul(a0, cconj(a1)));
    rho10 = cadd(rho10, cmul(a1, cconj(a0)));
    rho11 = cadd(rho11, cmul(a1, cconj(a1)));
  }

  const x = rho01.re + rho10.re;
  const y = rho10.im - rho01.im;
  const z = rho00.re - rho11.re;
  const purity = mag2(rho00) + mag2(rho11) + 2 * mag2(rho01);

  return { x, y, z, purity };
}

export function circuitText(c) {
  return c
    .map((g) => {
      const hasParams = g.params && Object.keys(g.params).length > 0;
      const params = hasParams
        ? `(${Object.values(g.params).map((v) => Number(v).toFixed(2)).join(', ')})`
        : '';
      const target =
        g.target !== undefined
          ? `→q${g.target}`
          : g.targets?.length
            ? `→${g.targets.map((q) => `q${q}`).join(',')}`
            : '';
      return `${g.name}${params}(q${g.qubit}${target ? ` ${target}` : ''})`;
    })
    .join(' → ') || 'empty circuit';
}

const QASM_GATE = {
  I: 'id',
  X: 'x',
  Y: 'y',
  Z: 'z',
  H: 'h',
  S: 's',
  SDG: 'sdg',
  T: 't',
  TDG: 'tdg',
};

export function circuitToQASM(c, n) {
  const lines = [
    'OPENQASM 2.0;',
    'include "qelib1.inc";',
    `qreg q[${n}];`,
    `creg c[${n}];`,
  ];

  const ordered = [...c].sort((a, b) => (a.col ?? 0) - (b.col ?? 0));

  for (const g of ordered) {
    if (g.name === 'M') continue;
    if (g.name === 'BARRIER') {
      lines.push('barrier q;');
      continue;
    }
    if (g.name === 'RESET') {
      lines.push(`reset q[${g.qubit}];`);
      continue;
    }

    const q = `q[${g.qubit}]`;
    const t = g.target !== undefined ? `,q[${g.target}]` : '';

    if (QASM_GATE[g.name]) {
      lines.push(`${QASM_GATE[g.name]} ${q};`);
    } else if (['CX', 'CY', 'CZ', 'CH', 'SWAP'].includes(g.name)) {
      const op = { CX: 'cx', CY: 'cy', CZ: 'cz', CH: 'ch', SWAP: 'swap' }[g.name];
      lines.push(`${op} ${q}${t};`);
    } else if (['RX', 'RY', 'RZ'].includes(g.name)) {
      const key = g.name === 'RX' ? 'theta' : 'theta';
      const op = g.name.toLowerCase();
      lines.push(`${op}(${g.params?.[key] ?? Math.PI / 2}) ${q};`);
    } else if (g.name === 'P') {
      lines.push(`p(${g.params?.phi ?? Math.PI / 2}) ${q};`);
    } else if (g.name === 'CP') {
      lines.push(`cp(${g.params?.phi ?? Math.PI / 2}) ${q}${t};`);
    } else if (g.name === 'CRX') {
      lines.push(`crx(${g.params?.theta ?? Math.PI / 2}) ${q}${t};`);
    } else if (g.name === 'CRY') {
      lines.push(`cry(${g.params?.theta ?? Math.PI / 2}) ${q}${t};`);
    } else if (g.name === 'CRZ') {
      lines.push(`crz(${g.params?.theta ?? Math.PI / 2}) ${q}${t};`);
    } else if (g.name === 'CU') {
      lines.push(`u(${g.params?.theta ?? Math.PI / 2},${g.params?.phi ?? 0},${g.params?.lambda ?? 0}) ${q};`);
      lines.push(`// controlled-U target: ${t}`);
    } else if (['RXX', 'RYY', 'RZZ'].includes(g.name)) {
      lines.push(`// ${g.name}(${g.params?.theta ?? Math.PI / 2}) ${q}${t}`);
    }
  }

  for (let q = 0; q < n; q++) lines.push(`measure q[${q}] -> c[${q}];`);
  return lines.join('\n');
}

export function parseCode(code) {
  const out = [];
  let col = 0;

  for (const raw of code.split(/\n|;/)) {
    const line = raw.trim().toLowerCase();

    let m = line.match(/qc\.(h|x|y|z|s|sdg|t|tdg)\((\d+)\)/);
    if (m) {
      out.push({
        id: crypto.randomUUID(),
        name: m[1].toUpperCase(),
        qubit: +m[2],
        col: col++,
      });
      continue;
    }

    m = line.match(/qc\.(rx|ry|rz|p)\(([^,]+),\s*(\d+)\)/);
    if (m) {
      const name = m[1].toUpperCase();
      const key = name === 'P' ? 'phi' : 'theta';
      out.push({
        id: crypto.randomUUID(),
        name,
        params: { [key]: Number(m[2]) },
        qubit: +m[3],
        col: col++,
      });
      continue;
    }

    m = line.match(/qc\.(cx|cnot|cy|cz|ch|cp|crx|cry|crz|swap)\((\d+)\s*,\s*(\d+)\)/);
    if (m) {
      const aliases = { CNOT: 'CX' };
      const name = aliases[m[1].toUpperCase()] || m[1].toUpperCase();
      out.push({
        id: crypto.randomUUID(),
        name,
        qubit: +m[2],
        target: +m[3],
        col: col++,
      });
      continue;
    }

    m = line.match(/qc\.(measure|measure_all)\(\)/);
    if (m) {
      out.push({ id: crypto.randomUUID(), name: 'M', qubit: 0, col: col++ });
    }
  }

  return out;
}
