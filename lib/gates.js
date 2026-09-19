// lib/gates.js
// Central registry for Qniverse's Gate Explorer.
// Every gate has one definition used by the palette, inspector and simulator.

const c = (re = 0, im = 0) => ({ re, im });

export const COMPLEX = {
  zero: c(),
  one: c(1),
  minusOne: c(-1),
  i: c(0, 1),
  minusI: c(0, -1),
};

const SQRT2 = Math.sqrt(2);
const INV_SQRT2 = 1 / SQRT2;

const m = (rows) => rows;

const single = (matrix, params = {}) => ({
  matrix: typeof matrix === 'function' ? matrix(params) : matrix,
  qubits: 1,
});

const controlled = (targetMatrix) => {
  // Conventional 4x4 basis ordering: |00>, |01>, |10>, |11>.
  const a = typeof targetMatrix === 'function' ? targetMatrix() : targetMatrix;
  return [
    [c(1), c(), c(), c()],
    [c(), c(1), c(), c()],
    [c(), c(), a[0][0], a[0][1]],
    [c(), c(), a[1][0], a[1][1]],
  ];
};

const fixedControlled = (matrix) => () => controlled(matrix);

const RX = ({ theta = Math.PI / 2 } = {}) => {
  const a = theta / 2;
  return [
    [c(Math.cos(a)), c(0, -Math.sin(a))],
    [c(0, -Math.sin(a)), c(Math.cos(a))],
  ];
};

const RY = ({ theta = Math.PI / 2 } = {}) => {
  const a = theta / 2;
  return [
    [c(Math.cos(a)), c(-Math.sin(a))],
    [c(Math.sin(a)), c(Math.cos(a))],
  ];
};

const RZ = ({ theta = Math.PI / 2 } = {}) => {
  const a = theta / 2;
  return [
    [c(Math.cos(a), -Math.sin(a)), c()],
    [c(), c(Math.cos(a), Math.sin(a))],
  ];
};

const PHASE = ({ phi = Math.PI / 2 } = {}) => [
  [c(1), c()],
  [c(), c(Math.cos(phi), Math.sin(phi))],
];

const U = ({ theta = Math.PI / 2, phi = 0, lambda = 0 } = {}) => {
  const t = theta / 2;
  return [
    [c(Math.cos(t)), c(-Math.sin(t) * Math.cos(lambda), -Math.sin(t) * Math.sin(lambda))],
    [
      c(Math.sin(t) * Math.cos(phi), Math.sin(t) * Math.sin(phi)),
      c(
        Math.sin(t) * Math.cos(phi + lambda),
        Math.sin(t) * Math.sin(phi + lambda)
      ),
    ],
  ];
};

const SWAP = [
  [c(1), c(), c(), c()],
  [c(), c(), c(1), c()],
  [c(), c(1), c(), c()],
  [c(), c(), c(), c(1)],
];

const ISWAP = [
  [c(1), c(), c(), c()],
  [c(), c(), c(0, 1), c()],
  [c(), c(0, 1), c(), c()],
  [c(), c(), c(), c(1)],
];

const SQRT_SWAP = [
  [c(1), c(), c(), c()],
  [c(), c(0.5, 0.5), c(0.5, -0.5), c()],
  [c(), c(0.5, -0.5), c(0.5, 0.5), c()],
  [c(), c(), c(), c(1)],
];

const RXX = ({ theta = Math.PI / 2 } = {}) => {
  const a = theta / 2;
  const co = Math.cos(a);
  const si = Math.sin(a);
  return [
    [c(co), c(), c(), c(0, -si)],
    [c(), c(co), c(0, -si), c()],
    [c(), c(0, -si), c(co), c()],
    [c(0, -si), c(), c(), c(co)],
  ];
};

const RYY = ({ theta = Math.PI / 2 } = {}) => {
  const a = theta / 2;
  const co = Math.cos(a);
  const si = Math.sin(a);
  return [
    [c(co), c(), c(), c(0, si)],
    [c(), c(co), c(0, -si), c()],
    [c(), c(0, -si), c(co), c()],
    [c(0, si), c(), c(), c(co)],
  ];
};

const RZZ = ({ theta = Math.PI / 2 } = {}) => {
  const a = theta / 2;
  return [
    [c(Math.cos(a), -Math.sin(a)), c(), c(), c()],
    [c(), c(Math.cos(a), Math.sin(a)), c(), c()],
    [c(), c(), c(Math.cos(a), Math.sin(a)), c()],
    [c(), c(), c(), c(Math.cos(a), -Math.sin(a))],
  ];
};

const X = [[c(), c(1)], [c(1), c()]];
const Y = [[c(), c(0, -1)], [c(0, 1), c()]];
const Z = [[c(1), c()], [c(), c(-1)]];
const H = [[c(INV_SQRT2), c(INV_SQRT2)], [c(INV_SQRT2), c(-INV_SQRT2)]];
const S = [[c(1), c()], [c(), c(0, 1)]];
const SDG = [[c(1), c()], [c(), c(0, -1)]];
const T = [[c(1), c()], [c(), c(Math.SQRT1_2, Math.SQRT1_2)]];
const TDG = [[c(1), c()], [c(), c(Math.SQRT1_2, -Math.SQRT1_2)]];

export const GATE_LIBRARY = {
  I: {
    id: 'I',
    name: 'Identity',
    symbol: 'I',
    category: 'single',
    description: 'Leaves the quantum state unchanged. It is useful as a timing placeholder and as the identity operator in algebra.',
    matrix: () => [[c(1), c()], [c(), c(1)]],
    equation: 'I|ψ⟩ = |ψ⟩',
    properties: ['Unitary', 'Self-inverse', 'No state change'],
    example: 'I|0⟩ = |0⟩',
    tags: ['identity', 'noop'],
  },
  X: {
    id: 'X',
    name: 'Pauli-X',
    symbol: 'X',
    category: 'single',
    description: 'The quantum analogue of a classical NOT gate. It swaps |0⟩ and |1⟩ and rotates a Bloch vector by π around the X axis.',
    matrix: () => X,
    equation: 'X|0⟩ = |1⟩,  X|1⟩ = |0⟩',
    properties: ['Unitary', 'Self-inverse', 'Bit flip'],
    example: '|0⟩ → X → |1⟩',
    tags: ['pauli', 'not', 'flip'],
  },
  Y: {
    id: 'Y',
    name: 'Pauli-Y',
    symbol: 'Y',
    category: 'single',
    description: 'A π rotation around the Y axis. It flips the computational basis with an additional phase factor.',
    matrix: () => Y,
    equation: 'Y|0⟩ = i|1⟩,  Y|1⟩ = −i|0⟩',
    properties: ['Unitary', 'Self-inverse', 'Bit + phase flip'],
    example: 'Y|0⟩ = i|1⟩',
    tags: ['pauli', 'rotation'],
  },
  Z: {
    id: 'Z',
    name: 'Pauli-Z',
    symbol: 'Z',
    category: 'single',
    description: 'Applies a phase of −1 to |1⟩ while leaving |0⟩ unchanged. It is a π rotation around the Z axis.',
    matrix: () => Z,
    equation: 'Z|0⟩ = |0⟩,  Z|1⟩ = −|1⟩',
    properties: ['Unitary', 'Self-inverse', 'Phase flip'],
    example: 'Z|+⟩ = |−⟩',
    tags: ['pauli', 'phase'],
  },
  H: {
    id: 'H',
    name: 'Hadamard',
    symbol: 'H',
    category: 'single',
    description: 'Creates and recombines equal superpositions. It maps computational basis states to the X-basis states |+⟩ and |−⟩.',
    matrix: () => H,
    equation: 'H|0⟩ = |+⟩,  H|1⟩ = |−⟩',
    properties: ['Unitary', 'Self-inverse', 'Creates superposition'],
    example: 'H|0⟩ = (|0⟩ + |1⟩)/√2',
    tags: ['superposition', 'basis'],
  },
  S: {
    id: 'S',
    name: 'S Phase',
    symbol: 'S',
    category: 'phase',
    description: 'Applies a π/2 phase to the |1⟩ component. S is the square root of Z: S² = Z.',
    matrix: () => S,
    equation: 'S|1⟩ = i|1⟩',
    properties: ['Unitary', 'Phase gate', 'S² = Z'],
    example: 'S|+⟩ = (|0⟩ + i|1⟩)/√2',
    tags: ['phase', 'z rotation'],
  },
  SDG: {
    id: 'SDG',
    name: 'S Dagger',
    symbol: 'S†',
    category: 'phase',
    description: 'The inverse of S. It applies a −π/2 phase to the |1⟩ component.',
    matrix: () => SDG,
    equation: 'S†|1⟩ = −i|1⟩',
    properties: ['Unitary', 'Inverse of S', 'Phase gate'],
    example: 'S†S = I',
    tags: ['phase', 'inverse'],
  },
  T: {
    id: 'T',
    name: 'T Phase',
    symbol: 'T',
    category: 'phase',
    description: 'Applies a π/4 phase to the |1⟩ component. T is important in universal fault-tolerant gate sets.',
    matrix: () => T,
    equation: 'T|1⟩ = e^{iπ/4}|1⟩',
    properties: ['Unitary', 'Phase gate', 'T⁸ = I'],
    example: 'T|+⟩ = (|0⟩ + e^{iπ/4}|1⟩)/√2',
    tags: ['phase', 't gate'],
  },
  TDG: {
    id: 'TDG',
    name: 'T Dagger',
    symbol: 'T†',
    category: 'phase',
    description: 'The inverse of T. It applies a −π/4 phase to the |1⟩ component.',
    matrix: () => TDG,
    equation: 'T†|1⟩ = e^{-iπ/4}|1⟩',
    properties: ['Unitary', 'Inverse of T', 'Phase gate'],
    example: 'T†T = I',
    tags: ['phase', 'inverse'],
  },
  RX: {
    id: 'RX',
    name: 'X Rotation',
    symbol: 'Rx',
    category: 'rotation',
    description: 'Rotates a qubit around the X axis of the Bloch sphere by angle θ.',
    matrix: RX,
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    equation: 'Rx(θ) = exp(−iθX/2)',
    properties: ['Parameterized', 'Unitary', 'X-axis rotation'],
    example: 'Rx(π)|0⟩ = −i|1⟩',
    tags: ['rotation', 'parameterized'],
  },
  RY: {
    id: 'RY',
    name: 'Y Rotation',
    symbol: 'Ry',
    category: 'rotation',
    description: 'Rotates a qubit around the Y axis of the Bloch sphere by angle θ.',
    matrix: RY,
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    equation: 'Ry(θ) = exp(−iθY/2)',
    properties: ['Parameterized', 'Unitary', 'Y-axis rotation'],
    example: 'Ry(π)|0⟩ = |1⟩',
    tags: ['rotation', 'parameterized'],
  },
  RZ: {
    id: 'RZ',
    name: 'Z Rotation',
    symbol: 'Rz',
    category: 'rotation',
    description: 'Rotates a qubit around the Z axis by angle θ. It changes relative phase and therefore becomes visible when interference is created.',
    matrix: RZ,
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    equation: 'Rz(θ) = exp(−iθZ/2)',
    properties: ['Parameterized', 'Unitary', 'Z-axis rotation'],
    example: 'Rz(π)|+⟩ = |−⟩ up to global phase',
    tags: ['rotation', 'phase', 'parameterized'],
  },
  P: {
    id: 'P',
    name: 'Phase',
    symbol: 'P',
    category: 'rotation',
    description: 'Applies a configurable phase φ to the |1⟩ component.',
    matrix: PHASE,
    params: { phi: { label: 'φ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    equation: 'P(φ)|1⟩ = e^{iφ}|1⟩',
    properties: ['Parameterized', 'Unitary', 'Phase rotation'],
    example: 'P(π)|+⟩ = |−⟩',
    tags: ['phase', 'parameterized'],
  },
  U: {
    id: 'U',
    name: 'Universal U Gate',
    symbol: 'U',
    category: 'rotation',
    description: 'A general single-qubit unitary parameterized by θ, φ and λ. It can express any single-qubit unitary up to a global phase.',
    matrix: U,
    params: {
      theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 },
      phi: { label: 'φ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: 0 },
      lambda: { label: 'λ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: 0 },
    },
    equation: 'U(θ,φ,λ) = Rz(φ) Ry(θ) Rz(λ)',
    properties: ['Parameterized', 'Unitary', 'Universal single-qubit form'],
    example: 'Choosing θ=π/2, φ=0, λ=π gives a Hadamard-equivalent operation up to phase',
    tags: ['universal', 'parameterized'],
  },

  CX: {
    id: 'CX',
    name: 'Controlled-X / CNOT',
    symbol: 'CX',
    category: 'controlled',
    qubits: 2,
    matrix: () => controlled(X),
    description: 'Applies X to the target only when the control qubit is |1⟩. It is one of the standard entangling gates.',
    equation: '|10⟩ ↔ |11⟩',
    properties: ['Two-qubit', 'Controlled', 'Entangling'],
    example: 'H(q0) → CX(q0,q1) creates a Bell state from |00⟩',
    tags: ['cnot', 'controlled', 'entanglement'],
  },
  CY: {
    id: 'CY',
    name: 'Controlled-Y',
    symbol: 'CY',
    category: 'controlled',
    qubits: 2,
    matrix: () => controlled(Y),
    description: 'Applies a Pauli-Y operation to the target when the control is |1⟩.',
    equation: 'CY = |0⟩⟨0|⊗I + |1⟩⟨1|⊗Y',
    properties: ['Two-qubit', 'Controlled', 'Entangling'],
    example: 'The target receives a Y rotation only on the control-|1⟩ branch',
    tags: ['controlled'],
  },
  CZ: {
    id: 'CZ',
    name: 'Controlled-Z',
    symbol: 'CZ',
    category: 'controlled',
    qubits: 2,
    matrix: () => controlled(Z),
    description: 'Applies Z to the target when the control is |1⟩. Unlike CNOT, it changes phase rather than swapping computational basis values.',
    equation: 'CZ = diag(1,1,1,−1)',
    properties: ['Two-qubit', 'Controlled', 'Phase interaction'],
    example: 'CZ|++⟩ creates phase correlations',
    tags: ['controlled', 'phase'],
  },
  CH: {
    id: 'CH',
    name: 'Controlled-Hadamard',
    symbol: 'CH',
    category: 'controlled',
    qubits: 2,
    matrix: () => controlled(H),
    description: 'Applies a Hadamard operation to the target only when the control is |1⟩.',
    equation: 'CH = |0⟩⟨0|⊗I + |1⟩⟨1|⊗H',
    properties: ['Two-qubit', 'Controlled'],
    example: 'The target enters a superposition conditionally',
    tags: ['controlled', 'superposition'],
  },
  CP: {
    id: 'CP',
    name: 'Controlled Phase',
    symbol: 'CP',
    category: 'controlled',
    qubits: 2,
    matrix: ({ phi = Math.PI / 2 } = {}) => controlled(PHASE({ phi })),
    params: { phi: { label: 'φ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    description: 'Applies a phase φ only to the |11⟩ component.',
    equation: 'CP(φ)|11⟩ = e^{iφ}|11⟩',
    properties: ['Two-qubit', 'Parameterized', 'Controlled phase'],
    example: 'CP(π) is equivalent to CZ',
    tags: ['controlled', 'phase', 'parameterized'],
  },
  CRX: {
    id: 'CRX',
    name: 'Controlled-Rx',
    symbol: 'CRx',
    category: 'controlled',
    qubits: 2,
    matrix: ({ theta = Math.PI / 2 } = {}) => controlled(RX({ theta })),
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    description: 'Applies Rx(θ) to the target conditioned on the control qubit being |1⟩.',
    equation: 'CRx(θ) = |0⟩⟨0|⊗I + |1⟩⟨1|⊗Rx(θ)',
    properties: ['Two-qubit', 'Parameterized', 'Controlled rotation'],
    example: 'Control decides whether the target rotates',
    tags: ['controlled', 'rotation'],
  },
  CRY: {
    id: 'CRY',
    name: 'Controlled-Ry',
    symbol: 'CRy',
    category: 'controlled',
    qubits: 2,
    matrix: ({ theta = Math.PI / 2 } = {}) => controlled(RY({ theta })),
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    description: 'Applies Ry(θ) to the target conditioned on the control.',
    equation: 'CRy(θ) = |0⟩⟨0|⊗I + |1⟩⟨1|⊗Ry(θ)',
    properties: ['Two-qubit', 'Parameterized', 'Controlled rotation'],
    example: 'A conditional rotation around Y',
    tags: ['controlled', 'rotation'],
  },
  CRZ: {
    id: 'CRZ',
    name: 'Controlled-Rz',
    symbol: 'CRz',
    category: 'controlled',
    qubits: 2,
    matrix: ({ theta = Math.PI / 2 } = {}) => controlled(RZ({ theta })),
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    description: 'Applies Rz(θ) to the target conditioned on the control.',
    equation: 'CRz(θ) = |0⟩⟨0|⊗I + |1⟩⟨1|⊗Rz(θ)',
    properties: ['Two-qubit', 'Parameterized', 'Controlled rotation'],
    example: 'A conditional phase rotation',
    tags: ['controlled', 'rotation'],
  },
  CU: {
    id: 'CU',
    name: 'Controlled-U',
    symbol: 'CU',
    category: 'controlled',
    qubits: 2,
    matrix: ({ theta = Math.PI / 2, phi = 0, lambda = 0 } = {}) =>
      controlled(U({ theta, phi, lambda })),
    params: {
      theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 },
      phi: { label: 'φ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: 0 },
      lambda: { label: 'λ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: 0 },
    },
    description: 'Applies the general single-qubit U operation to a target only when the control is |1⟩.',
    equation: 'CU = |0⟩⟨0|⊗I + |1⟩⟨1|⊗U(θ,φ,λ)',
    properties: ['Two-qubit', 'Parameterized', 'Controlled universal gate'],
    example: 'Use CU to make a conditional arbitrary single-qubit rotation',
    tags: ['controlled', 'universal', 'parameterized'],
  },
  SWAP: {
    id: 'SWAP',
    name: 'SWAP',
    symbol: 'SWAP',
    category: 'two',
    qubits: 2,
    matrix: () => SWAP,
    description: 'Exchanges the quantum states of two qubits. It can be decomposed into three CNOT gates.',
    equation: 'SWAP|a,b⟩ = |b,a⟩',
    properties: ['Two-qubit', 'Reversible', '3-CNOT decomposition'],
    example: 'SWAP|01⟩ = |10⟩',
    tags: ['swap', 'two qubit'],
  },
  ISWAP: {
    id: 'ISWAP',
    name: 'iSWAP',
    symbol: 'iSWAP',
    category: 'two',
    qubits: 2,
    matrix: () => ISWAP,
    description: 'Exchanges |01⟩ and |10⟩ with a phase i. It appears naturally in some hardware-native gate sets.',
    equation: 'iSWAP|01⟩ = i|10⟩',
    properties: ['Two-qubit', 'Entangling-capable', 'Phase exchange'],
    example: 'iSWAP moves an excitation while adding phase',
    tags: ['swap', 'phase'],
  },
  SQRTSWAP: {
    id: 'SQRTSWAP',
    name: 'Square-root SWAP',
    symbol: '√SWAP',
    category: 'two',
    qubits: 2,
    matrix: () => SQRT_SWAP,
    description: 'Performs half of a SWAP evolution. Applying √SWAP twice gives SWAP.',
    equation: '√SWAP · √SWAP = SWAP',
    properties: ['Two-qubit', 'Fractional exchange'],
    example: '√SWAP² = SWAP',
    tags: ['swap', 'two qubit'],
  },
  RXX: {
    id: 'RXX',
    name: 'XX Rotation',
    symbol: 'Rxx',
    category: 'two',
    qubits: 2,
    matrix: RXX,
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    description: 'A two-qubit rotation generated by X⊗X. It is useful for expressing hardware-efficient entangling interactions.',
    equation: 'Rxx(θ) = exp(−iθ X⊗X / 2)',
    properties: ['Two-qubit', 'Parameterized', 'Entangling rotation'],
    example: 'Rxx(π/2) creates a structured two-qubit interaction',
    tags: ['rotation', 'two qubit', 'entangling'],
  },
  RYY: {
    id: 'RYY',
    name: 'YY Rotation',
    symbol: 'Ryy',
    category: 'two',
    qubits: 2,
    matrix: RYY,
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    description: 'A two-qubit rotation generated by Y⊗Y.',
    equation: 'Ryy(θ) = exp(−iθ Y⊗Y / 2)',
    properties: ['Two-qubit', 'Parameterized', 'Entangling rotation'],
    example: 'Ryy(π/2) couples the two qubits',
    tags: ['rotation', 'two qubit', 'entangling'],
  },
  RZZ: {
    id: 'RZZ',
    name: 'ZZ Rotation',
    symbol: 'Rzz',
    category: 'two',
    qubits: 2,
    matrix: RZZ,
    params: { theta: { label: 'θ', min: -Math.PI, max: Math.PI, step: Math.PI / 16, value: Math.PI / 2 } },
    description: 'A two-qubit phase interaction generated by Z⊗Z.',
    equation: 'Rzz(θ) = exp(−iθ Z⊗Z / 2)',
    properties: ['Two-qubit', 'Parameterized', 'Phase interaction'],
    example: 'Rzz changes the relative phase between even and odd parity states',
    tags: ['rotation', 'two qubit', 'phase'],
  },
  CCX: {
    id: 'CCX',
    name: 'Toffoli / CCX',
    symbol: 'CCX',
    category: 'multi',
    qubits: 3,
    matrix: () => {
      const out = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, () => c()));
      for (let i = 0; i < 8; i++) {
        const controls = (i & 4) && (i & 2);
        const j = controls ? (i ^ 1) : i;
        out[j][i] = c(1);
      }
      return out;
    },
    description: 'Flips the target when both control qubits are |1⟩. It is a universal reversible classical gate and a standard multi-qubit quantum gate.',
    equation: 'CCX|110⟩ = |111⟩',
    properties: ['Three-qubit', 'Double-controlled', 'Reversible'],
    example: '|110⟩ → CCX → |111⟩',
    tags: ['toffoli', 'multi qubit', 'controlled'],
  },
  CSWAP: {
    id: 'CSWAP',
    name: 'Fredkin / CSWAP',
    symbol: 'CSWAP',
    category: 'multi',
    qubits: 3,
    matrix: () => {
      const out = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, () => c()));
      for (let i = 0; i < 8; i++) {
        const control = (i & 4) !== 0;
        const a = (i & 2) !== 0;
        const b = (i & 1) !== 0;
        let j = i;
        if (control && a !== b) j = i ^ 3;
        out[j][i] = c(1);
      }
      return out;
    },
    description: 'Swaps two target qubits only when the control is |1⟩.',
    equation: 'CSWAP|1ab⟩ = |1ba⟩',
    properties: ['Three-qubit', 'Controlled SWAP', 'Reversible'],
    example: 'The control chooses whether the two targets exchange states',
    tags: ['fredkin', 'multi qubit'],
  },
  M: {
    id: 'M',
    name: 'Measurement',
    symbol: 'M',
    category: 'measurement',
    qubits: 1,
    nonUnitary: true,
    description: 'Measures a qubit in the computational basis. Measurement is not a unitary matrix operation; it converts a quantum state into a classical outcome.',
    matrix: null,
    equation: 'P(0)=|α|²,  P(1)=|β|² for |ψ⟩=α|0⟩+β|1⟩',
    properties: ['Non-unitary', 'Produces classical information', 'Probabilistic'],
    example: '|+⟩ measured in Z gives 0 or 1 with equal probability',
    tags: ['measurement', 'readout'],
  },
  RESET: {
    id: 'RESET',
    name: 'Reset',
    symbol: 'R',
    category: 'measurement',
    qubits: 1,
    nonUnitary: true,
    description: 'Resets a qubit to |0⟩. It is not reversible and therefore is not represented by a unitary gate matrix.',
    matrix: null,
    equation: '|0⟩ ← RESET|ψ⟩',
    properties: ['Non-unitary', 'Irreversible', 'State preparation'],
    example: 'RESET|1⟩ → |0⟩',
    tags: ['reset', 'state preparation'],
  },
  BARRIER: {
    id: 'BARRIER',
    name: 'Barrier',
    symbol: '│',
    category: 'circuit',
    qubits: 1,
    nonUnitary: true,
    description: 'A circuit-structure marker. It does not change the quantum state; it prevents a compiler or optimizer from freely moving operations across the barrier.',
    matrix: null,
    equation: 'Barrier|ψ⟩ = |ψ⟩',
    properties: ['Circuit marker', 'No state change'],
    example: 'Use it to separate logical stages of an algorithm',
    tags: ['barrier', 'circuit'],
  },
};

export const GATE_GROUPS = [
  { id: 'single', label: 'Single Qubit', gates: ['I', 'X', 'Y', 'Z', 'H'] },
  { id: 'phase', label: 'Phase', gates: ['S', 'SDG', 'T', 'TDG'] },
  { id: 'rotation', label: 'Rotations', gates: ['RX', 'RY', 'RZ', 'P', 'U'] },
  { id: 'controlled', label: 'Controlled', gates: ['CX', 'CY', 'CZ', 'CH', 'CP', 'CRX', 'CRY', 'CRZ', 'CU'] },
  { id: 'two', label: 'Two Qubit', gates: ['SWAP', 'ISWAP', 'SQRTSWAP', 'RXX', 'RYY', 'RZZ'] },
  { id: 'multi', label: 'Multi Qubit', gates: ['CCX', 'CSWAP'] },
  { id: 'measurement', label: 'Measurement', gates: ['M', 'RESET'] },
  { id: 'circuit', label: 'Circuit', gates: ['BARRIER'] },
];

export function defaultParams(id) {
  const gate = GATE_LIBRARY[id];
  if (!gate?.params) return {};
  return Object.fromEntries(
    Object.entries(gate.params).map(([key, spec]) => [key, spec.value])
  );
}

export function gateMatrix(id, params = {}) {
  const gate = GATE_LIBRARY[id];
  if (!gate || !gate.matrix) return null;
  return gate.matrix(params);
}

export function gateSummary(id) {
  const g = GATE_LIBRARY[id];
  if (!g) return null;
  return {
    ...g,
    resolvedMatrix: gateMatrix(id, defaultParams(id)),
  };
}

export function formatAngle(value) {
  const ratio = value / Math.PI;
  const known = [
    [0, '0'],
    [1, 'π'],
    [-1, '−π'],
    [0.5, 'π/2'],
    [-0.5, '−π/2'],
    [0.25, 'π/4'],
    [-0.25, '−π/4'],
    [0.125, 'π/8'],
    [-0.125, '−π/8'],
  ];
  const match = known.find(([x]) => Math.abs(ratio - x) < 1e-8);
  return match ? match[1] : `${value.toFixed(2)} rad`;
}
