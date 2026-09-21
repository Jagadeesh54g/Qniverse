export const ASSESSMENT = [
  {
    id: 'quantum-intuition',
    kind: 'single',
    title: 'A coin enters a sealed quantum chamber.',
    prompt: 'Before anyone looks, which idea feels closest to a qubit in superposition?',
    hint: 'Think beyond an ordinary hidden coin.',
    options: [
      ['a', 'It is simply either 0 or 1; we just do not know which.', 0],
      ['b', 'Its state can be a weighted combination of |0⟩ and |1⟩.', 15],
      ['c', 'It randomly changes between 0 and 1 every second.', 5],
      ['d', 'It stores both classical values as two separate bits.', 2],
    ],
  },
  {
    id: 'probability',
    kind: 'single',
    title: 'The probability compass.',
    prompt: 'A fair quantum experiment gives 50% |0⟩ and 50% |1⟩. After 1000 shots, what would you expect?',
    hint: 'Measurements are samples, not a guarantee for every run.',
    options: [
      ['a', 'Exactly 500 and 500 every time.', 4],
      ['b', 'Roughly 500 and 500, with natural statistical variation.', 15],
      ['c', 'Only |0⟩ because quantum states are deterministic.', 0],
      ['d', 'The probabilities become 100% after the first shot.', 0],
    ],
  },
  {
    id: 'circuit-reasoning',
    kind: 'single',
    title: 'A tiny circuit mystery.',
    prompt: 'You start with |0⟩, apply H, then H again. What should the final state be?',
    hint: 'The Hadamard gate is self-inverse.',
    options: [
      ['a', '|0⟩', 15],
      ['b', '|1⟩', 2],
      ['c', 'An equal mixture of |0⟩ and |1⟩', 6],
      ['d', 'It cannot be predicted without hardware.', 0],
    ],
  },
  {
    id: 'math',
    kind: 'single',
    title: 'The state-vector checkpoint.',
    prompt: 'How comfortable are you reading a 2×2 matrix such as [[0,1],[1,0]]?',
    hint: 'This is about your starting point, not a pass/fail test.',
    options: [
      ['a', 'I have not worked with matrices yet.', 2],
      ['b', 'I know rows/columns and basic matrix operations.', 7],
      ['c', 'I am comfortable with vectors, matrices and complex numbers.', 13],
      ['d', 'I can reason about unitary matrices and eigenvectors.', 15],
    ],
  },
  {
    id: 'programming',
    kind: 'single',
    title: 'The circuit-builder instinct.',
    prompt: 'Which description feels most like your current coding experience?',
    hint: 'Choose the closest match, even if you are self-taught.',
    options: [
      ['a', 'I am just beginning to learn programming.', 2],
      ['b', 'I can write small programs and use loops/functions.', 7],
      ['c', 'I regularly solve problems and build applications.', 12],
      ['d', 'I am comfortable with algorithms, debugging and multiple languages.', 15],
    ],
  },
  {
    id: 'quantum-exposure',
    kind: 'single',
    title: 'Your quantum coordinates.',
    prompt: 'Which quantum-computing experience have you already had?',
    hint: 'There is no wrong answer.',
    options: [
      ['a', 'This is my first serious encounter.', 0],
      ['b', 'I know the vocabulary and have watched/read introductions.', 5],
      ['c', 'I have built circuits or used a simulator/SDK.', 10],
      ['d', 'I have implemented or studied several algorithms in depth.', 15],
    ],
  },
  {
    id: 'challenge',
    kind: 'single',
    title: 'Choose your first mission.',
    prompt: 'What would make Qniverse immediately useful to you?',
    hint: 'This sets your learning route more than your level.',
    options: [
      ['a', 'Build intuition from zero.', 0],
      ['b', 'Master circuits, gates and algorithms.', 0],
      ['c', 'Prepare for research, papers and advanced theory.', 0],
      ['d', 'Experiment with simulators, hardware and real projects.', 0],
    ],
  },
];

export function scoreAssessment(answers) {
  let score = 0;
  const dimensions = { intuition: 0, probability: 0, circuit: 0, mathematics: 0, programming: 0, exposure: 0 };

  for (const question of ASSESSMENT) {
    const value = answers?.[question.id];
    const option = question.options.find(([key]) => key === value);
    if (!option) continue;
    score += option[2];
    if (question.id === 'quantum-intuition') dimensions.intuition = option[2];
    if (question.id === 'probability') dimensions.probability = option[2];
    if (question.id === 'circuit-reasoning') dimensions.circuit = option[2];
    if (question.id === 'math') dimensions.mathematics = option[2];
    if (question.id === 'programming') dimensions.programming = option[2];
    if (question.id === 'quantum-exposure') dimensions.exposure = option[2];
  }

  const level = score < 30 ? 'curious' : score < 55 ? 'foundation' : score < 75 ? 'intermediate' : score < 92 ? 'advanced' : 'research';
  const goal = answers?.challenge;
  const path = goal === 'a'
    ? ['What is Computing?', 'Classical Bits', 'What is a Qubit?', 'Superposition', 'Measurement']
    : goal === 'b'
      ? ['Quantum Gates', 'Hadamard', 'CNOT', 'Entanglement', 'Bell States', 'Grover']
      : goal === 'c'
        ? ['Linear Algebra for Quantum', 'Multiple-Qubit States', 'Interference', 'QFT', 'Phase Estimation']
        : ['What is a Qubit?', 'Quantum Gates', 'Circuit Builder', 'Noise', 'Real Quantum Computing'];

  return { score, level, dimensions, recommendedPath: path };
}
