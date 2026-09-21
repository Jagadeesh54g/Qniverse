// OpenQASM 3 (and the common OpenQASM 2 spellings) → common circuit format.
//   circuit = { n, ops: [{ g, q: [..], p?: [..] }] }
// `oracle q[0], q[1];` is the black-box marker used by oracle-style problems.
import { GATES, resolveGateName } from './gates.js';

export class QasmError extends Error {
  constructor(message, line) {
    super(line ? `Line ${line}: ${message}` : message);
    this.line = line;
  }
}

/* ---------- safe expression evaluator (no eval) ---------- */

const CONSTS = { pi: Math.PI, 'π': Math.PI, tau: 2 * Math.PI, 'τ': 2 * Math.PI, euler: Math.E };
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  arcsin: Math.asin, asin: Math.asin,
  arccos: Math.acos, acos: Math.acos,
  arctan: Math.atan, atan: Math.atan,
  exp: Math.exp, ln: Math.log, log: Math.log, sqrt: Math.sqrt,
};

export function evalExpr(src, line) {
  const s = String(src);
  let i = 0;
  const fail = (m) => { throw new QasmError(m, line); };
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };

  function atom() {
    ws();
    if (s[i] === '(') {
      i++;
      const v = expr();
      ws();
      if (s[i] !== ')') fail(`Missing ")" in expression "${s}"`);
      i++;
      return v;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
    if (num) { i += num[0].length; return parseFloat(num[0]); }
    const id = /^[A-Za-zπτ_][A-Za-z0-9_]*/.exec(s.slice(i));
    if (id) {
      const name = id[0];
      i += name.length;
      ws();
      if (s[i] === '(') {
        if (!FUNCS[name]) fail(`Unknown function "${name}"`);
        i++;
        const v = expr();
        ws();
        if (s[i] !== ')') fail(`Missing ")" after ${name}(`);
        i++;
        return FUNCS[name](v);
      }
      if (name in CONSTS) return CONSTS[name];
      return fail(`Unknown name "${name}" in expression "${s}"`);
    }
    return fail(`Cannot read expression "${s}"`);
  }
  function power() {
    const base = atom();
    ws();
    if (s.startsWith('**', i)) { i += 2; return Math.pow(base, unary()); }
    return base;
  }
  function unary() {
    ws();
    if (s[i] === '-') { i++; return -unary(); }
    if (s[i] === '+') { i++; return unary(); }
    return power();
  }
  function term() {
    let v = unary();
    for (;;) {
      ws();
      if (s[i] === '*' && s[i + 1] !== '*') { i++; v *= unary(); }
      else if (s[i] === '/') { i++; v /= unary(); }
      else return v;
    }
  }
  function expr() {
    let v = term();
    for (;;) {
      ws();
      if (s[i] === '+') { i++; v += term(); }
      else if (s[i] === '-') { i++; v -= term(); }
      else return v;
    }
  }
  const out = expr();
  ws();
  if (i < s.length) fail(`Unexpected "${s.slice(i)}" in expression "${s}"`);
  if (!Number.isFinite(out)) fail(`Expression "${s}" is not a finite number`);
  return out;
}

/* ---------- statements ---------- */

// Remove comments, keep line numbers, split on ';'.
function statements(src) {
  const out = [];
  let cur = '';
  let line = 1;
  let startLine = 1;
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      i--;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === '\n') { line++; cur += ' '; continue; }
    if (!cur.trim()) startLine = line;
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === ';' && depth === 0) {
      if (cur.trim()) out.push({ text: cur.trim(), line: startLine });
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push({ text: cur.trim(), line: startLine });
  return out;
}

const UNSUPPORTED = /^(if|for|while|def|gate|input|output|let|const|int|uint|float|angle|bool|array|reset|delay|box|switch|cal|defcal|extern|duration|stretch)\b/;

export function parseQasm(src) {
  const qregs = {}; // name -> { offset, size }
  let total = 0;
  const cregs = {};
  const ops = [];

  const qubitRef = (tok, line) => {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[\s*([^\]]+)\s*\])?$/.exec(tok.trim());
    if (!m) throw new QasmError(`Cannot read qubit "${tok.trim()}"`, line);
    const reg = qregs[m[1]];
    if (!reg) throw new QasmError(`Unknown qubit register "${m[1]}"`, line);
    if (m[2] === undefined) return { reg, all: true };
    const idx = evalExpr(m[2], line);
    if (!Number.isInteger(idx) || idx < 0 || idx >= reg.size) {
      throw new QasmError(`Qubit index ${m[2]} is out of range for ${m[1]}[${reg.size}]`, line);
    }
    return { reg, index: reg.offset + idx };
  };

  const splitTop = (str) => {
    const parts = [];
    let depth = 0;
    let cur = '';
    for (const ch of str) {
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    return parts;
  };

  for (const { text, line } of statements(String(src))) {
    let m;
    if (/^OPENQASM\b/i.test(text) || /^include\b/.test(text)) continue;

    // qubit[n] q;  qubit q;  qreg q[n];
    if ((m = /^qubit\s*(?:\[\s*(\d+)\s*\])?\s+([A-Za-z_]\w*)$/.exec(text))) {
      const size = m[1] === undefined ? 1 : parseInt(m[1], 10);
      qregs[m[2]] = { offset: total, size };
      total += size;
      continue;
    }
    if ((m = /^qreg\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]$/.exec(text))) {
      qregs[m[1]] = { offset: total, size: parseInt(m[2], 10) };
      total += parseInt(m[2], 10);
      continue;
    }
    if ((m = /^bit\s*(?:\[\s*(\d+)\s*\])?\s+([A-Za-z_]\w*)$/.exec(text))) {
      cregs[m[2]] = m[1] === undefined ? 1 : parseInt(m[1], 10);
      continue;
    }
    if ((m = /^creg\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]$/.exec(text))) {
      cregs[m[1]] = parseInt(m[2], 10);
      continue;
    }

    // measurement, all spellings
    if (
      (m = /^measure\s+(.+?)\s*->\s*.+$/.exec(text)) ||
      (m = /^(?:bit(?:\s*\[\s*\d+\s*\])?\s+)?[A-Za-z_]\w*(?:\s*\[[^\]]+\])?\s*=\s*measure\s+(.+)$/.exec(text)) ||
      (m = /^measure\s+([^\s].*)$/.exec(text))
    ) {
      const ref = qubitRef(m[1], line);
      const list = ref.all
        ? Array.from({ length: ref.reg.size }, (_, k) => ref.reg.offset + k)
        : [ref.index];
      for (const q of list) ops.push({ g: 'measure', q: [q] });
      continue;
    }

    if (/^barrier\b/.test(text)) { ops.push({ g: 'barrier', q: [] }); continue; }

    if (UNSUPPORTED.test(text)) {
      const kw = UNSUPPORTED.exec(text)[1];
      throw new QasmError(
        `"${kw}" is not supported by the Qniverse runner. Write each gate out explicitly, or use a Python backend for loops.`,
        line,
      );
    }

    // gate application:  name(params) operands   (params may nest parentheses to any depth)
    m = /^([A-Za-z_]\w*)\s*/.exec(text);
    if (!m) throw new QasmError(`Cannot understand "${text}"`, line);
    const rawName = m[1];
    let rest = text.slice(m[0].length);
    let paramSrc;
    if (rest[0] === '(') {
      let depth = 0;
      let end = -1;
      for (let k = 0; k < rest.length; k++) {
        if (rest[k] === '(') depth++;
        else if (rest[k] === ')' && --depth === 0) { end = k; break; }
      }
      if (end < 0) throw new QasmError('Missing ")" in gate parameters', line);
      paramSrc = rest.slice(1, end);
      rest = rest.slice(end + 1).trim();
    }
    if (!rest) throw new QasmError(`Cannot understand "${text}" — which qubits should ${rawName} act on?`, line);
    const params = paramSrc === undefined || !paramSrc.trim() ? [] : splitTop(paramSrc).map((e) => evalExpr(e, line));
    const operands = splitTop(rest).map((t) => qubitRef(t, line));

    if (rawName.toLowerCase() === 'oracle') {
      if (operands.some((o) => o.all)) throw new QasmError('Give oracle explicit qubits, e.g. oracle q[0], q[1];', line);
      ops.push({ g: 'oracle', q: operands.map((o) => o.index) });
      continue;
    }

    const name = resolveGateName(rawName);
    if (!name) {
      throw new QasmError(
        `Unknown gate "${rawName}". Supported: ${Object.keys(GATES).join(', ')}`,
        line,
      );
    }
    const def = GATES[name];
    if (params.length !== def.np) {
      throw new QasmError(`${rawName} takes ${def.np} parameter${def.np === 1 ? '' : 's'}, got ${params.length}`, line);
    }
    // broadcast a single-qubit gate over a whole register: h q;
    if (def.n === 1 && operands.length === 1 && operands[0].all) {
      const { reg } = operands[0];
      for (let k = 0; k < reg.size; k++) {
        ops.push({ g: name, q: [reg.offset + k], ...(def.np ? { p: params } : {}) });
      }
      continue;
    }
    if (operands.length !== def.n) {
      throw new QasmError(`${rawName} acts on ${def.n} qubit${def.n === 1 ? '' : 's'}, got ${operands.length}`, line);
    }
    if (operands.some((o) => o.all)) throw new QasmError(`${rawName} needs explicit qubit indices, e.g. q[0]`, line);
    const q = operands.map((o) => o.index);
    if (new Set(q).size !== q.length) throw new QasmError(`${rawName} was given the same qubit twice`, line);
    ops.push({ g: name, q, ...(def.np ? { p: params } : {}) });
  }

  if (!total) throw new QasmError('No qubits declared. Start with e.g. "qubit[2] q;"');
  return { n: total, ops };
}
