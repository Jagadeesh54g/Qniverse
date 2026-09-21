'use client';
// A dependency-free code editor: a transparent <textarea> on top of a syntax-highlighted <pre>.
// Tab / Shift+Tab indent, Enter keeps indentation, Ctrl/Cmd+Enter = Run, Ctrl/Cmd+Shift+Enter = Submit.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { GATES } from '../../lib/challenges/gates.js';

const PY_KW = new Set(('and as assert break class continue def del elif else except False finally for from global if import in is ' +
  'lambda None nonlocal not or pass raise return True try while with yield').split(' '));
const PY_FN = new Set(['range', 'len', 'print', 'int', 'float', 'sum', 'min', 'max', 'abs', 'sqrt', 'acos', 'asin', 'atan', 'sin', 'cos']);
const PY_LIB = new Set(['cirq', 'qml', 'QuantumCircuit', 'Oracle', 'pi', 'qc', 'circuit']);
const QASM_KW = new Set(['OPENQASM', 'include', 'qubit', 'bit', 'qreg', 'creg', 'measure', 'barrier', 'oracle', 'pi']);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls, s) => `<span class="cx-tok-${cls}">${esc(s)}</span>`;

export function highlight(code, lang) {
  const re = lang === 'qasm'
    ? /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*")|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\.\d+)|([A-Za-zπ_][A-Za-z0-9_]*)/g
    : /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    if (m[1] !== undefined) out += span('comment', m[0]);
    else if (m[2] !== undefined) out += span('string', m[0]);
    else if (m[3] !== undefined) out += span('number', m[0]);
    else {
      const w = m[0];
      if (lang === 'qasm') {
        if (QASM_KW.has(w)) out += span('kw', w);
        else if (GATES[w]) out += span('gate', w);
        else out += esc(w);
      } else if (PY_KW.has(w)) out += span('kw', w);
      else if (PY_LIB.has(w)) out += span('lib', w);
      else if (PY_FN.has(w)) out += span('gate', w);
      else out += esc(w);
    }
    last = re.lastIndex;
  }
  out += esc(code.slice(last));
  return out + '\n'; // keeps the last empty line the same height as in the textarea
}

export default function CodeEditor({ value, onChange, lang = 'python', onRun, onSubmit, readOnly = false, ariaLabel = 'Code editor' }) {
  const ta = useRef(null);
  const pre = useRef(null);
  const gutter = useRef(null);
  const pendingSel = useRef(null);
  const indent = lang === 'qasm' ? '  ' : '    ';

  const html = useMemo(() => highlight(value, lang), [value, lang]);
  const lines = useMemo(() => value.split('\n').length, [value]);

  useLayoutEffect(() => {
    if (pendingSel.current && ta.current) {
      ta.current.setSelectionRange(pendingSel.current[0], pendingSel.current[1]);
      pendingSel.current = null;
    }
  });

  const sync = () => {
    if (!ta.current) return;
    if (pre.current) { pre.current.scrollTop = ta.current.scrollTop; pre.current.scrollLeft = ta.current.scrollLeft; }
    if (gutter.current) gutter.current.style.transform = `translateY(${-ta.current.scrollTop}px)`;
  };

  const edit = (next, selStart, selEnd = selStart) => {
    pendingSel.current = [selStart, selEnd];
    onChange(next);
  };

  const onKeyDown = (e) => {
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onSubmit && onSubmit();
      else onRun && onRun();
      return;
    }
    if (readOnly) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', a - 1) + 1;
      if (a === b && !e.shiftKey) {
        edit(value.slice(0, a) + indent + value.slice(b), a + indent.length);
        return;
      }
      // (un)indent every selected line
      const blockEnd = value.indexOf('\n', b) === -1 ? value.length : value.indexOf('\n', b);
      const block = value.slice(lineStart, blockEnd).split('\n');
      let delta0 = 0;
      let total = 0;
      const changed = block.map((ln, i) => {
        if (e.shiftKey) {
          const lead = (ln.match(/^ */) || [''])[0].length;
          const strip = ln.startsWith(indent) ? indent.length : Math.min(lead, indent.length);
          if (i === 0) delta0 = -strip;
          total -= strip;
          return ln.slice(strip);
        }
        if (i === 0) delta0 = indent.length;
        total += indent.length;
        return indent + ln;
      });
      edit(value.slice(0, lineStart) + changed.join('\n') + value.slice(blockEnd), Math.max(lineStart, a + delta0), b + total);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', a - 1) + 1;
      const cur = value.slice(lineStart, a);
      let pad = (cur.match(/^[ \t]*/) || [''])[0];
      if (lang === 'python' && /:\s*$/.test(cur)) pad += indent;
      if (lang === 'qasm' && /\{\s*$/.test(cur)) pad += indent;
      const ins = '\n' + pad;
      edit(value.slice(0, a) + ins + value.slice(b), a + ins.length);
    }
  };

  return (
    <div className="cx-editor">
      <div className="cx-gutter" aria-hidden="true">
        <div ref={gutter}>
          {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
        </div>
      </div>
      <div className="cx-editor-body">
        <pre ref={pre} className="cx-hl" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
        <textarea
          ref={ta}
          className="cx-ta"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          readOnly={readOnly}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={sync}
        />
      </div>
    </div>
  );
}
