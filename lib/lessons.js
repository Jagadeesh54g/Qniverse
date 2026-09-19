// lib/lessons.js
// Documentation-style curriculum, ordered basic -> advanced.
// Each lesson carries structured `theory` sections so the Theory tab reads
// like real reference documentation rather than a blurb, and enough metadata
// for Bujji (AI mode) to teach the same topic conversationally.

export const TRACKS = [
  { id: 'start', label: 'Start Here' },
  { id: 'foundations', label: 'Quantum Foundations' },
  { id: 'operations', label: 'Quantum Operations' },
  { id: 'multi', label: 'Multiple Qubits' },
  { id: 'behavior', label: 'Quantum Behavior' },
  { id: 'advanced', label: 'Advanced' },
];

export const lessons = [
  /* ---------------------------------------------------------- START HERE */
  {
    id: 'classical-bits',
    track: 'start',
    tag: '01',
    title: 'Classical Bits',
    level: 'Beginner',
    time: '8 min',
    desc: 'Where computing starts: a switch that is either off or on.',
    formula: 'b \u2208 {0, 1}',
    experiment: 'Run an empty circuit. With no gates applied, q0 stays |0\u27e9 \u2014 a classical bit at rest.',
    theory: [
      {
        heading: 'Why this matters',
        body: 'Every quantum idea you will meet is defined by contrast with the classical bit. If the classical picture is fuzzy, superposition sounds like magic instead of mathematics.',
      },
      {
        heading: 'Definition',
        body: 'A classical bit is a system with exactly two distinguishable states, written 0 and 1. At any moment it is in one of them. Not both, not in between, and not unknown-in-principle \u2014 merely possibly unknown to you.',
      },
      {
        heading: 'Operations',
        body: 'There are only four possible single-bit operations: identity (leave it), NOT (flip it), constant-0 (force it to 0) and constant-1 (force it to 1). Of these, only identity and NOT are reversible \u2014 you can undo them and recover the input. Keep that word reversible in mind; quantum gates are all reversible, and that is not a coincidence.',
      },
      {
        heading: 'Probability vs superposition',
        body: 'A biased coin under your hand is described by probabilities: 70% heads, 30% tails. That is classical uncertainty \u2014 the coin is definitely one of them, you just do not know which. A qubit in superposition is a different animal: it is not secretly 0 or 1 while you look away. The distinction becomes measurable once interference enters the story.',
      },
    ],
    misconception: '"A qubit is just a bit with probabilities attached." No \u2014 a probabilistic bit cannot produce interference, and interference is exactly what quantum algorithms exploit.',
    check: {
      q: 'Which single-bit classical operation is NOT reversible?',
      options: ['NOT', 'Identity', 'Constant-0'],
      answer: 2,
      why: 'Constant-0 sends both 0 and 1 to 0, so the input cannot be recovered from the output.',
    },
  },
  {
    id: 'why-quantum',
    track: 'start',
    tag: '02',
    title: 'Why Quantum Computing?',
    level: 'Beginner',
    time: '9 min',
    desc: 'What classical machines struggle with, and where quantum actually helps.',
    formula: '2\u207f amplitudes for n qubits',
    experiment: 'Add qubits in the Lab one at a time and watch the statevector length double: 2, 4, 8, 16.',
    theory: [
      {
        heading: 'The scaling problem',
        body: 'Simulating n interacting quantum particles classically needs roughly 2\u207f numbers. At n = 50 that is over a quadrillion complex amplitudes \u2014 beyond any classical memory. Feynman\u2019s 1981 observation was simple: if nature runs this computation effortlessly, build a computer that works the way nature does.',
      },
      {
        heading: 'What quantum computers are good at',
        body: 'Three families have real, proven advantage: simulating quantum systems (chemistry, materials), factoring and discrete logarithms (Shor, which breaks RSA), and unstructured search (Grover, a quadratic speedup). Outside those, speedup is an open research question, not a guarantee.',
      },
      {
        heading: 'What they are not',
        body: 'A quantum computer is not a faster classical computer. It will not speed up your spreadsheet, your web server or most machine learning. It does not "try all answers at once" in any useful sense \u2014 you only ever read out one measurement outcome. The skill is arranging interference so the outcome you want is the one that survives.',
      },
    ],
    misconception: '"Quantum computers try every possibility in parallel and return the best one." Superposition does hold all inputs, but measurement returns exactly one. Without interference engineered to cancel wrong answers, you get a random one.',
    check: {
      q: 'How many complex amplitudes describe a 10-qubit state?',
      options: ['10', '100', '1024'],
      answer: 2,
      why: '2\u00b9\u2070 = 1024. The state space grows exponentially with qubit count.',
    },
  },
  {
    id: 'qubits',
    track: 'start',
    tag: '03',
    title: 'What is a Qubit?',
    level: 'Beginner',
    time: '12 min',
    desc: 'Understand |0\u27e9, |1\u27e9 and superposition as probability amplitudes.',
    formula: '|\u03c8\u27e9 = \u03b1|0\u27e9 + \u03b2|1\u27e9,  |\u03b1|\u00b2 + |\u03b2|\u00b2 = 1',
    experiment: 'Set \u03b1 and \u03b2 by applying gates, then predict what a computational-basis measurement will reveal.',
    theory: [
      {
        heading: 'The state vector',
        body: 'A qubit\u2019s state is a unit vector in a two-dimensional complex space. The basis states |0\u27e9 = (1,0) and |1\u27e9 = (0,1) are the two outcomes you can measure. Any state is a linear combination \u03b1|0\u27e9 + \u03b2|1\u27e9 where \u03b1 and \u03b2 are complex numbers called amplitudes.',
      },
      {
        heading: 'The normalisation condition',
        body: '|\u03b1|\u00b2 + |\u03b2|\u00b2 = 1 always holds, because |\u03b1|\u00b2 and |\u03b2|\u00b2 are the probabilities of measuring 0 and 1. Probabilities sum to one, so the state vector always has length one. Every quantum gate preserves this length \u2014 that is what "unitary" means.',
      },
      {
        heading: 'Amplitudes are not probabilities',
        body: 'This is the single most important distinction in the subject. Amplitudes are complex and can be negative; probabilities are real and non-negative. You square the magnitude to get from one to the other. Because amplitudes can be negative, they can cancel \u2014 and cancellation is the whole game.',
      },
      {
        heading: 'Physical realisations',
        body: 'The mathematics does not care what the qubit is made of: a superconducting circuit\u2019s energy levels, an ion\u2019s electronic states, a photon\u2019s polarisation. Qniverse simulates the mathematics, so everything you learn transfers to any hardware.',
      },
    ],
    misconception: '"\u03b1 and \u03b2 are the probabilities." They are amplitudes. P(0) = |\u03b1|\u00b2, not \u03b1. A state with \u03b1 = 0.6 gives P(0) = 0.36.',
    check: {
      q: 'If \u03b1 = 1/\u221a2 and \u03b2 = \u22121/\u221a2, what is P(1)?',
      options: ['\u22120.707', '0.5', '1.0'],
      answer: 1,
      why: 'P(1) = |\u03b2|\u00b2 = (1/\u221a2)\u00b2 = 0.5. The minus sign vanishes on squaring \u2014 but it still matters for interference.',
    },
  },

  /* ------------------------------------------------------- FOUNDATIONS */
  {
    id: 'superposition',
    track: 'foundations',
    tag: '04',
    title: 'Superposition',
    level: 'Foundation',
    time: '10 min',
    desc: 'See how the Hadamard gate creates a balanced superposition from |0\u27e9.',
    formula: 'H|0\u27e9 = (|0\u27e9 + |1\u27e9)/\u221a2',
    experiment: 'Run 1,000 shots after H and compare the observed distribution with the predicted 50/50.',
    theory: [
      {
        heading: 'What superposition is',
        body: 'A qubit in superposition has non-zero amplitude on both |0\u27e9 and |1\u27e9 at once. It is not "spinning between them" and not "undecided" \u2014 it is a definite state of a system whose measurement outcomes happen to be probabilistic.',
      },
      {
        heading: 'Creating it',
        body: 'The Hadamard gate is the standard tool. H|0\u27e9 = (|0\u27e9 + |1\u27e9)/\u221a2, an equal superposition with both amplitudes 1/\u221a2 \u2248 0.707, giving 50% for each outcome. Applied to |1\u27e9 it gives (|0\u27e9 \u2212 |1\u27e9)/\u221a2 \u2014 same probabilities, opposite relative phase.',
      },
      {
        heading: 'Why shots vary',
        body: 'Ten shots of a fair superposition rarely give exactly 5/5; you might see 7/3. That is sampling noise, not a simulator bug. The statistical error shrinks as 1/\u221aN, so 10,000 shots lands within roughly 1% of 50/50. Run the experiment at 10, 100, 1000 and 10000 and watch it tighten.',
      },
    ],
    misconception: '"Superposition means the qubit is secretly 0 or 1 and we just do not know." If that were true, the H-Z-H experiment could not turn a phase flip into a visible bit flip. It can, so it is not.',
    check: {
      q: 'You apply H to |0\u27e9 and measure 100 shots, getting 58 zeros. What happened?',
      options: ['The gate is broken', 'Normal sampling noise', 'The state was not normalised'],
      answer: 1,
      why: '58/42 is well within the expected spread for 100 shots (\u00b1~10). More shots would tighten it toward 50/50.',
    },
  },
  {
    id: 'measurement',
    track: 'foundations',
    tag: '05',
    title: 'Measurement & Probability',
    level: 'Foundation',
    time: '14 min',
    desc: 'Connect amplitudes to probabilities and understand collapse through repeated shots.',
    formula: 'P(x) = |\u27e8x|\u03c8\u27e9|\u00b2',
    experiment: 'Predict a distribution before running the circuit, then compare prediction vs reality.',
    theory: [
      {
        heading: 'The Born rule',
        body: 'The probability of measuring outcome x is the squared magnitude of that outcome\u2019s amplitude: P(x) = |\u27e8x|\u03c8\u27e9|\u00b2. This is a postulate of quantum mechanics \u2014 it is not derived from anything more basic, it is what experiment tells us.',
      },
      {
        heading: 'Collapse',
        body: 'Measurement is destructive. Before it, the qubit holds both amplitudes; after it, the state is exactly the outcome you observed, and the other amplitude is gone for good. You cannot measure a state, look at the result, and then "put it back". To get statistics you must re-prepare and re-run \u2014 that is precisely what shots are.',
      },
      {
        heading: 'Basis matters',
        body: 'Measurement is always relative to a basis. The computational basis {|0\u27e9, |1\u27e9} is the default, but |+\u27e9 = (|0\u27e9+|1\u27e9)/\u221a2 is definite in the X basis and random in the computational basis. Measuring in a different basis means applying a rotation first \u2014 H before measurement converts an X-basis measurement into a Z-basis one.',
      },
    ],
    misconception: '"Measurement reveals a value the qubit already had." In general it does not. Bell tests rule out local pre-existing values.',
    check: {
      q: 'A state has amplitude 0.6 on |0\u27e9. What is P(0)?',
      options: ['0.6', '0.36', '0.775'],
      answer: 1,
      why: 'P(0) = |0.6|\u00b2 = 0.36. Square the amplitude magnitude.',
    },
  },
  {
    id: 'bloch',
    track: 'foundations',
    tag: '06',
    title: 'The Bloch Sphere',
    level: 'Foundation',
    time: '13 min',
    desc: 'Every single-qubit state as a point on a sphere \u2014 and every gate as a rotation.',
    formula: '|\u03c8\u27e9 = cos(\u03b8/2)|0\u27e9 + e^{i\u03c6} sin(\u03b8/2)|1\u27e9',
    experiment: 'Open the Bloch tab in the Lab and apply H, then S, then H. Watch the vector rotate.',
    theory: [
      {
        heading: 'The picture',
        body: 'A pure single-qubit state needs two real parameters, \u03b8 and \u03c6, so it maps to a point on a unit sphere. |0\u27e9 sits at the north pole, |1\u27e9 at the south, |+\u27e9 and |\u2212\u27e9 on the equator facing opposite directions. Opposite points on the sphere are perfectly distinguishable states.',
      },
      {
        heading: 'Gates are rotations',
        body: 'Every single-qubit gate is a rotation of this sphere. X is a 180\u00b0 rotation about the X axis, Z about the Z axis, H is a 180\u00b0 rotation about the diagonal axis between X and Z. Rx(\u03b8), Ry(\u03b8) and Rz(\u03b8) rotate by an arbitrary angle about each axis.',
      },
      {
        heading: 'Inside the sphere',
        body: 'Points on the surface are pure states. Points strictly inside are mixed \u2014 the qubit is entangled with something else, or has decohered. The centre is maximally mixed: 50/50 in every basis, carrying no information at all. This is why each qubit of a Bell pair shows a vector of zero length in the Lab.',
      },
      {
        heading: 'The \u03b8/2 that surprises everyone',
        body: 'The half-angle is not a typo. |0\u27e9 and |1\u27e9 are 180\u00b0 apart on the Bloch sphere but orthogonal (90\u00b0) as vectors in Hilbert space. The factor of two reconciles the two geometries.',
      },
    ],
    misconception: '"A vector pointing at the centre means the qubit is broken." It means the qubit is maximally mixed \u2014 usually because it is entangled with another qubit, which is a feature, not a fault.',
    check: {
      q: 'Where does |+\u27e9 sit on the Bloch sphere?',
      options: ['North pole', 'On the equator', 'At the centre'],
      answer: 1,
      why: '|+\u27e9 is an equal superposition with zero relative phase \u2014 it sits on the equator along the +X axis.',
    },
  },
  {
    id: 'phase',
    track: 'foundations',
    tag: '07',
    title: 'Phase: Global vs Relative',
    level: 'Core',
    time: '12 min',
    desc: 'The invisible quantity that decides every interference outcome.',
    formula: 'e^{i\u03b3}|\u03c8\u27e9 \u2261 |\u03c8\u27e9  but  (|0\u27e9 + e^{i\u03c6}|1\u27e9)/\u221a2 does not',
    experiment: 'Run H \u2192 Z \u2192 H and compare with H \u2192 H. The Z is invisible alone but flips the result here.',
    theory: [
      {
        heading: 'Global phase is unobservable',
        body: 'Multiplying an entire state by e^{i\u03b3} changes nothing measurable: every probability |e^{i\u03b3}\u03b1|\u00b2 = |\u03b1|\u00b2. So |\u03c8\u27e9 and \u2212|\u03c8\u27e9 are the same physical state. You can always ignore an overall phase factor.',
      },
      {
        heading: 'Relative phase is everything',
        body: 'The phase between components is physical. (|0\u27e9+|1\u27e9)/\u221a2 and (|0\u27e9\u2212|1\u27e9)/\u221a2 have identical measurement statistics in the computational basis \u2014 both 50/50 \u2014 yet they are orthogonal states, perfectly distinguishable if you measure in the right basis.',
      },
      {
        heading: 'Making phase visible',
        body: 'Since phase does not show up in computational-basis probabilities, you convert it into amplitude first. Hadamard does exactly that. H\u00b7Z\u00b7H = X: a phase flip sandwiched between Hadamards becomes an ordinary bit flip. Every quantum algorithm is, at bottom, a scheme for converting phase information into measurable amplitude.',
      },
    ],
    misconception: '"Z does nothing because the probabilities do not change." Z changes the relative phase. Apply H afterwards and the change becomes fully visible.',
    check: {
      q: 'What does H\u00b7Z\u00b7H equal?',
      options: ['I (identity)', 'X', 'Z'],
      answer: 1,
      why: 'Conjugating Z by Hadamards turns a phase flip into a bit flip \u2014 H\u00b7Z\u00b7H = X.',
    },
  },

  /* -------------------------------------------------------- OPERATIONS */
  {
    id: 'gates',
    track: 'operations',
    tag: '08',
    title: 'Quantum Gates',
    level: 'Core',
    time: '16 min',
    desc: 'Treat gates as unitary transformations acting on quantum states.',
    formula: "|\u03c8\u2032\u27e9 = U|\u03c8\u27e9,  U\u2020U = I",
    experiment: 'Try X, Z and H, then apply H twice to verify that H\u00b2 = I.',
    theory: [
      {
        heading: 'Unitarity',
        body: 'A gate is a matrix U satisfying U\u2020U = I. Two consequences follow immediately: gates preserve the length of the state vector (so probabilities keep summing to 1), and every gate is reversible \u2014 U\u2020 undoes U. There is no quantum equivalent of the classical AND gate, which throws information away.',
      },
      {
        heading: 'The Pauli gates',
        body: 'X = [[0,1],[1,0]] is the bit flip, the quantum NOT. Z = [[1,0],[0,\u22121]] is the phase flip, leaving |0\u27e9 alone and negating |1\u27e9. Y = iXZ does both at once. Each is its own inverse: X\u00b2 = Y\u00b2 = Z\u00b2 = I.',
      },
      {
        heading: 'Hadamard',
        body: 'H = (1/\u221a2)[[1,1],[1,\u22121]] maps between the computational and the X basis. It is its own inverse, which is why H\u00b7H = I \u2014 the second H interferes with the first and cancels it exactly.',
      },
      {
        heading: 'Phase and rotation gates',
        body: 'S applies a quarter turn of phase (i on |1\u27e9), T an eighth turn. Rx, Ry and Rz rotate by any angle about their axis, giving continuous control. {H, T, CNOT} is universal: any quantum computation can be approximated arbitrarily well from that small set.',
      },
    ],
    misconception: '"There must be a quantum AND gate." AND is irreversible \u2014 it maps four inputs to two outputs. Quantum gates must be reversible, so logic is built from controlled operations like CNOT and Toffoli instead.',
    check: {
      q: 'Why is there no quantum AND gate acting on two qubits alone?',
      options: ['It would be too slow', 'It is irreversible', 'AND is a classical-only concept'],
      answer: 1,
      why: 'From output 0 you cannot recover which of 00, 01 or 10 was the input. Unitary gates must be invertible.',
    },
  },
  {
    id: 'controlled',
    track: 'operations',
    tag: '09',
    title: 'Controlled Gates & CNOT',
    level: 'Core',
    time: '15 min',
    desc: 'Let one qubit decide what happens to another \u2014 the source of all entanglement.',
    formula: 'CNOT|a,b\u27e9 = |a, a\u2295b\u27e9',
    experiment: 'Place CNOT with a control in |0\u27e9, then in |1\u27e9, then in superposition. Only the third entangles.',
    theory: [
      {
        heading: 'The construction',
        body: 'A controlled-U applies U to the target only when the control qubit is |1\u27e9. CNOT is controlled-X: it flips the target if the control is 1, leaving it alone otherwise. In the 4x4 matrix this swaps the |10\u27e9 and |11\u27e9 rows.',
      },
      {
        heading: 'Linearity does the magic',
        body: 'With the control in a definite state, CNOT is just a classical conditional flip. With the control in superposition, linearity applies the gate to both branches at once: CNOT(H|0\u27e9\u2297|0\u27e9) = (|00\u27e9+|11\u27e9)/\u221a2. Neither qubit now has a state of its own \u2014 that is entanglement, and it came for free from linearity.',
      },
      {
        heading: 'CZ and symmetry',
        body: 'Controlled-Z applies a phase of \u22121 only to |11\u27e9. Unlike CNOT, it is symmetric: swapping control and target gives the same gate. CZ and CNOT are related by Hadamards on the target \u2014 CNOT = (I\u2297H)\u00b7CZ\u00b7(I\u2297H) \u2014 so hardware that provides one provides both.',
      },
    ],
    misconception: '"CNOT always entangles." Only when the control is in superposition. With the control in |0\u27e9 or |1\u27e9 the output stays a plain product state.',
    check: {
      q: 'CNOT acts on |1\u27e9\u2297|1\u27e9 with q0 as control. What comes out?',
      options: ['|10\u27e9', '|11\u27e9', 'An entangled state'],
      answer: 0,
      why: 'Control is 1, so the target flips from 1 to 0, giving |10\u27e9. No superposition means no entanglement.',
    },
  },

  /* ------------------------------------------------------ MULTI-QUBIT */
  {
    id: 'multi-qubit',
    track: 'multi',
    tag: '10',
    title: 'Multi-Qubit States & Tensor Products',
    level: 'Intermediate',
    time: '14 min',
    desc: 'How two qubits combine into a four-amplitude state \u2014 and why that grows fast.',
    formula: '|a\u27e9 \u2297 |b\u27e9,  dim = 2\u207f',
    experiment: 'Increase the qubit count in the Lab and watch the statevector list double each time.',
    theory: [
      {
        heading: 'Combining systems',
        body: 'Two qubits are described by a tensor product, giving basis states |00\u27e9, |01\u27e9, |10\u27e9, |11\u27e9 and four amplitudes. Three qubits give eight, n qubits give 2\u207f. This exponential growth is the resource quantum computing draws on \u2014 and the reason classical simulation runs out of memory.',
      },
      {
        heading: 'Product states',
        body: 'If a multi-qubit state can be written as |a\u27e9\u2297|b\u27e9, it is a product state and each qubit has its own well-defined state. (|00\u27e9+|01\u27e9)/\u221a2 factors as |0\u27e9\u2297(|0\u27e9+|1\u27e9)/\u221a2 \u2014 q0 is simply |0\u27e9 and q1 is in superposition, independently.',
      },
      {
        heading: 'Bit ordering',
        body: 'Conventions differ and cause endless confusion. Qniverse writes |q\u2080q\u2081\u2026\u27e9 with q0 leftmost, matching the wire order in the circuit diagram. Qiskit uses the opposite convention, so |01\u27e9 there means q0 = 1. Always check before comparing results across tools.',
      },
    ],
    misconception: '"n qubits store 2\u207f bits of data." They hold 2\u207f amplitudes internally, but measuring n qubits yields only n bits. Holland\u2019s theorem limits what you can extract \u2014 the exponential lives in the computation, not the readout.',
    check: {
      q: 'Is (|00\u27e9 + |01\u27e9)/\u221a2 entangled?',
      options: ['Yes', 'No \u2014 it factors', 'Only after measurement'],
      answer: 1,
      why: 'It factors as |0\u27e9\u2297(|0\u27e9+|1\u27e9)/\u221a2, so it is a product state, not entangled.',
    },
  },
  {
    id: 'entanglement',
    track: 'multi',
    tag: '11',
    title: 'Entanglement & Bell States',
    level: 'Intermediate',
    time: '18 min',
    desc: 'Create a Bell state and explore correlations no independent description can reproduce.',
    formula: '|\u03a6\u207a\u27e9 = (|00\u27e9 + |11\u27e9)/\u221a2',
    experiment: 'Build H(q0) \u2192 CNOT(q0,q1) and observe only 00/11 outcomes, then check each qubit on the Bloch tab.',
    theory: [
      {
        heading: 'The definition',
        body: 'A state is entangled if it cannot be written as a product of individual qubit states. |\u03a6\u207a\u27e9 = (|00\u27e9+|11\u27e9)/\u221a2 admits no such factorisation \u2014 there is simply no pair of single-qubit states whose tensor product gives it.',
      },
      {
        heading: 'The four Bell states',
        body: '|\u03a6\u00b1\u27e9 = (|00\u27e9 \u00b1 |11\u27e9)/\u221a2 and |\u03a8\u00b1\u27e9 = (|01\u27e9 \u00b1 |10\u27e9)/\u221a2 form a maximally entangled orthonormal basis for two qubits. All four come from the same H-then-CNOT circuit with X and Z applied to the inputs.',
      },
      {
        heading: 'What the Bloch sphere shows',
        body: 'Trace out one qubit of a Bell pair and you get the maximally mixed state \u2014 a Bloch vector of zero length, sitting at the centre. The whole pair is in a perfectly definite pure state, yet each part individually carries no information. All of the information lives in the correlation.',
      },
      {
        heading: 'No faster-than-light signalling',
        body: 'Measuring your half instantly determines the outcome of the other, however distant. But your own results are uniformly random regardless of what the other party does, so no message can be sent. Entanglement plus a classical channel is required \u2014 which is exactly the structure of teleportation.',
      },
    ],
    misconception: '"Entanglement lets you send information instantly." Local measurement statistics are unchanged by anything the distant party does. Correlation is only visible after comparing results over a classical channel.',
    check: {
      q: 'You measure q0 of |\u03a6\u207a\u27e9 and get 1. What will q1 give?',
      options: ['0', '1', 'Still random'],
      answer: 1,
      why: '|\u03a6\u207a\u27e9 contains only |00\u27e9 and |11\u27e9, so the outcomes are perfectly correlated \u2014 q1 must be 1.',
    },
  },

  /* --------------------------------------------------------- BEHAVIOR */
  {
    id: 'interference',
    track: 'behavior',
    tag: '12',
    title: 'Interference & Amplitude Amplification',
    level: 'Advanced',
    time: '17 min',
    desc: 'The mechanism every quantum speedup ultimately relies on.',
    formula: '(1/\u221a2 \u2212 1/\u221a2) = 0  \u2014 destructive interference',
    experiment: 'Apply H twice to |0\u27e9. The |1\u27e9 amplitudes cancel exactly, returning |0\u27e9 with certainty.',
    theory: [
      {
        heading: 'Constructive and destructive',
        body: 'When two computational paths lead to the same outcome, their amplitudes add before squaring. Same sign: they reinforce (constructive). Opposite signs: they cancel (destructive). Classical probabilities can only ever add, never cancel \u2014 this is the fundamental difference.',
      },
      {
        heading: 'H\u00b7H as the simplest example',
        body: 'The first H sends |0\u27e9 to (|0\u27e9+|1\u27e9)/\u221a2. The second sends |0\u27e9 to (|0\u27e9+|1\u27e9)/\u221a2 and |1\u27e9 to (|0\u27e9\u2212|1\u27e9)/\u221a2. The |1\u27e9 contributions are +1/2 and \u22121/2, which cancel exactly; the |0\u27e9 contributions are both +1/2 and reinforce to 1. Out comes |0\u27e9 with certainty.',
      },
      {
        heading: 'Phase kickback',
        body: 'When a controlled-U acts on a target that is an eigenstate of U, the eigenvalue\u2019s phase appears on the control instead of the target. The target is unchanged; the control carries the answer. Deutsch, Bernstein\u2013Vazirani and phase estimation all run on this single trick.',
      },
      {
        heading: 'Amplitude amplification',
        body: 'Grover\u2019s algorithm alternates two reflections: an oracle that flips the sign of the marked state, and a diffusion operator that reflects all amplitudes about their mean. Each round rotates the state vector a little closer to the target. After roughly (\u03c0/4)\u221aN rounds it lands on the answer \u2014 and running too many rounds overshoots and makes things worse.',
      },
    ],
    misconception: '"More Grover iterations means a better answer." The state rotates; past the optimal (\u03c0/4)\u221aN rounds it rotates away from the target and the success probability falls.',
    check: {
      q: 'Why does H\u00b7H return |0\u27e9 exactly?',
      options: ['Rounding', 'The |1\u27e9 amplitudes cancel', 'H erases superposition'],
      answer: 1,
      why: 'The two paths to |1\u27e9 carry amplitudes +1/2 and \u22121/2, which destructively interfere to zero.',
    },
  },

  /* --------------------------------------------------------- ADVANCED */
  {
    id: 'circuits',
    track: 'advanced',
    tag: '13',
    title: 'Circuits, Depth & Reversibility',
    level: 'Advanced',
    time: '20 min',
    desc: 'Compose gates, controlled operations and measurement into executable algorithms.',
    formula: 'U = U\u2099 \u2026 U\u2082 U\u2081',
    experiment: 'Build a circuit, animate it step-by-step and explain each transformation.',
    theory: [
      {
        heading: 'Reading a circuit',
        body: 'Wires are qubits, time flows left to right, and boxes are gates. Crucially, the matrix product runs right to left: a circuit drawn H then CNOT is the operator CNOT\u00b7H. Diagram order and algebra order are reversed, which trips up nearly everyone at first.',
      },
      {
        heading: 'Depth versus width',
        body: 'Width is the qubit count; depth is the number of sequential gate layers. Gates acting on disjoint qubits share one layer because they run in parallel. On real hardware depth is the binding constraint \u2014 every extra layer gives decoherence more time to corrupt the state.',
      },
      {
        heading: 'Reversibility and uncomputation',
        body: 'Because every gate is unitary, any circuit can be run backwards by applying the inverse gates in reverse order. This is used deliberately: ancilla qubits holding intermediate results are "uncomputed" back to |0\u27e9 so their entanglement does not spoil the interference you are trying to engineer.',
      },
      {
        heading: 'Optimisation',
        body: 'Adjacent gates that cancel (H\u00b7H, X\u00b7X) can be removed; rotations about the same axis merge into one; commuting gates can be reordered to reduce depth. Real compilers also handle qubit routing, since hardware rarely lets every pair of qubits interact directly.',
      },
    ],
    misconception: '"Circuit depth is just the gate count." Gates on disjoint qubits occupy the same layer. A 10-gate circuit across 5 qubits may have depth 2.',
    check: {
      q: 'A circuit shows H on q0 then CNOT(q0,q1). What is the operator?',
      options: ['H \u00b7 CNOT', 'CNOT \u00b7 H', 'H + CNOT'],
      answer: 1,
      why: 'Matrix products apply right to left, so the first gate drawn sits rightmost: CNOT\u00b7H.',
    },
  },
  {
    id: 'noise',
    track: 'advanced',
    tag: '14',
    title: 'Noise, Decoherence & NISQ',
    level: 'Advanced',
    time: '16 min',
    desc: 'Why real quantum hardware is hard, and what error correction promises.',
    formula: 'T\u2081, T\u2082 \u2014 relaxation and dephasing times',
    experiment: 'Qniverse simulates ideal noiseless gates. Compare that with the error rates quoted below.',
    theory: [
      {
        heading: 'Decoherence',
        body: 'A qubit coupled to its environment leaks information into it. T\u2081 measures energy relaxation (|1\u27e9 decaying to |0\u27e9); T\u2082 measures dephasing (loss of relative phase). Today these run from tens to hundreds of microseconds \u2014 every gate must finish well inside that window.',
      },
      {
        heading: 'Gate and readout errors',
        body: 'Single-qubit gates on current hardware have error rates around 0.1%, two-qubit gates closer to 0.5\u20131%, and measurement 1\u20132%. Errors compound: a circuit with 1,000 two-qubit gates at 1% error has essentially no chance of running cleanly end to end.',
      },
      {
        heading: 'NISQ',
        body: 'Noisy Intermediate-Scale Quantum describes the current era: hundreds of qubits, no error correction, depth limited by noise. Algorithms designed for it \u2014 VQE, QAOA \u2014 use shallow circuits with classical optimisation loops, trading depth for repetition.',
      },
      {
        heading: 'Error correction and logical qubits',
        body: 'Quantum error correction spreads one logical qubit across many physical ones, detecting errors via syndrome measurements without ever measuring the data itself. The surface code is the leading candidate, needing roughly 1,000 physical qubits per logical qubit at current error rates. Below a threshold error rate, adding qubits makes the logical qubit better \u2014 that is the road to fault tolerance.',
      },
    ],
    misconception: '"Error correction just copies the qubit three times." The no-cloning theorem forbids copying. QEC instead entangles the data across several qubits and measures parity checks, which reveal errors without revealing (and thus collapsing) the encoded state.',
    check: {
      q: 'Why can quantum error correction not simply copy a qubit?',
      options: ['Too expensive', 'The no-cloning theorem', 'Copies decohere faster'],
      answer: 1,
      why: 'No-cloning forbids making an independent copy of an unknown state, so QEC uses entanglement and parity measurements instead.',
    },
  },
];

export function getLesson(id) {
  return lessons.find((l) => l.id === id);
}
