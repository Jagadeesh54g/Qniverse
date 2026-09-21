// Gate table shared by the simulator, the OpenQASM parser, the exporters and the circuit builder.
//   n     – number of qubits the gate acts on
//   np    – number of numeric parameters
//   base  – the single-qubit matrix (or 'swap') that is applied to the target(s)
//   c     – number of leading control qubits
export const GATES = {
  id:    { n: 1, np: 0, base: 'id',   c: 0, label: 'I' },
  x:     { n: 1, np: 0, base: 'x',    c: 0, label: 'X' },
  y:     { n: 1, np: 0, base: 'y',    c: 0, label: 'Y' },
  z:     { n: 1, np: 0, base: 'z',    c: 0, label: 'Z' },
  h:     { n: 1, np: 0, base: 'h',    c: 0, label: 'H' },
  s:     { n: 1, np: 0, base: 's',    c: 0, label: 'S' },
  sdg:   { n: 1, np: 0, base: 'sdg',  c: 0, label: 'S†' },
  t:     { n: 1, np: 0, base: 't',    c: 0, label: 'T' },
  tdg:   { n: 1, np: 0, base: 'tdg',  c: 0, label: 'T†' },
  sx:    { n: 1, np: 0, base: 'sx',   c: 0, label: '√X' },
  rx:    { n: 1, np: 1, base: 'rx',   c: 0, label: 'Rx' },
  ry:    { n: 1, np: 1, base: 'ry',   c: 0, label: 'Ry' },
  rz:    { n: 1, np: 1, base: 'rz',   c: 0, label: 'Rz' },
  p:     { n: 1, np: 1, base: 'p',    c: 0, label: 'P' },
  cx:    { n: 2, np: 0, base: 'x',    c: 1, label: 'X' },
  cy:    { n: 2, np: 0, base: 'y',    c: 1, label: 'Y' },
  cz:    { n: 2, np: 0, base: 'z',    c: 1, label: 'Z' },
  ch:    { n: 2, np: 0, base: 'h',    c: 1, label: 'H' },
  cp:    { n: 2, np: 1, base: 'p',    c: 1, label: 'P' },
  crx:   { n: 2, np: 1, base: 'rx',   c: 1, label: 'Rx' },
  cry:   { n: 2, np: 1, base: 'ry',   c: 1, label: 'Ry' },
  crz:   { n: 2, np: 1, base: 'rz',   c: 1, label: 'Rz' },
  swap:  { n: 2, np: 0, base: 'swap', c: 0, label: '×' },
  ccx:   { n: 3, np: 0, base: 'x',    c: 2, label: 'X' },
  ccz:   { n: 3, np: 0, base: 'z',    c: 2, label: 'Z' },
  cswap: { n: 3, np: 0, base: 'swap', c: 1, label: '×' },
};

export const ALIASES = {
  cnot: 'cx', toffoli: 'ccx', fredkin: 'cswap', cphase: 'cp', u1: 'p', i: 'id', cu1: 'cp',
};

// Not gates: handled specially by the grader.
export const SPECIAL = new Set(['measure', 'barrier', 'oracle']);

export const resolveGateName = (name) => {
  const k = String(name).toLowerCase();
  return GATES[k] ? k : ALIASES[k] || null;
};

const R = Math.SQRT1_2;

// Returns [re,im] ×4 for a 2×2 matrix in row-major order.
export function mat1(base, p = 0) {
  const c = Math.cos(p / 2);
  const s = Math.sin(p / 2);
  switch (base) {
    case 'id':  return [1, 0, 0, 0, 0, 0, 1, 0];
    case 'x':   return [0, 0, 1, 0, 1, 0, 0, 0];
    case 'y':   return [0, 0, 0, -1, 0, 1, 0, 0];
    case 'z':   return [1, 0, 0, 0, 0, 0, -1, 0];
    case 'h':   return [R, 0, R, 0, R, 0, -R, 0];
    case 's':   return [1, 0, 0, 0, 0, 0, 0, 1];
    case 'sdg': return [1, 0, 0, 0, 0, 0, 0, -1];
    case 't':   return [1, 0, 0, 0, 0, 0, R, R];
    case 'tdg': return [1, 0, 0, 0, 0, 0, R, -R];
    case 'sx':  return [0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5];
    case 'rx':  return [c, 0, 0, -s, 0, -s, c, 0];
    case 'ry':  return [c, 0, -s, 0, s, 0, c, 0];
    case 'rz':  return [c, -s, 0, 0, 0, 0, c, s];
    case 'p':   return [1, 0, 0, 0, 0, 0, Math.cos(p), Math.sin(p)];
    default: throw new Error(`Unknown base gate ${base}`);
  }
}
