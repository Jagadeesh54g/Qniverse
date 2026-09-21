// One grader for every backend.  Input is always the common circuit format:
//   circuit = { n, ops: [{ g, q, p? }] }
// Output is a verdict plus per-case results.
import { GATES } from './gates.js';
import {
  runOps, zeroState, distribution, idxOfBits, fidelity, qubitFidelity,
  unitaryColumns, unitaryOverlap,
} from './sim.js';

const TOL = 1e-6;
const isSpecial = (g) => g === 'measure' || g === 'barrier' || g === 'oracle';

/* ---------- statistics ---------- */

export function analyze(circuit) {
  const ops = (circuit && circuit.ops) || [];
  const counts = {};
  let gates = 0;
  let twoQubit = 0;
  let oracleCalls = 0;
  let maxQ = -1;
  for (const op of ops) for (const q of op.q || []) maxQ = Math.max(maxQ, q);
  const free = new Array(Math.max(maxQ + 1, 1)).fill(0);
  let depth = 0;
  for (const op of ops) {
    if (op.g === 'oracle') { oracleCalls += 1; continue; }
    if (isSpecial(op.g)) continue;
    gates += 1;
    counts[op.g] = (counts[op.g] || 0) + 1;
    if (op.q.length >= 2) twoQubit += 1;
    const layer = 1 + Math.max(...op.q.map((q) => free[q]));
    for (const q of op.q) free[q] = layer;
    depth = Math.max(depth, layer);
  }
  return { gates, depth, twoQubit, oracleCalls, counts };
}

export function compareToReference(user, ref) {
  const better = user.gates < ref.gates || (user.gates === ref.gates && user.depth < ref.depth);
  const equal = user.gates === ref.gates && user.depth === ref.depth;
  const worse = user.gates > ref.gates;
  let verdict = 'close';
  if (better) verdict = 'better';
  else if (equal) verdict = 'equal';
  else if (worse) verdict = 'worse';
  return verdict;
}

/* ---------- validation ---------- */

function validate(problem, circuit) {
  if (!circuit || !Array.isArray(circuit.ops)) return { error: 'No circuit was produced.' };
  const n = problem.n;
  const oracleSpec = problem.grading.oracle;
  const measured = new Set();
  const ops = [];
  for (const op of circuit.ops) {
    if (op.g === 'barrier') continue;
    if (op.g === 'measure') { measured.add(op.q[0]); continue; }
    if (op.g === 'oracle') {
      if (!oracleSpec) return { error: 'This problem has no oracle — remove the oracle call.' };
      const want = oracleSpec.qubits.join(', ');
      if (op.q.join(',') !== oracleSpec.qubits.join(',')) {
        return { error: `The oracle must be applied to qubits ${want} in that order (you used ${op.q.join(', ')}).` };
      }
    } else if (!GATES[op.g]) {
      return { error: `Unsupported gate "${op.g}".` };
    }
    for (const q of op.q) {
      if (!Number.isInteger(q) || q < 0) return { error: `Invalid qubit index ${q}.` };
      if (q >= n) return { error: `Qubit ${q} does not exist — this problem has ${n} qubit${n === 1 ? '' : 's'} (0 to ${n - 1}).` };
      if (measured.has(q)) {
        return {
          error:
            `Qubit ${q} is used after it was measured. Mid-circuit measurement isn't supported — ` +
            'the grader reads exact probabilities, so measure at the end (or not at all).',
        };
      }
    }
    ops.push(op);
  }
  return { ops };
}

/* ---------- rules ---------- */

function checkRules(problem, ops, stats) {
  const rules = problem.grading.rules || {};
  const used = new Set(ops.filter((o) => o.g !== 'oracle').map((o) => o.g));
  const list = (a) => a.map((g) => g.toUpperCase()).join(', ');
  if (rules.allowed) {
    const bad = [...used].filter((g) => !rules.allowed.includes(g));
    if (bad.length) return `Only these gates are allowed: ${list(rules.allowed)}. You used ${list(bad)}.`;
  }
  if (rules.forbid) {
    const bad = [...used].filter((g) => rules.forbid.includes(g));
    if (bad.length) return `These gates are not allowed here: ${list(bad)}.`;
  }
  if (rules.require) {
    const missing = rules.require.filter((g) => !used.has(g));
    if (missing.length) return `Your circuit must use: ${list(missing)}.`;
  }
  if (rules.forbidPairs) {
    for (const op of ops) {
      if (op.q.length < 2) continue;
      for (const [a, b] of rules.forbidPairs) {
        if (op.q.includes(a) && op.q.includes(b)) {
          return `A gate may not act on qubits ${a} and ${b} together (${op.g.toUpperCase()} on ${op.q.join(', ')}).`;
        }
      }
    }
  }
  // "Alice has finished": once a gate touches `after`, gates may not touch `qubits` any more.
  if (rules.noTouchAfter) {
    for (const { qubits, after } of rules.noTouchAfter) {
      const first = ops.findIndex((o) => o.g !== 'oracle' && o.q.includes(after));
      if (first < 0) continue;
      for (let i = first + 1; i < ops.length; i++) {
        const hit = ops[i].q.find((q) => qubits.includes(q));
        if (hit !== undefined) {
          return `Qubit ${hit} is used (${ops[i].g.toUpperCase()}) after a gate has already acted on qubit ${after}. ` +
            `Finish all gates on qubit${qubits.length > 1 ? 's' : ''} ${qubits.join(' and ')} first.`;
        }
      }
    }
  }
  // Like noTouchAfter, but later gates are fine when they also act on `after` (deferred-measurement controls).
  if (rules.controlOnlyAfter) {
    for (const { qubits, after } of rules.controlOnlyAfter) {
      const first = ops.findIndex((o) => o.g !== 'oracle' && o.q.includes(after));
      if (first < 0) continue;
      for (let i = first + 1; i < ops.length; i++) {
        const hit = ops[i].q.find((q) => qubits.includes(q));
        if (hit !== undefined && !ops[i].q.includes(after)) {
          return `Qubit ${hit} is used on its own (${ops[i].g.toUpperCase()}) after qubit ${after} was already touched. ` +
            `From then on qubit${qubits.length > 1 ? 's' : ''} ${qubits.join(' and ')} may only act as controls of gates on qubit ${after}.`;
        }
      }
    }
  }
  // A qubit that may only ever be the target: no SWAPs, and it must be the last operand.
  if (rules.targetOnly) {
    const symmetric = new Set(['cz', 'ccz', 'cp']);
    for (const t of rules.targetOnly) {
      for (const op of ops) {
        if (op.g === 'oracle' || op.q.length < 2 || !op.q.includes(t)) continue;
        if (op.g === 'swap' || op.g === 'cswap' || (!symmetric.has(op.g) && op.q[op.q.length - 1] !== t)) {
          return `Qubit ${t} may only be the target of a gate — ${op.g.toUpperCase()} on ${op.q.join(', ')} moves information out of it.`;
        }
      }
    }
  }
  if (rules.oracleCalls) {
    const { min = 0, max = Infinity } = rules.oracleCalls;
    const calls = stats.oracleCalls;
    if (calls < min || calls > max) {
      const want = min === max ? `exactly ${min}` : max === Infinity ? `at least ${min}` : `${min}–${max}`;
      return `The oracle must be called ${want} time${want === '1' || want === 'exactly 1' ? '' : 's'}; your circuit calls it ${calls}.`;
    }
  }
  return null;
}

/* ---------- running a case ---------- */

// Replace oracle markers by the case's black box, mapping local qubit k → marker.q[k].
function expandOracle(ops, c) {
  const out = [];
  for (const op of ops) {
    if (op.g !== 'oracle') { out.push(op); continue; }
    for (const inner of (c.oracle && c.oracle.ops) || []) {
      out.push({ ...inner, q: inner.q.map((k) => op.q[k]) });
    }
  }
  return out;
}

const fmtPct = (p) => `${(p * 100).toFixed(1)}%`;
export const fmtDist = (d) => {
  const keys = Object.keys(d).sort();
  return keys.length ? keys.map((k) => `${k}: ${fmtPct(d[k])}`).join(', ') : '(empty)';
};

function targetState(n, ck) {
  if (ck.ops) return runOps(n, ck.ops);
  const st = zeroState(n);
  st.re[0] = 0;
  for (const [bits, amp] of Object.entries(ck.amps)) {
    const [re, im] = Array.isArray(amp) ? amp : [amp, 0];
    const idx = idxOfBits(bits);
    st.re[idx] = re;
    st.im[idx] = im;
  }
  return st;
}

function evalCheck(problem, ops, c, ck, st) {
  const n = problem.n;
  switch (ck.type) {
    case 'state': {
      const f = fidelity(targetState(n, ck), st);
      return {
        pass: f >= 1 - TOL,
        detail: { kind: 'fidelity', value: f },
        message: `Final state has fidelity ${f.toFixed(4)} with the target (needs 1.0000, global phase ignored).`,
      };
    }
    case 'qubitState': {
      const t = targetState(1, ck);
      const f = qubitFidelity(st, ck.qubit, [[t.re[0], t.im[0]], [t.re[1], t.im[1]]]);
      return {
        pass: f >= 1 - TOL,
        detail: { kind: 'fidelity', value: f },
        message: `Qubit ${ck.qubit} matches the target state with fidelity ${f.toFixed(4)} (needs 1.0000).`,
      };
    }
    case 'probs': {
      const got = distribution(st, ck.qubits);
      let worst = 0;
      for (const k of new Set([...Object.keys(got), ...Object.keys(ck.dist)])) {
        worst = Math.max(worst, Math.abs((got[k] || 0) - (ck.dist[k] || 0)));
      }
      const where = `qubit${ck.qubits.length > 1 ? 's' : ''} ${ck.qubits.join(', ')}`;
      return {
        pass: worst <= (ck.tol || TOL),
        detail: { kind: 'probs', qubits: ck.qubits, got, expected: ck.dist },
        message: `Measuring ${where}: expected ${fmtDist(ck.dist)}, got ${fmtDist(got)}.`,
      };
    }
    case 'probAtLeast':
    case 'probAtMost': {
      const d = distribution(st, ck.qubits);
      const value = d[ck.bits] || 0;
      const atLeast = ck.type === 'probAtLeast';
      const pass = atLeast ? value >= ck.value - TOL : value <= ck.value + TOL;
      return {
        pass,
        detail: { kind: 'prob', bits: ck.bits, value, bound: ck.value, atLeast },
        message: `P(${ck.bits}) on qubit${ck.qubits.length > 1 ? 's' : ''} ${ck.qubits.join(', ')} is ${fmtPct(value)}; it must be ${atLeast ? 'at least' : 'at most'} ${fmtPct(ck.value)}.`,
      };
    }
    case 'unitary': {
      const target = unitaryColumns(n, ck.ops);
      const user = unitaryColumns(n, expandOracle(ops, c));
      const o = unitaryOverlap(target, user);
      return {
        pass: o >= 1 - TOL,
        detail: { kind: 'fidelity', value: o },
        message: `Your circuit is not equivalent to the target operation (match ${o.toFixed(4)}; global phase is ignored).`,
      };
    }
    default:
      throw new Error(`Unknown check type ${ck.type}`);
  }
}

function runCase(problem, ops, c, index) {
  const start = [...(c.prefix || []), ...expandOracle(ops, c)];
  let st = null;
  const needsState = c.checks.some((ck) => ck.type !== 'unitary');
  if (needsState) st = runOps(problem.n, start);
  let failure = null;
  const details = [];
  for (const ck of c.checks) {
    const r = evalCheck(problem, ops, c, ck, st);
    details.push(r.detail);
    if (!r.pass && !failure) failure = r.message;
  }
  return {
    index,
    name: c.name,
    visible: c.visible !== false,
    pass: !failure,
    message: failure,
    detail: details[0],
    details,
  };
}

/* ---------- public API ---------- */

// mode: 'run' → visible cases only, 'submit' → all cases
export function gradeCircuit(problem, circuit, { mode = 'submit' } = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const done = (r) => ({ ...r, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0), mode });

  const v = validate(problem, circuit);
  if (v.error) return done({ verdict: 'error', message: v.error, cases: [], stats: null });

  const stats = analyze({ ops: v.ops });
  const ruleMsg = checkRules(problem, v.ops, stats);
  if (ruleMsg) return done({ verdict: 'rule', message: ruleMsg, cases: [], stats });

  const cases = [];
  try {
    problem.grading.cases.forEach((c, i) => {
      if (mode === 'run' && c.visible === false) return;
      cases.push(runCase(problem, v.ops, c, i));
    });
  } catch (e) {
    return done({ verdict: 'error', message: `Simulation failed: ${e.message}`, cases, stats });
  }

  const passed = cases.filter((c) => c.pass).length;
  const allPass = passed === cases.length;
  let verdict = 'wrong';
  if (allPass) verdict = mode === 'run' ? 'samples' : 'accepted';
  return done({ verdict, cases, passed, total: cases.length, stats });
}

export const VERDICT_TITLES = {
  accepted: 'Accepted',
  samples: 'Sample cases passed',
  wrong: 'Wrong Answer',
  rule: 'Rule Violation',
  error: 'Error',
};
