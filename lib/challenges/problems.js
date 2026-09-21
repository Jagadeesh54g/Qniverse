// The 20 Qniverse challenges.
//
// Conventions used in every problem:
//   • qubits start in |0⟩; bitstrings are written q0 q1 q2 … (left → right)
//   • measurement is exact — the grader reads the final probabilities
//   • `reference` is the optimised solution; code for every backend is generated from it
import { evalExpr } from './qasm.js';

/* ---------- tiny DSL for writing circuits ---------- */
const one = (g) => (q) => ({ g, q: [q] });
const H = one('h'), X = one('x'), Y = one('y'), Z = one('z'), S = one('s'), T = one('t');
const CX = (c, t) => ({ g: 'cx', q: [c, t] });
const CZ = (a, b) => ({ g: 'cz', q: [a, b] });
const CCX = (a, b, c) => ({ g: 'ccx', q: [a, b, c] });
const CCZ = (a, b, c) => ({ g: 'ccz', q: [a, b, c] });
const SWAP = (a, b) => ({ g: 'swap', q: [a, b] });
const rot = (g) => (pe, q) => ({ g, q: [q], p: [evalExpr(pe)], pe: [pe] });
const RY = rot('ry'), RZ = rot('rz');
const CRY = (pe, c, t) => ({ g: 'cry', q: [c, t], p: [evalExpr(pe)], pe: [pe] });
const CP = (pe, c, t) => ({ g: 'cp', q: [c, t], p: [evalExpr(pe)], pe: [pe] });
export const ORACLE = (...qs) => ({ g: 'oracle', q: qs });

const R = Math.SQRT1_2;
const bell = [H(2), CX(2, 3)]; // shared entangled pair, prepared for you

// phase oracle that flips the sign of one basis state (Grover)
const markState = (bits) => {
  const flips = [...bits].map((b, i) => (b === '0' ? X(i) : null)).filter(Boolean);
  return { ops: [...flips, CCZ(0, 1, 2), ...flips] };
};
// bit-oracle |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩ from a list of ops on local qubits
const bitOracle = (ops) => ({ ops });

/* ---------- QFT reference (used for target + solution) ---------- */
const QFT3 = [H(0), CP('pi/2', 1, 0), CP('pi/4', 2, 0), H(1), CP('pi/2', 2, 1), H(2), SWAP(0, 2)];

const ALL_TOPICS = [
  'Single-qubit gates', 'Measurement', 'Entanglement', 'Gate identities', 'State preparation',
  'Phase', 'Communication', 'Oracle algorithms', 'Search', 'Transforms', 'Error correction',
];

const PROBLEMS = [
  /* ================= EASY ================= */
  {
    slug: 'flip-the-qubit',
    title: 'Flip the Qubit',
    difficulty: 'Easy',
    topics: ['Single-qubit gates'],
    n: 1,
    description: [
      'One qubit starts in the state `|0⟩`. Turn it into `|1⟩`.',
      'This is the quantum NOT — usually the very first gate anyone learns.',
    ],
    examples: [{ input: '|0⟩', output: '|1⟩', note: 'Measuring afterwards gives 1 every time.' }],
    constraints: ['1 qubit', 'Any gates are allowed'],
    hints: [
      'Among the Pauli gates X, Y and Z, which one swaps the labels |0⟩ and |1⟩?',
      'The X gate is the quantum NOT: it maps |0⟩ to |1⟩ and |1⟩ to |0⟩.',
    ],
    grading: { cases: [{ name: 'Start from |0⟩', checks: [{ type: 'state', amps: { 1: 1 } }] }] },
    reference: {
      ops: [X(0)],
      notes: ['The state changes, so at least one gate is unavoidable — one is enough.'],
    },
    explanation: [
      'The X gate is the matrix [[0, 1], [1, 0]]. It swaps the two amplitudes, so X|0⟩ = |1⟩.',
    ],
  },
  {
    slug: 'make-a-superposition',
    title: 'Make a Superposition',
    difficulty: 'Easy',
    topics: ['Single-qubit gates'],
    n: 1,
    description: [
      'Prepare the state `|+⟩ = (|0⟩ + |1⟩) / √2` on one qubit.',
      'A measurement of this state returns 0 or 1 with equal probability — but unlike a coin flip, the two amplitudes can still interfere later.',
    ],
    examples: [{ input: '|0⟩', output: '(|0⟩ + |1⟩)/√2', note: 'P(0) = P(1) = 50%.' }],
    constraints: ['1 qubit', 'Any gates are allowed'],
    hints: ['One gate creates an equal superposition from |0⟩. It is named after Hadamard.'],
    grading: { cases: [{ name: 'Start from |0⟩', checks: [{ type: 'state', amps: { 0: R, 1: R } }] }] },
    reference: { ops: [H(0)], notes: ['A single Hadamard is the minimum.'] },
    explanation: [
      'H = (1/√2)[[1, 1], [1, −1]]. Applied to |0⟩ it gives (|0⟩ + |1⟩)/√2, the |+⟩ state.',
    ],
  },
  {
    slug: 'prepare-minus',
    title: 'Prepare |−⟩',
    difficulty: 'Easy',
    topics: ['Single-qubit gates', 'Phase'],
    n: 1,
    description: [
      'Prepare `|−⟩ = (|0⟩ − |1⟩) / √2`.',
      '|−⟩ has exactly the same measurement probabilities as |+⟩. The difference is a minus sign — a relative phase — which is invisible until you interfere the amplitudes.',
    ],
    examples: [{ input: '|0⟩', output: '(|0⟩ − |1⟩)/√2' }],
    constraints: ['1 qubit', 'Any gates are allowed', 'Global phase is ignored; relative phase is not'],
    hints: [
      'Start from |+⟩ and flip the sign of the |1⟩ amplitude — which Pauli gate does that?',
      'Or flip first, then superpose: what does H do to |1⟩?',
      'Bonus: can you do it in a single gate? Ry(θ)|0⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩.',
    ],
    grading: { cases: [{ name: 'Start from |0⟩', checks: [{ type: 'state', amps: { 0: R, 1: -R } }] }] },
    reference: {
      ops: [RY('-pi/2', 0)],
      notes: [
        'Textbook routes use two gates: H then Z, or X then H.',
        'A rotation gets there in one: Ry(−π/2) sends |0⟩ to cos(−π/4)|0⟩ + sin(−π/4)|1⟩ = |−⟩.',
      ],
    },
    explanation: [
      'Z leaves |0⟩ alone and negates |1⟩, so Z|+⟩ = |−⟩. Equivalently H|1⟩ = |−⟩.',
      'Because the amplitudes are real, a single Y-axis rotation by −π/2 lands on the same state.',
    ],
  },
  {
    slug: 'measure-in-the-x-basis',
    title: 'Measure in the X Basis',
    difficulty: 'Easy',
    topics: ['Measurement'],
    n: 1,
    description: [
      'A qubit arrives in either `|+⟩` or `|−⟩`, but a standard measurement cannot tell them apart — both give 0 or 1 at random.',
      'Add a gate so that measuring in the ordinary Z basis returns **0 for |+⟩ and 1 for |−⟩**, every time.',
      'The grader prepares the incoming qubit for you; your circuit only contains the gates that come after.',
    ],
    examples: [
      { input: '|+⟩', output: '0 with probability 1' },
      { input: '|−⟩', output: '1 with probability 1' },
    ],
    constraints: ['1 qubit', 'The incoming state is prepared by the grader'],
    hints: ['You need a gate that turns the X basis into the Z basis.', 'Hadamard swaps the two bases.'],
    grading: {
      cases: [
        { name: 'Incoming |+⟩', prefix: [H(0)], checks: [{ type: 'probs', qubits: [0], dist: { 0: 1 } }] },
        { name: 'Incoming |−⟩', prefix: [X(0), H(0)], checks: [{ type: 'probs', qubits: [0], dist: { 1: 1 } }] },
        { name: 'Incoming |0⟩', visible: false, checks: [{ type: 'probs', qubits: [0], dist: { 0: 0.5, 1: 0.5 } }] },
        { name: 'Incoming |1⟩', visible: false, prefix: [X(0)], checks: [{ type: 'probs', qubits: [0], dist: { 0: 0.5, 1: 0.5 } }] },
      ],
    },
    reference: { ops: [H(0)], notes: ['H is its own inverse, so it maps |+⟩ → |0⟩ and |−⟩ → |1⟩.'] },
    explanation: [
      'Measuring in the X basis means asking "is it |+⟩ or |−⟩?". Since H|+⟩ = |0⟩ and H|−⟩ = |1⟩, applying H and then measuring normally answers exactly that question.',
    ],
  },
  {
    slug: 'bell-state-phi-plus',
    title: 'Bell State Φ⁺',
    difficulty: 'Easy',
    topics: ['Entanglement'],
    n: 2,
    description: [
      'Entangle two qubits into the Bell state `|Φ⁺⟩ = (|00⟩ + |11⟩) / √2`.',
      'Measuring either qubit gives a random bit, but the two results always agree.',
    ],
    examples: [{ input: '|00⟩', output: '(|00⟩ + |11⟩)/√2', note: 'P(00) = P(11) = 50%, P(01) = P(10) = 0.' }],
    constraints: ['2 qubits', 'Any gates are allowed'],
    hints: [
      'Put one qubit in superposition first.',
      'Then use it as the control of a CNOT on the other qubit.',
    ],
    grading: { cases: [{ name: 'Start from |00⟩', checks: [{ type: 'state', amps: { '00': R, 11: R } }] }] },
    reference: { ops: [H(0), CX(0, 1)], notes: ['Two gates is the minimum: one to create superposition, one to entangle.'] },
    explanation: [
      'H on q0 gives (|0⟩ + |1⟩)/√2 ⊗ |0⟩. The CNOT flips q1 only in the branch where q0 = 1, producing (|00⟩ + |11⟩)/√2.',
    ],
  },
  {
    slug: 'swap-with-cnots',
    title: 'Swap with CNOTs',
    difficulty: 'Easy',
    topics: ['Gate identities'],
    n: 2,
    description: [
      'Swap the states of two qubits using **only CNOT gates** (no SWAP gate).',
      'Your circuit must behave like SWAP for every input, including superpositions and entangled states.',
    ],
    examples: [{ input: '|10⟩', output: '|01⟩' }],
    constraints: ['2 qubits', 'Only CX is allowed'],
    hints: [
      'A CNOT(a→b) computes b ← a ⊕ b. Try three of them, alternating direction.',
      'XOR-swap: a ← a⊕b, b ← a⊕b, a ← a⊕b.',
    ],
    grading: {
      rules: { allowed: ['cx'] },
      cases: [
        { name: 'Input |10⟩', prefix: [X(0)], checks: [{ type: 'state', ops: [X(0), SWAP(0, 1)] }] },
        { name: 'Whole operation', visible: false, checks: [{ type: 'unitary', ops: [SWAP(0, 1)] }] },
      ],
    },
    reference: { ops: [CX(0, 1), CX(1, 0), CX(0, 1)], notes: ['Three CNOTs is the classical XOR-swap; two are not enough.'] },
    explanation: [
      'CX(0→1) makes q1 = a⊕b. CX(1→0) makes q0 = a⊕(a⊕b) = b. CX(0→1) makes q1 = (a⊕b)⊕b = a. The two values have traded places.',
    ],
  },
  {
    slug: 'controlled-z-from-cnot',
    title: 'Controlled-Z from CNOT',
    difficulty: 'Easy',
    topics: ['Gate identities', 'Phase'],
    n: 2,
    description: [
      'Build a controlled-Z (CZ) using only **H and CNOT** gates.',
      'CZ flips the sign of the |11⟩ amplitude and leaves everything else alone.',
    ],
    examples: [{ input: '(|00⟩+|01⟩+|10⟩+|11⟩)/2', output: '(|00⟩+|01⟩+|10⟩−|11⟩)/2' }],
    constraints: ['2 qubits', 'Only H and CX are allowed'],
    hints: [
      'Z = H X H. Conjugating a gate by H on the target changes its type.',
      'A CNOT is an X controlled by q0 — surround the target with Hadamards.',
    ],
    grading: {
      rules: { allowed: ['h', 'cx'] },
      cases: [
        { name: 'Input |++⟩', prefix: [H(0), H(1)], checks: [{ type: 'state', ops: [H(0), H(1), CZ(0, 1)] }] },
        { name: 'Whole operation', visible: false, checks: [{ type: 'unitary', ops: [CZ(0, 1)] }] },
      ],
    },
    reference: { ops: [H(1), CX(0, 1), H(1)], notes: ['Three gates; the two H gates turn the X of the CNOT into a Z.'] },
    explanation: [
      'HXH = Z. Wrapping the target of a CNOT in Hadamards therefore turns "controlled-X" into "controlled-Z".',
    ],
  },

  /* ================= MEDIUM ================= */
  {
    slug: 'bell-state-psi-minus',
    title: 'Bell State Ψ⁻',
    difficulty: 'Medium',
    topics: ['Entanglement', 'Phase'],
    n: 2,
    description: [
      'Prepare the singlet state `|Ψ⁻⟩ = (|01⟩ − |10⟩) / √2`.',
      'Compared with Φ⁺ the two branches are different *and* carry opposite signs, so both bit values and a phase must be right.',
    ],
    examples: [{ input: '|00⟩', output: '(|01⟩ − |10⟩)/√2', note: 'P(01) = P(10) = 50%, but the relative sign matters.' }],
    constraints: ['2 qubits', 'Any gates are allowed', 'Global phase is ignored'],
    hints: [
      'Start from the Φ⁺ recipe, then fix the bit pattern with an X and the sign with a Z.',
      'That is four gates. One Pauli gate does both fixes at once — which one is "X and Z together"?',
    ],
    grading: {
      cases: [{ name: 'Start from |00⟩', checks: [{ type: 'state', amps: { '01': R, 10: -R } }] }],
    },
    reference: {
      ops: [H(0), CX(0, 1), Y(0)],
      notes: [
        'Three gates, and an exhaustive search over H, X, Y, Z, S, T, Ry(±π/2, π), CX, CZ and SWAP finds nothing shorter.',
        'The obvious route (Φ⁺, then Z, then X) takes four gates; Y = iXZ does both fixes at once.',
      ],
    },
    explanation: [
      'H and CX build Φ⁺ = (|00⟩ + |11⟩)/√2. Applying Y to qubit 0 maps |0⟩ → i|1⟩ and |1⟩ → −i|0⟩, giving (i|10⟩ − i|01⟩)/√2 = −i(|01⟩ − |10⟩)/√2 — the singlet, up to a global phase that no measurement can detect.',
      'The longer route uses Z and X separately: Z flips the sign of the |11⟩ branch, X moves the bits from 00/11 to 01/10. Y is exactly "X and Z at once" (Y = iXZ).',
    ],
  },
  {
    slug: 'ghz-state',
    title: 'GHZ State',
    difficulty: 'Medium',
    topics: ['Entanglement'],
    n: 3,
    description: [
      'Prepare the three-qubit GHZ state `(|000⟩ + |111⟩) / √2`.',
      'All three qubits are perfectly correlated: they are either all 0 or all 1.',
    ],
    examples: [{ input: '|000⟩', output: '(|000⟩ + |111⟩)/√2' }],
    constraints: ['3 qubits', 'Any gates are allowed'],
    hints: ['Extend the Bell-pair recipe: one Hadamard, then spread the correlation with CNOTs.'],
    grading: { cases: [{ name: 'Start from |000⟩', checks: [{ type: 'state', amps: { '000': R, 111: R } }] }] },
    reference: { ops: [H(0), CX(0, 1), CX(1, 2)], notes: ['Three gates: one H plus two CNOTs — every extra qubit needs at least one two-qubit gate.'] },
    explanation: [
      'After H and CX(0→1) you have a Bell pair on q0 and q1. CX(1→2) copies q1 onto q2, giving (|000⟩ + |111⟩)/√2.',
    ],
  },
  {
    slug: 'prepare-a-given-amplitude',
    title: 'Prepare a Given Amplitude',
    difficulty: 'Medium',
    topics: ['State preparation'],
    n: 1,
    description: [
      'Prepare the state `(√3/2)|0⟩ + (1/2)|1⟩` — real, positive amplitudes with P(1) = 25%.',
      'Rotation gates take an angle. Pay attention to the axis and to the half-angle in their definition.',
    ],
    examples: [{ input: '|0⟩', output: '(√3/2)|0⟩ + (1/2)|1⟩' }],
    constraints: ['1 qubit', 'Relative phase matters: the |1⟩ amplitude must be real'],
    hints: [
      'Ry(θ)|0⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩. What θ gives cos(θ/2) = √3/2?',
      'Rx would put an imaginary amplitude on |1⟩ — that is the wrong phase.',
      'cos(π/6) = √3/2 and sin(π/6) = 1/2.',
    ],
    grading: {
      cases: [{ name: 'Start from |0⟩', checks: [{ type: 'state', amps: { 0: Math.sqrt(3) / 2, 1: 0.5 } }] }],
    },
    reference: { ops: [RY('pi/3', 0)], notes: ['One rotation. The angle is π/3 because rotations act with half-angles: cos(π/6) = √3/2.'] },
    explanation: [
      'Ry(θ) rotates the Bloch vector about the Y axis by θ, but the amplitudes contain θ/2. Setting θ = π/3 gives cos(π/6)|0⟩ + sin(π/6)|1⟩ = (√3/2)|0⟩ + (1/2)|1⟩.',
    ],
  },
  {
    slug: 'phase-kickback',
    title: 'Phase Kickback',
    difficulty: 'Medium',
    topics: ['Phase'],
    n: 2,
    description: [
      'Qubit 1 arrives in the state `|−⟩` (prepared for you). Qubit 0 arrives in a state you cannot see.',
      'Apply a **Z gate to qubit 0** — but without using any phase gates. You may only use H, X, Y, and CNOT-style gates, and your circuit **must contain a CNOT**.',
      'This is the trick behind almost every oracle algorithm: a controlled operation on an eigenstate "kicks" its eigenvalue back onto the control.',
    ],
    examples: [{ input: 'q0 = |+⟩, q1 = |−⟩', output: 'q0 = |−⟩, q1 = |−⟩' }],
    constraints: [
      '2 qubits',
      'Forbidden gates: Z, S, S†, T, T†, Rz, P, CZ, CP, CRz, CCZ',
      'Must use at least one CX',
      'Global phase is ignored',
    ],
    hints: [
      'What does X do to |−⟩? Multiply by a number — which one?',
      'If the target is an eigenstate of X, a CNOT does not change it — the eigenvalue has to go somewhere.',
      'A single gate is enough.',
    ],
    grading: {
      rules: { forbid: ['z', 's', 'sdg', 't', 'tdg', 'rz', 'p', 'cz', 'cp', 'crz', 'ccz'], require: ['cx'] },
      cases: [
        { name: 'q0 = |+⟩', prefix: [X(1), H(1), H(0)], checks: [{ type: 'state', ops: [X(1), H(1), H(0), Z(0)] }] },
        { name: 'q0 = |−⟩', prefix: [X(1), H(1), X(0), H(0)], checks: [{ type: 'state', ops: [X(1), H(1), X(0), H(0), Z(0)] }] },
        { name: 'q0 = |0⟩', visible: false, prefix: [X(1), H(1)], checks: [{ type: 'state', ops: [X(1), H(1), Z(0)] }] },
        { name: 'q0 = |1⟩', visible: false, prefix: [X(1), H(1), X(0)], checks: [{ type: 'state', ops: [X(1), H(1), X(0), Z(0)] }] },
        {
          name: 'q0 = generic superposition',
          visible: false,
          prefix: [X(1), H(1), RY('0.9', 0), RZ('0.5', 0)],
          checks: [{ type: 'state', ops: [X(1), H(1), RY('0.9', 0), RZ('0.5', 0), Z(0)] }],
        },
      ],
    },
    reference: { ops: [CX(0, 1)], notes: ['A single CNOT. |−⟩ is an eigenstate of X with eigenvalue −1, so the CNOT multiplies the |1⟩ branch of the control by −1: exactly Z.'] },
    explanation: [
      'X|−⟩ = −|−⟩. A CNOT applies X to the target only when the control is |1⟩, so the |1⟩ branch of q0 picks up a factor −1 while the target is unchanged. That is a Z gate on q0, obtained without ever using a phase gate.',
    ],
  },
  {
    slug: 'superdense-coding',
    title: 'Superdense Coding',
    difficulty: 'Medium',
    topics: ['Communication', 'Entanglement'],
    n: 4,
    description: [
      'Alice wants to send **two classical bits** to Bob by sending him **one qubit**.',
      'Qubits 2 (Alice) and 3 (Bob) already share the Bell pair `(|00⟩ + |11⟩)/√2` — prepared for you. Qubits 0 and 1 hold the two message bits (as |0⟩ or |1⟩).',
      'Encode the message onto Alice\'s qubit, "send" it to Bob, and let Bob decode. At the end, **qubits 2 and 3 must read out the message** (q2 = q0, q3 = q1).',
    ],
    examples: [{ input: 'message q0 q1 = 10', output: 'q2 q3 = 10' }],
    constraints: [
      '4 qubits; the Bell pair on qubits 2 and 3 is created for you',
      'Message qubits 0 and 1 may only interact with Alice\'s qubit 2 — never with qubit 3',
      'Once qubit 3 has been touched, no more gates may act on qubits 0 or 1 (Alice has sent her qubit)',
      'Must use at least one CX',
    ],
    hints: [
      'Alice can apply I, X, Z or ZX to her half of the Bell pair — four choices for two bits.',
      'Use the message bits as controls: one controls a Z on Alice\'s qubit, the other controls an X.',
      'Bob undoes the Bell-pair creation: CNOT(Alice→Bob), then H on Alice.',
    ],
    grading: {
      rules: {
        require: ['cx'],
        forbidPairs: [[0, 3], [1, 3]],
        noTouchAfter: [{ qubits: [0, 1], after: 3 }],
      },
      cases: [
        { name: 'Message 01', prefix: [...bell, X(1)], checks: [{ type: 'probs', qubits: [2, 3], dist: { '01': 1 } }] },
        { name: 'Message 11', prefix: [...bell, X(0), X(1)], checks: [{ type: 'probs', qubits: [2, 3], dist: { 11: 1 } }] },
        { name: 'Message 00', visible: false, prefix: [...bell], checks: [{ type: 'probs', qubits: [2, 3], dist: { '00': 1 } }] },
        { name: 'Message 10', visible: false, prefix: [...bell, X(0)], checks: [{ type: 'probs', qubits: [2, 3], dist: { 10: 1 } }] },
      ],
    },
    reference: {
      ops: [CZ(0, 2), CX(1, 2), CX(2, 3), H(2)],
      notes: ['Four gates: two controlled encodings, then Bob\'s two-gate Bell-basis decode.'],
    },
    explanation: [
      'Alice applies Z if the first bit is 1 and X if the second is 1 — the four Pauli operations turn the shared pair into the four different Bell states. Bob then reverses the Bell-state preparation (CNOT then H), which maps each Bell state back to a distinct computational basis state, revealing both bits.',
    ],
  },
  {
    slug: 'deutschs-algorithm',
    title: "Deutsch's Algorithm",
    difficulty: 'Medium',
    topics: ['Oracle algorithms'],
    n: 2,
    description: [
      'A black box computes an unknown one-bit function `f`. It acts as `|x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩` on qubit 0 (input x) and qubit 1 (output y).',
      'Decide whether `f` is **constant** (f(0) = f(1)) or **balanced** (f(0) ≠ f(1)) using **exactly one call** to the box: qubit 0 must end as **0 if constant, 1 if balanced**.',
      'Call the box with `oracle q[0], q[1];` (OpenQASM) or the `Oracle` helper imported in the starter code. In the circuit builder use the Oracle tool.',
    ],
    examples: [
      { input: 'f(x) = 0 (constant)', output: 'qubit 0 measures 0' },
      { input: 'f(x) = x (balanced)', output: 'qubit 0 measures 1' },
    ],
    constraints: ['2 qubits', 'The oracle must be called exactly once, on qubits 0, 1 in that order', 'It must work for all four possible f'],
    hints: [
      'Put the output qubit in |−⟩ so the oracle turns into a phase (−1)^f(x) — phase kickback.',
      'Put the input qubit in |+⟩ and interfere the two branches after the oracle.',
      'Sequence: X and H on q1, H on q0, oracle, H on q0.',
    ],
    grading: {
      oracle: { qubits: [0, 1], label: '|x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩' },
      rules: { oracleCalls: { min: 1, max: 1 } },
      cases: [
        { name: 'f(x) = 0', oracle: bitOracle([]), checks: [{ type: 'probs', qubits: [0], dist: { 0: 1 } }] },
        { name: 'f(x) = x', oracle: bitOracle([CX(0, 1)]), checks: [{ type: 'probs', qubits: [0], dist: { 1: 1 } }] },
        { name: 'f(x) = 1', visible: false, oracle: bitOracle([X(1)]), checks: [{ type: 'probs', qubits: [0], dist: { 0: 1 } }] },
        { name: 'f(x) = NOT x', visible: false, oracle: bitOracle([X(1), CX(0, 1)]), checks: [{ type: 'probs', qubits: [0], dist: { 1: 1 } }] },
      ],
    },
    reference: {
      ops: [X(1), H(0), H(1), ORACLE(0, 1), H(0)],
      notes: ['Four gates plus one oracle call — classically you would need two evaluations of f.'],
    },
    explanation: [
      'With q1 = |−⟩, the oracle adds a phase (−1)^f(x) to each branch of the input: (|0⟩ + |1⟩)/√2 becomes ((−1)^f(0)|0⟩ + (−1)^f(1)|1⟩)/√2. The final Hadamard turns "same sign" into |0⟩ and "opposite sign" into |1⟩, so one query reveals a global property of f.',
    ],
  },
  {
    slug: 'bernstein-vazirani',
    title: 'Bernstein–Vazirani',
    difficulty: 'Medium',
    topics: ['Oracle algorithms'],
    n: 4,
    description: [
      'A black box hides a secret 3-bit string `s` and computes `f(x) = s · x mod 2`. It acts on qubits 0–2 (input) and qubit 3 (output): `|x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩`.',
      'Find `s` with **one call** to the box. At the end, qubits 0–2 must read out `s` with certainty.',
      'Call the box with `oracle q[0], q[1], q[2], q[3];` or the `Oracle` helper from the starter code.',
    ],
    examples: [{ input: 's = 101', output: 'qubits 0–2 measure 101' }],
    constraints: ['4 qubits', 'Exactly one oracle call, on qubits 0, 1, 2, 3 in that order', 'Must work for every secret'],
    hints: [
      'Same trick as Deutsch: output qubit in |−⟩, Hadamards around the oracle.',
      'Hadamard on every input qubit before and after the oracle.',
      'Classically you need 3 queries; here it takes one.',
    ],
    grading: {
      oracle: { qubits: [0, 1, 2, 3], label: '|x⟩|y⟩ → |x⟩|y ⊕ s·x⟩' },
      rules: { oracleCalls: { min: 1, max: 1 } },
      cases: [
        { name: 's = 101', oracle: bitOracle([CX(0, 3), CX(2, 3)]), checks: [{ type: 'probs', qubits: [0, 1, 2], dist: { 101: 1 } }] },
        { name: 's = 011', oracle: bitOracle([CX(1, 3), CX(2, 3)]), checks: [{ type: 'probs', qubits: [0, 1, 2], dist: { '011': 1 } }] },
        { name: 's = 110', visible: false, oracle: bitOracle([CX(0, 3), CX(1, 3)]), checks: [{ type: 'probs', qubits: [0, 1, 2], dist: { 110: 1 } }] },
        { name: 's = 111', visible: false, oracle: bitOracle([CX(0, 3), CX(1, 3), CX(2, 3)]), checks: [{ type: 'probs', qubits: [0, 1, 2], dist: { 111: 1 } }] },
        { name: 's = 001', visible: false, oracle: bitOracle([CX(2, 3)]), checks: [{ type: 'probs', qubits: [0, 1, 2], dist: { '001': 1 } }] },
        { name: 's = 000', visible: false, oracle: bitOracle([]), checks: [{ type: 'probs', qubits: [0, 1, 2], dist: { '000': 1 } }] },
      ],
    },
    reference: {
      ops: [X(3), H(0), H(1), H(2), H(3), ORACLE(0, 1, 2, 3), H(0), H(1), H(2)],
      notes: ['Eight gates and one oracle call. The output qubit needs X then H to become |−⟩ (two gates); each input qubit needs one H before and one after.'],
    },
    explanation: [
      'With the output qubit in |−⟩ the oracle becomes a phase (−1)^{s·x} on each input string. The uniform superposition over x turns into a state whose Hadamard transform is exactly |s⟩ — so measuring the input register reads the secret directly.',
    ],
  },
  {
    slug: 'quantum-teleportation',
    title: 'Quantum Teleportation',
    difficulty: 'Medium',
    topics: ['Communication', 'Entanglement'],
    n: 3,
    description: [
      'Alice holds an unknown qubit (qubit 0) that she wants Bob to have (qubit 2).',
      'Qubits 1 (Alice) and 2 (Bob) already share the Bell pair `(|00⟩ + |11⟩)/√2` — prepared for you.',
      'Perform the **Bell measurement** on qubits 0 and 1, then apply Bob\'s **corrections**. Because mid-circuit measurement is not supported, use the *deferred-measurement* form: instead of measuring and sending classical bits, use qubits 0 and 1 as **controls** of gates on qubit 2.',
      'At the end, qubit 2 must hold exactly the state qubit 0 started in.',
    ],
    examples: [{ input: 'q0 = α|0⟩ + β|1⟩', output: 'q2 = α|0⟩ + β|1⟩' }],
    constraints: [
      '3 qubits; the Bell pair on qubits 1 and 2 is created for you',
      'Qubit 2 may only be the target of multi-qubit gates (no SWAP)',
      'After the first gate that touches qubit 2, gates on qubits 0 or 1 may only appear as controls of gates on qubit 2',
    ],
    hints: [
      'Alice: CNOT from the message qubit onto her half of the pair, then H on the message qubit.',
      'Bob\'s correction depends on two bits: one applies X, the other applies Z.',
      'Which qubit should control the X, and which the Z?',
    ],
    grading: {
      rules: { targetOnly: [2], controlOnlyAfter: [{ qubits: [0, 1], after: 2 }] },
      cases: [
        { name: 'Message |1⟩', prefix: [H(1), CX(1, 2), X(0)], checks: [{ type: 'qubitState', qubit: 2, ops: [X(0)] }] },
        { name: 'Message |+⟩', prefix: [H(1), CX(1, 2), H(0)], checks: [{ type: 'qubitState', qubit: 2, ops: [H(0)] }] },
        {
          name: 'Message (Ry 1.1, Rz 0.7)',
          prefix: [H(1), CX(1, 2), RY('1.1', 0), RZ('0.7', 0)],
          checks: [{ type: 'qubitState', qubit: 2, ops: [RY('1.1', 0), RZ('0.7', 0)] }],
        },
        { name: 'Message |0⟩', visible: false, prefix: [H(1), CX(1, 2)], checks: [{ type: 'qubitState', qubit: 2, ops: [] }] },
        {
          name: 'Message (Ry 2.4)',
          visible: false,
          prefix: [H(1), CX(1, 2), RY('2.4', 0)],
          checks: [{ type: 'qubitState', qubit: 2, ops: [RY('2.4', 0)] }],
        },
        {
          name: 'Message (Rz 2.0 · Ry 0.4)',
          visible: false,
          prefix: [H(1), CX(1, 2), RY('0.4', 0), RZ('2.0', 0)],
          checks: [{ type: 'qubitState', qubit: 2, ops: [RY('0.4', 0), RZ('2.0', 0)] }],
        },
      ],
    },
    reference: {
      ops: [CX(0, 1), H(0), CX(1, 2), CZ(0, 2)],
      notes: ['Four gates. In the original protocol the two controls are measurement results sent over a classical channel; deferring the measurement turns them into quantum controls with the same effect.'],
    },
    explanation: [
      'CNOT then H on Alice\'s two qubits is a Bell-basis measurement in disguise. The four possible outcomes tell Bob which Pauli error his qubit picked up: X if the second bit is 1, Z if the first bit is 1. Controlled-X from qubit 1 and controlled-Z from qubit 0 undo exactly that, leaving Bob with the original state.',
    ],
  },

  /* ================= HARD ================= */
  {
    slug: 'deutsch-jozsa',
    title: 'Deutsch–Jozsa',
    difficulty: 'Hard',
    topics: ['Oracle algorithms'],
    n: 5,
    description: [
      'A black box computes a function `f` on a 4-bit input. It is promised to be either **constant** (same output for all 16 inputs) or **balanced** (0 for exactly half of them).',
      'Decide which with **one call** to the box. The oracle acts on qubits 0–3 (input) and qubit 4 (output): `|x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩`.',
      'At the end, qubits 0–3 must measure **0000 with certainty if f is constant**, and **never 0000 if f is balanced**.',
    ],
    examples: [
      { input: 'f(x) = 0', output: 'qubits 0–3 measure 0000' },
      { input: 'f(x) = x0 ⊕ x1 ⊕ x2 ⊕ x3', output: 'qubits 0–3 never measure 0000' },
    ],
    constraints: ['5 qubits', 'Exactly one oracle call, on qubits 0, 1, 2, 3, 4 in that order', 'Must handle both constant and balanced functions, including non-linear ones'],
    hints: [
      'Same skeleton as Deutsch and Bernstein–Vazirani, but the readout is different.',
      'Look at the amplitude of |0000⟩ after the final Hadamards: it is the average of (−1)^f(x) over all inputs.',
      'If f is constant that average is ±1; if balanced it is 0.',
    ],
    grading: {
      oracle: { qubits: [0, 1, 2, 3, 4], label: '|x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩' },
      rules: { oracleCalls: { min: 1, max: 1 } },
      cases: [
        { name: 'Constant f(x) = 0', oracle: bitOracle([]), checks: [{ type: 'probs', qubits: [0, 1, 2, 3], dist: { '0000': 1 } }] },
        {
          name: 'Balanced: parity of x',
          oracle: bitOracle([CX(0, 4), CX(1, 4), CX(2, 4), CX(3, 4)]),
          checks: [{ type: 'probAtMost', qubits: [0, 1, 2, 3], bits: '0000', value: 0 }],
        },
        { name: 'Constant f(x) = 1', visible: false, oracle: bitOracle([X(4)]), checks: [{ type: 'probs', qubits: [0, 1, 2, 3], dist: { '0000': 1 } }] },
        {
          name: 'Balanced: f(x) = x0',
          visible: false,
          oracle: bitOracle([CX(0, 4)]),
          checks: [{ type: 'probAtMost', qubits: [0, 1, 2, 3], bits: '0000', value: 0 }],
        },
        {
          name: 'Balanced: f(x) = x1 ⊕ x3',
          visible: false,
          oracle: bitOracle([CX(1, 4), CX(3, 4)]),
          checks: [{ type: 'probAtMost', qubits: [0, 1, 2, 3], bits: '0000', value: 0 }],
        },
        {
          name: 'Balanced (non-linear): f(x) = x0·x1 ⊕ x2',
          visible: false,
          oracle: bitOracle([CCX(0, 1, 4), CX(2, 4)]),
          checks: [{ type: 'probAtMost', qubits: [0, 1, 2, 3], bits: '0000', value: 0 }],
        },
      ],
    },
    reference: {
      ops: [X(4), H(0), H(1), H(2), H(3), H(4), ORACLE(0, 1, 2, 3, 4), H(0), H(1), H(2), H(3)],
      notes: ['Ten gates and one oracle call. A deterministic classical algorithm needs 2^(n−1) + 1 = 9 queries in the worst case.'],
    },
    explanation: [
      'After the oracle each input string x carries the phase (−1)^f(x). The final Hadamards map the amplitude of |0000⟩ to the average of these phases: exactly ±1 for a constant f and exactly 0 for a balanced f. One quantum query therefore answers a question that needs 9 classical ones.',
    ],
  },
  {
    slug: 'grovers-search',
    title: "Grover's Search",
    difficulty: 'Hard',
    topics: ['Search', 'Oracle algorithms'],
    n: 3,
    description: [
      'A phase oracle secretly flips the sign of **one** of the 8 basis states of 3 qubits (the "marked" item). It acts on qubits 0, 1, 2.',
      'Find the marked item: build a circuit that, for **any** marked state, ends with the marked state measured with probability **at least 90%**.',
      'Call the oracle with `oracle q[0], q[1], q[2];` (any number of times) or the `Oracle` helper. You will need the diffusion operator too.',
    ],
    examples: [{ input: 'marked = 101', output: 'qubits 0–2 measure 101 with P ≥ 90%' }],
    constraints: ['3 qubits', 'Oracle on qubits 0, 1, 2 in that order; call it at least once', 'P(marked) ≥ 0.9 for every marked state'],
    hints: [
      'Start with Hadamards on every qubit for a uniform superposition.',
      'One Grover iteration = oracle, then "inversion about the mean".',
      'Inversion about the mean = H·X on all qubits, a CCZ, then X·H on all qubits.',
      'For 8 items the best number of iterations is 2 (about π/4·√8).',
    ],
    grading: {
      oracle: { qubits: [0, 1, 2], label: 'phase oracle: |marked⟩ → −|marked⟩' },
      rules: { oracleCalls: { min: 1 } },
      cases: [
        { name: 'marked = 101', oracle: markState('101'), checks: [{ type: 'probAtLeast', qubits: [0, 1, 2], bits: '101', value: 0.9 }] },
        { name: 'marked = 110', oracle: markState('110'), checks: [{ type: 'probAtLeast', qubits: [0, 1, 2], bits: '110', value: 0.9 }] },
        { name: 'marked = 000', visible: false, oracle: markState('000'), checks: [{ type: 'probAtLeast', qubits: [0, 1, 2], bits: '000', value: 0.9 }] },
        { name: 'marked = 011', visible: false, oracle: markState('011'), checks: [{ type: 'probAtLeast', qubits: [0, 1, 2], bits: '011', value: 0.9 }] },
        { name: 'marked = 111', visible: false, oracle: markState('111'), checks: [{ type: 'probAtLeast', qubits: [0, 1, 2], bits: '111', value: 0.9 }] },
        { name: 'marked = 010', visible: false, oracle: markState('010'), checks: [{ type: 'probAtLeast', qubits: [0, 1, 2], bits: '010', value: 0.9 }] },
      ],
    },
    reference: {
      ops: [
        H(0), H(1), H(2),
        ORACLE(0, 1, 2),
        H(0), H(1), H(2), X(0), X(1), X(2), CCZ(0, 1, 2), X(0), X(1), X(2), H(0), H(1), H(2),
        ORACLE(0, 1, 2),
        H(0), H(1), H(2), X(0), X(1), X(2), CCZ(0, 1, 2), X(0), X(1), X(2), H(0), H(1), H(2),
      ],
      notes: [
        'Two iterations give P(marked) ≈ 94.5%; one gives only 78%, three drop back to 33% — Grover can overshoot.',
        'Using a native CCZ instead of H·CCX·H saves two gates per iteration.',
      ],
    },
    explanation: [
      'Each iteration rotates the state by a fixed angle toward the marked item: the oracle reflects it about the unmarked subspace and the diffusion operator reflects it about the uniform state. With N = 8 the rotation per iteration is about 41°, so two iterations bring the state to within 10° of the target.',
    ],
  },
  {
    slug: 'quantum-fourier-transform',
    title: '3-Qubit Quantum Fourier Transform',
    difficulty: 'Hard',
    topics: ['Transforms'],
    n: 3,
    description: [
      'Implement the quantum Fourier transform on 3 qubits: `QFT|x⟩ = (1/√8) Σ_y e^{2πi·xy/8} |y⟩`.',
      'Read a basis state `|q0 q1 q2⟩` as the number x = 4·q0 + 2·q1 + q2 — **q0 is the most significant bit**, for input and output.',
      'Your circuit must equal the QFT as a unitary (global phase is ignored). Controlled-phase gates `CP(θ)` are available.',
    ],
    examples: [{ input: '|000⟩', output: 'uniform superposition of all 8 states' }],
    constraints: ['3 qubits', 'Any gates are allowed', 'The output ordering matters — the qubit reversal counts'],
    hints: [
      'Work from the most significant qubit: H, then controlled phases π/2 and π/4 from the less significant qubits.',
      'Repeat for the next qubit with one fewer rotation, and so on.',
      'The natural circuit leaves the output bits in reverse order — fix it with a SWAP.',
    ],
    grading: {
      cases: [
        { name: 'Input |000⟩', checks: [{ type: 'state', ops: QFT3 }] },
        { name: 'Input |101⟩', prefix: [X(0), X(2)], checks: [{ type: 'state', ops: [X(0), X(2), ...QFT3] }] },
        { name: 'Whole transform', visible: false, checks: [{ type: 'unitary', ops: QFT3 }] },
      ],
    },
    reference: {
      ops: QFT3,
      notes: [
        'Seven gates: n Hadamards, n(n−1)/2 controlled phases and ⌊n/2⌋ swaps for n = 3.',
        'If the output order were not required you could drop the SWAP and keep six gates.',
      ],
    },
    explanation: [
      'The QFT factorises: qubit 0 gets a Hadamard and then a phase of 2π/4 or 2π/8 from each lower qubit that is set; the pattern repeats on qubit 1 (one fewer rotation) and qubit 2. Those steps leave the output bits reversed, which the final SWAP corrects.',
    ],
  },
  {
    slug: 'bit-flip-error-correction',
    title: 'Bit-Flip Error Correction',
    difficulty: 'Hard',
    topics: ['Error correction'],
    n: 3,
    description: [
      'Qubit 0 holds an unknown state `α|0⟩ + β|1⟩` that you want to protect. Between your encoding and your decoding, a noisy channel may apply an **X error to at most one of the three qubits**.',
      'Design a circuit that **encodes** qubit 0 across all three qubits, lets the channel act, and then **decodes and corrects** so that qubit 0 holds the original state again — whichever qubit (if any) was hit.',
      'The noise is the black box `oracle q[0], q[1], q[2];` — place it **exactly once**, between encoding and decoding. Use deferred-measurement style: correct with a Toffoli instead of measuring the syndrome.',
    ],
    examples: [{ input: 'q0 = α|0⟩ + β|1⟩, X error on qubit 1', output: 'q0 = α|0⟩ + β|1⟩ again' }],
    constraints: ['3 qubits (no ancillas)', 'Exactly one noise call, on qubits 0, 1, 2 in that order', 'Must correct an X error on q0, q1, q2 or none'],
    hints: [
      'Encode with the repetition code: copy q0 onto q1 and q2 with CNOTs.',
      'To decode, undo the encoding; qubits 1 and 2 now hold the syndrome.',
      'If both syndrome bits are 1 the error hit q0 — a Toffoli with controls 1, 2 and target 0 repairs it.',
    ],
    grading: {
      oracle: { qubits: [0, 1, 2], label: 'noise: X error on at most one qubit' },
      rules: { oracleCalls: { min: 1, max: 1 } },
      cases: (() => {
        const messages = [
          { name: 'generic', ops: [RY('1.1', 0), RZ('0.7', 0)], visible: true },
          { name: '|+⟩', ops: [H(0)], visible: false },
          { name: '|1⟩', ops: [X(0)], visible: false },
        ];
        const noises = [
          { name: 'no error', ops: [] },
          { name: 'X on qubit 0', ops: [X(0)] },
          { name: 'X on qubit 1', ops: [X(1)] },
          { name: 'X on qubit 2', ops: [X(2)] },
        ];
        const out = [];
        for (const m of messages) {
          for (const nz of noises) {
            out.push({
              name: `Message ${m.name}, ${nz.name}`,
              visible: m.visible && (nz.name === 'no error' || nz.name === 'X on qubit 1'),
              prefix: m.ops,
              oracle: { ops: nz.ops },
              checks: [{ type: 'qubitState', qubit: 0, ops: m.ops }],
            });
          }
        }
        return out;
      })(),
    },
    reference: {
      ops: [CX(0, 1), CX(0, 2), ORACLE(0, 1, 2), CX(0, 1), CX(0, 2), CCX(1, 2, 0)],
      notes: ['Five gates plus the noise. Decoding first and correcting with one Toffoli avoids measuring the syndrome or using extra ancilla qubits.'],
    },
    explanation: [
      'Encoding gives α|000⟩ + β|111⟩. After decoding (the same two CNOTs), qubits 1 and 2 hold the "syndrome": an error on qubit 1 or 2 leaves the message on qubit 0 untouched, while an error on qubit 0 sets both syndrome bits to 1 and flips the message. The Toffoli fires only in that last case, undoing the flip.',
    ],
  },
  {
    slug: 'w-state',
    title: 'W State',
    difficulty: 'Hard',
    topics: ['Entanglement', 'State preparation'],
    n: 3,
    description: [
      'Prepare the three-qubit W state `(|001⟩ + |010⟩ + |100⟩) / √3` — exactly one qubit is "excited", in an equal superposition of the three possible positions.',
      'Unlike GHZ, W needs unequal amplitudes along the way, so simple Hadamards and CNOTs are not enough.',
    ],
    examples: [{ input: '|000⟩', output: '(|001⟩ + |010⟩ + |100⟩)/√3', note: 'Each of 001, 010, 100 has probability 1/3.' }],
    constraints: ['3 qubits', 'Any gates are allowed, including controlled rotations'],
    hints: [
      'Start with one excitation: X on qubit 0 gives |100⟩.',
      'A controlled-Ry followed by a CNOT can move part of an excitation from one qubit to the next.',
      'Move 2/3 of the weight off qubit 0 first, then split it 1/2–1/2 between qubits 1 and 2.',
    ],
    grading: {
      cases: [{
        name: 'Start from |000⟩',
        checks: [{ type: 'state', amps: { '100': 1 / Math.sqrt(3), '010': 1 / Math.sqrt(3), '001': 1 / Math.sqrt(3) } }],
      }],
    },
    reference: {
      ops: [X(0), CRY('2*acos(sqrt(1/3))', 0, 1), CX(1, 0), CRY('pi/2', 1, 2), CX(2, 1)],
      notes: ['Five gates. Each "CRy + CNOT" pair is a partial swap that moves a chosen fraction of the excitation one qubit along.'],
    },
    explanation: [
      'After X the excitation sits on q0. The first CRy(2·arccos(1/√3)) followed by CX(1→0) leaves amplitude 1/√3 on |100⟩ and moves √(2/3) to |010⟩. The second pair splits that weight equally between |010⟩ and |001⟩, giving three amplitudes of 1/√3.',
    ],
  },
];

export const problems = PROBLEMS.map((p, i) => ({ ...p, id: i + 1 }));
export const topics = ALL_TOPICS;
export const getProblem = (slug) => problems.find((p) => p.slug === slug) || null;
export const XP_BY_DIFFICULTY = { Easy: 10, Medium: 25, Hard: 50 };
