// Common circuit → readable source code for each backend.
import { GATES } from './gates.js';

export const BACKENDS = [
  { id: 'qiskit', label: 'Qiskit', lang: 'python', python: true },
  { id: 'cirq', label: 'Cirq', lang: 'python', python: true },
  { id: 'pennylane', label: 'PennyLane', lang: 'python', python: true },
  { id: 'qasm3', label: 'OpenQASM 3', lang: 'qasm', python: false },
];

/* ---------- number formatting ---------- */

// Best rational p/q (q ≤ 16) for x, or null.
function ratio(x) {
  for (let q = 1; q <= 16; q++) {
    const p = Math.round(x * q);
    if (Math.abs(x - p / q) < 1e-9) return [p, q];
  }
  return null;
}

// θ as a multiple of π: "pi/3", "-3*pi/4", "0.612345"
export function fmtAngle(theta) {
  if (Math.abs(theta) < 1e-12) return '0';
  const r = ratio(theta / Math.PI);
  if (!r) return String(+theta.toFixed(6));
  const [p, q] = r;
  const sign = p < 0 ? '-' : '';
  const a = Math.abs(p);
  const num = a === 1 ? 'pi' : `${a}*pi`;
  return q === 1 ? `${sign}${num}` : `${sign}${num}/${q}`;
}

// exponent for Cirq pow-gates: θ/π as a fraction ("1/2", "-1/4", "0.612345")
function fmtExponent(theta) {
  const r = ratio(theta / Math.PI);
  if (!r) return String(+(theta / Math.PI).toFixed(6));
  const [p, q] = r;
  return q === 1 ? String(p) : `${p}/${q}`;
}

const PY_MATH = ['sqrt', 'acos', 'asin', 'atan', 'sin', 'cos', 'tan', 'exp', 'log'];

// Python-flavoured expression for parameter k of op
const pyAngle = (op, k = 0) => (op.pe && op.pe[k] !== undefined ? op.pe[k] : fmtAngle(op.p[k]));

// QASM-flavoured expression (arccos, arcsin, arctan, ln)
const qasmAngle = (op, k = 0) => {
  if (op.pe && op.pe[k] !== undefined) {
    return op.pe[k]
      .replace(/\bacos\(/g, 'arccos(')
      .replace(/\basin\(/g, 'arcsin(')
      .replace(/\batan\(/g, 'arctan(')
      .replace(/\blog\(/g, 'ln(');
  }
  return fmtAngle(op.p[k]);
};

const usedMathNames = (ops) => {
  const found = new Set();
  for (const op of ops) {
    for (const e of op.pe || []) {
      for (const name of PY_MATH) if (new RegExp(`\\b${name}\\(`).test(e)) found.add(name);
    }
  }
  return [...found];
};

const needsPi = (ops) => ops.some((op) => (op.p || []).some((v, k) => {
  const e = op.pe && op.pe[k] !== undefined ? op.pe[k] : fmtAngle(v);
  return /\bpi\b/.test(e);
}));

const mathImport = (ops) => {
  const names = [...(needsPi(ops) ? ['pi'] : []), ...usedMathNames(ops)];
  return names.length ? `from math import ${names.join(', ')}\n` : '';
};

const real = (ops) => ops.filter((o) => o.g !== 'measure' && o.g !== 'barrier');
const hasOracle = (ops) => ops.some((o) => o.g === 'oracle');

/* ---------- OpenQASM 3 ---------- */

export function toQasm3(circuit) {
  const { n, ops } = circuit;
  const lines = ['OPENQASM 3.0;', 'include "stdgates.inc";', '', `qubit[${n}] q;`, ''];
  for (const op of real(ops)) {
    const qs = op.q.map((x) => `q[${x}]`).join(', ');
    if (op.g === 'oracle') lines.push(`oracle ${qs};`);
    else if (GATES[op.g].np) lines.push(`${op.g}(${qasmAngle(op)}) ${qs};`);
    else lines.push(`${op.g} ${qs};`);
  }
  return lines.join('\n') + '\n';
}

/* ---------- Qiskit ---------- */

export function toQiskit(circuit) {
  const { n, ops } = circuit;
  let head = 'from qiskit import QuantumCircuit\n' + mathImport(ops);
  if (hasOracle(ops)) head += 'from qniverse.qiskit import Oracle\n';
  const lines = [head, `qc = QuantumCircuit(${n})`];
  for (const op of real(ops)) {
    if (op.g === 'oracle') {
      lines.push(`qc.append(Oracle(${op.q.length}), [${op.q.join(', ')}])`);
    } else if (GATES[op.g].np) {
      lines.push(`qc.${op.g}(${pyAngle(op)}, ${op.q.join(', ')})`);
    } else {
      lines.push(`qc.${op.g}(${op.q.join(', ')})`);
    }
  }
  return lines.join('\n') + '\n';
}

/* ---------- Cirq ---------- */

function cirqOp(op) {
  const q = op.q.map((x) => `q[${x}]`);
  const a = () => pyAngle(op);
  const ctl = (base) => `${base}(${q[q.length - 1]}).controlled_by(${q.slice(0, -1).join(', ')})`;
  switch (op.g) {
    case 'id': return `cirq.I(${q[0]})`;
    case 'x': return `cirq.X(${q[0]})`;
    case 'y': return `cirq.Y(${q[0]})`;
    case 'z': return `cirq.Z(${q[0]})`;
    case 'h': return `cirq.H(${q[0]})`;
    case 's': return `cirq.S(${q[0]})`;
    case 't': return `cirq.T(${q[0]})`;
    case 'sdg': return `(cirq.S**-1)(${q[0]})`;
    case 'tdg': return `(cirq.T**-1)(${q[0]})`;
    case 'sx': return `(cirq.X**0.5)(${q[0]})`;
    case 'rx': return `cirq.rx(${a()})(${q[0]})`;
    case 'ry': return `cirq.ry(${a()})(${q[0]})`;
    case 'rz': return `cirq.rz(${a()})(${q[0]})`;
    case 'p': return `cirq.ZPowGate(exponent=${fmtExponent(op.p[0])})(${q[0]})`;
    case 'cx': return `cirq.CNOT(${q.join(', ')})`;
    case 'cz': return `cirq.CZ(${q.join(', ')})`;
    case 'cy': return ctl('cirq.Y');
    case 'ch': return ctl('cirq.H');
    case 'cp': return `cirq.CZPowGate(exponent=${fmtExponent(op.p[0])})(${q.join(', ')})`;
    case 'crx': return ctl(`cirq.rx(${a()})`);
    case 'cry': return ctl(`cirq.ry(${a()})`);
    case 'crz': return ctl(`cirq.rz(${a()})`);
    case 'swap': return `cirq.SWAP(${q.join(', ')})`;
    case 'ccx': return `cirq.CCX(${q.join(', ')})`;
    case 'ccz': return `cirq.CCZ(${q.join(', ')})`;
    case 'cswap': return `cirq.CSWAP(${q.join(', ')})`;
    case 'oracle': return `Oracle(${q.length}).on(${q.join(', ')})`;
    default: throw new Error(`No Cirq mapping for ${op.g}`);
  }
}

export function toCirq(circuit) {
  const { n, ops } = circuit;
  let head = 'import cirq\n' + mathImport(ops);
  if (hasOracle(ops)) head += 'from qniverse.cirq import Oracle\n';
  const lines = [head, `q = cirq.LineQubit.range(${n})`, 'circuit = cirq.Circuit()'];
  for (const op of real(ops)) lines.push(`circuit.append(${cirqOp(op)})`);
  return lines.join('\n') + '\n';
}

/* ---------- PennyLane ---------- */

const PL_NAMES = {
  id: 'Identity', x: 'PauliX', y: 'PauliY', z: 'PauliZ', h: 'Hadamard', s: 'S', t: 'T', sx: 'SX',
  rx: 'RX', ry: 'RY', rz: 'RZ', p: 'PhaseShift', cx: 'CNOT', cy: 'CY', cz: 'CZ', ch: 'CH',
  cp: 'ControlledPhaseShift', crx: 'CRX', cry: 'CRY', crz: 'CRZ', swap: 'SWAP', ccx: 'Toffoli',
  ccz: 'CCZ', cswap: 'CSWAP',
};

function plOp(op) {
  const wires = op.q.length === 1 ? String(op.q[0]) : `[${op.q.join(', ')}]`;
  if (op.g === 'oracle') return `Oracle(wires=[${op.q.join(', ')}])`;
  if (op.g === 'sdg') return `qml.adjoint(qml.S)(wires=${wires})`;
  if (op.g === 'tdg') return `qml.adjoint(qml.T)(wires=${wires})`;
  const name = PL_NAMES[op.g];
  if (!name) throw new Error(`No PennyLane mapping for ${op.g}`);
  return GATES[op.g].np ? `qml.${name}(${pyAngle(op)}, wires=${wires})` : `qml.${name}(wires=${wires})`;
}

export function toPennyLane(circuit) {
  const { ops } = circuit;
  let head = 'import pennylane as qml\n' + mathImport(ops);
  if (hasOracle(ops)) head += 'from qniverse.pennylane import Oracle\n';
  const body = real(ops).map((op) => `    ${plOp(op)}`);
  return `${head}\n\ndef circuit():\n${body.length ? body.join('\n') : '    pass'}\n`;
}

export function exportCode(backend, circuit) {
  switch (backend) {
    case 'qiskit': return toQiskit(circuit);
    case 'cirq': return toCirq(circuit);
    case 'pennylane': return toPennyLane(circuit);
    case 'qasm3': return toQasm3(circuit);
    default: throw new Error(`Unknown backend ${backend}`);
  }
}

/* ---------- starter code ---------- */

export function starterCode(problem, backend) {
  const n = problem.n;
  const oracle = problem.grading.oracle;
  const oq = oracle ? oracle.qubits : [];
  const list = oq.join(', ');
  switch (backend) {
    case 'qiskit':
      return (
        'from qiskit import QuantumCircuit\nfrom math import pi\n' +
        (oracle ? 'from qniverse.qiskit import Oracle\n' : '') +
        `\nqc = QuantumCircuit(${n})\n\n# Your code here\n` +
        (oracle ? `# Call the black box once:  qc.append(Oracle(${oq.length}), [${list}])\n` : '')
      );
    case 'cirq':
      return (
        'import cirq\nfrom math import pi\n' +
        (oracle ? 'from qniverse.cirq import Oracle\n' : '') +
        `\nq = cirq.LineQubit.range(${n})\ncircuit = cirq.Circuit()\n\n# Your code here\n` +
        (oracle ? `# Call the black box once:  circuit.append(Oracle(${oq.length}).on(${oq.map((x) => `q[${x}]`).join(', ')}))\n` : '')
      );
    case 'pennylane':
      return (
        'import pennylane as qml\nfrom math import pi\n' +
        (oracle ? 'from qniverse.pennylane import Oracle\n' : '') +
        '\ndef circuit():\n    # Your code here\n' +
        (oracle ? `    # Call the black box once:  Oracle(wires=[${list}])\n` : '') +
        '    pass\n'
      );
    default:
      return (
        `OPENQASM 3.0;\ninclude "stdgates.inc";\n\nqubit[${n}] q;\n\n// Your code here\n` +
        (oracle ? `// Call the black box once:  oracle ${oq.map((x) => `q[${x}]`).join(', ')};\n` : '')
      );
  }
}
