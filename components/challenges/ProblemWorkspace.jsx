'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProblem, problems } from '../../lib/challenges/problems.js';
import { BACKENDS, exportCode, starterCode } from '../../lib/challenges/export.js';
import { analyze, gradeCircuit } from '../../lib/challenges/grader.js';
import { GATES } from '../../lib/challenges/gates.js';
import { fromCircuit, newId, toCircuit } from '../../lib/challenges/builder.js';
import { runCode, serverConfigured, warmUpPython } from '../../lib/challenges/runner.js';
import {
  clearDraft, loadDraft, markRevealed, recordSubmission, saveDraft, useProgress,
} from '../../lib/challenges/progress.js';
import CodeEditor from './CodeEditor.jsx';
import CircuitBuilder from './CircuitBuilder.jsx';
import ResultsPanel from './ResultsPanel.jsx';
import SolutionPanel from './SolutionPanel.jsx';
import { Inline, Paragraphs } from './RichText.jsx';

const TABS = [
  ['description', 'Description'],
  ['hints', 'Hints'],
  ['solution', 'Solution'],
  ['submissions', 'Submissions'],
];

const GATE_NAMES = Object.keys(GATES).join(' ');

export default function ProblemWorkspace({ slug }) {
  const problem = useMemo(() => getProblem(slug), [slug]);
  const progress = useProgress();
  const entry = progress && progress.problems[slug];
  const solved = Boolean(entry && entry.status === 'solved');
  const revealed = Boolean(entry && entry.revealed);

  const [tab, setTab] = useState('description');
  const [mode, setMode] = useState('code');
  const [backend, setBackend] = useState('qiskit');
  const [runtime, setRuntime] = useState('browser');
  const [codes, setCodes] = useState({});
  const [builder, setBuilder] = useState([]);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [banner, setBanner] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const loaded = useRef(false);

  const idx = problems.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? problems[idx - 1] : null;
  const next = idx < problems.length - 1 ? problems[idx + 1] : null;
  const backendInfo = BACKENDS.find((b) => b.id === backend);

  /* ---- load / save drafts ---- */
  useEffect(() => {
    loaded.current = false;
    const d = loadDraft(slug);
    setMode((d && d.mode) || 'code');
    setBackend((d && d.backend) || 'qiskit');
    setCodes((d && d.codes) || {});
    setBuilder(d && d.builder ? d.builder.map((o) => ({ ...o, id: newId() })) : []);
    setResult(null);
    setBanner(null);
    setHintsShown(0);
    setTab('description');
    loaded.current = true;
  }, [slug]);

  useEffect(() => {
    if (!loaded.current) return undefined;
    const t = setTimeout(() => saveDraft(slug, { mode, backend, codes, builder }), 400);
    return () => clearTimeout(t);
  }, [slug, mode, backend, codes, builder]);

  useEffect(() => {
    if (mode === 'code' && backendInfo && backendInfo.python && runtime === 'browser') warmUpPython();
  }, [mode, backendInfo, runtime]);

  const code = problem && (codes[backend] !== undefined ? codes[backend] : starterCode(problem, backend));

  const disabledGates = useMemo(() => {
    if (!problem) return [];
    const rules = problem.grading.rules || {};
    const all = Object.keys(GATES);
    return all.filter((g) => (rules.allowed && !rules.allowed.includes(g)) || (rules.forbid && rules.forbid.includes(g)));
  }, [problem]);

  const builderCircuit = useMemo(() => (problem ? toCircuit(problem.n, builder) : null), [problem, builder]);
  const generated = useMemo(() => {
    if (!problem || mode !== 'circuit') return '';
    try { return exportCode(backend, builderCircuit); } catch (e) { return `# ${e.message}`; }
  }, [problem, mode, backend, builderCircuit]);

  const execute = useCallback(async (kind) => {
    if (!problem || running) return;
    setRunning(kind);
    setBanner(null);
    let produced;
    if (mode === 'circuit') produced = { ok: true, circuit: builderCircuit, ranOn: 'browser' };
    else produced = await runCode({ backend, code, runtime });

    let res;
    if (!produced.ok) {
      res = {
        verdict: 'error', message: produced.error, cases: [], stats: null, ms: 0, mode: kind, stdout: produced.stdout, ranOn: produced.ranOn,
      };
    } else {
      res = gradeCircuit(problem, produced.circuit, { mode: kind });
      res.stdout = produced.stdout;
      res.ranOn = produced.ranOn;
      res.fellBack = produced.fellBack;
    }
    setResult(res);
    if (kind === 'submit') {
      const rec = recordSubmission({
        slug, difficulty: problem.difficulty, verdict: res.verdict, backend: mode === 'circuit' ? 'builder' : backend,
        mode, stats: res.stats, refGates: analyze({ ops: problem.reference.ops }).gates,
      });
      if (rec.firstSolve) setBanner({ xp: rec.xpGained });
    }
    setRunning(null);
  }, [problem, running, mode, builderCircuit, backend, code, runtime, slug]);

  if (!problem) {
    return (
      <div className="cx-root cx-page">
        <p>Challenge not found. <Link href="/challenges">Back to all challenges</Link></p>
      </div>
    );
  }

  const oracle = problem.grading.oracle;
  const lang = backendInfo.lang;
  const failed = entry ? entry.failed : 0;
  const unlocked = solved || revealed;
  const lastAccepted = result && result.verdict === 'accepted' ? result.stats : null;
  const userStats = lastAccepted || (entry && entry.bestGates != null ? { gates: entry.bestGates, depth: entry.bestDepth, twoQubit: 0 } : null);

  const setCode = (v) => setCodes((c) => ({ ...c, [backend]: v }));
  const reset = () => {
    if (mode === 'code') setCodes((c) => { const n = { ...c }; delete n[backend]; return n; });
    else setBuilder([]);
    setResult(null);
  };
  const resetAll = () => { clearDraft(slug); setCodes({}); setBuilder([]); setResult(null); };

  return (
    <div className="cx-root cx-work-page">
      <header className="cx-work-top">
        <Link href="/challenges" className="cx-back">← Challenges</Link>
        <div className="cx-work-title">
          <span className="cx-num">{problem.id}.</span> {problem.title}
          <span className={`cx-diff cx-diff-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
          {solved && <span className="cx-solved-pill">Solved</span>}
        </div>
        <nav className="cx-work-nav" aria-label="Challenge navigation">
          {prev ? <Link href={`/challenges/${prev.slug}`} aria-label={`Previous: ${prev.title}`}>‹ Prev</Link> : <span className="is-off">‹ Prev</span>}
          {next ? <Link href={`/challenges/${next.slug}`} aria-label={`Next: ${next.title}`}>Next ›</Link> : <span className="is-off">Next ›</span>}
        </nav>
        {progress && <span className="cx-xp">{progress.xp} XP</span>}
      </header>

      <div className="cx-work">
        {/* ------------------------------ left pane ------------------------------ */}
        <section className="cx-pane cx-left" aria-label="Problem">
          <div className="cx-tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
                {label}{id === 'solution' && !unlocked ? ' 🔒' : ''}
              </button>
            ))}
          </div>

          <div className="cx-left-body">
            {tab === 'description' && (
              <article className="cx-desc">
                <h1>{problem.id}. {problem.title}</h1>
                <div className="cx-tags">
                  <span className={`cx-diff cx-diff-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                  {problem.topics.map((t) => <span key={t} className="cx-topic">{t}</span>)}
                  <span className="cx-topic">{problem.n} qubit{problem.n > 1 ? 's' : ''}</span>
                </div>
                <Paragraphs items={problem.description} />
                <div className="cx-conv">
                  <b>Conventions.</b> Qubits start in <code>|0⟩</code>. Bitstrings are written <code>q0 q1 q2 …</code> left to right.
                  Measurement is exact — the grader reads the final probabilities, so you don&apos;t need <code>measure</code> gates.
                </div>
                {oracle && (
                  <div className="cx-conv">
                    <b>Black-box oracle.</b> <code>{oracle.label}</code> on qubits <code>{oracle.qubits.join(', ')}</code>. The grader replaces your oracle call
                    with several different hidden oracles, so your circuit must work for all of them.
                  </div>
                )}
                {problem.examples.map((ex, i) => (
                  <div key={i} className="cx-example">
                    <h4>Example {i + 1}</h4>
                    <dl>
                      <dt>Input</dt><dd><code>{ex.input}</code></dd>
                      <dt>Output</dt><dd><code>{ex.output}</code></dd>
                      {ex.note && (<><dt>Note</dt><dd><Inline text={ex.note} /></dd></>)}
                    </dl>
                  </div>
                ))}
                <h4>Constraints</h4>
                <ul className="cx-list">{problem.constraints.map((c, i) => <li key={i}><Inline text={c} /></li>)}</ul>
                <details className="cx-gates-ref">
                  <summary>Available gates</summary>
                  <p><code>{GATE_NAMES}</code></p>
                </details>
              </article>
            )}

            {tab === 'hints' && (
              <div className="cx-hints">
                <p className="cx-dim">Reveal hints one at a time — each gives away a bit more.</p>
                {problem.hints.slice(0, hintsShown).map((h, i) => (
                  <div key={i} className="cx-hint"><span>Hint {i + 1}</span><p><Inline text={h} /></p></div>
                ))}
                {hintsShown < problem.hints.length ? (
                  <button type="button" className="cx-btn cx-btn-ghost" onClick={() => setHintsShown((n) => n + 1)}>
                    Show hint {hintsShown + 1} of {problem.hints.length}
                  </button>
                ) : (<p className="cx-dim">That&apos;s every hint.</p>)}
              </div>
            )}

            {tab === 'solution' && (
              <SolutionPanel
                key={`${slug}-${unlocked}`}
                problem={problem}
                unlocked={unlocked}
                revealed={revealed}
                failed={failed}
                userStats={userStats}
                backend={backend}
                onReveal={() => markRevealed(slug)}
                onLoadCode={(b, c) => { setBackend(b); setCodes((cs) => ({ ...cs, [b]: c })); setMode('code'); }}
                onLoadCircuit={(circ) => { setBuilder(fromCircuit(circ, problem.n)); setMode('circuit'); }}
              />
            )}

            {tab === 'submissions' && (
              <div className="cx-subs">
                {!entry || !entry.submissions.length ? <p className="cx-dim">No submissions yet.</p> : (
                  <table className="cx-table">
                    <thead><tr><th>When</th><th>Result</th><th>Via</th><th>Gates</th><th>Depth</th></tr></thead>
                    <tbody>
                      {entry.submissions.map((s, i) => (
                        <tr key={i}>
                          <td>{new Date(s.t).toLocaleString()}</td>
                          <td className={s.verdict === 'accepted' ? 'is-good' : 'is-bad'}>{s.verdict === 'accepted' ? 'Accepted' : s.verdict === 'wrong' ? 'Wrong Answer' : s.verdict === 'rule' ? 'Rule Violation' : 'Error'}</td>
                          <td>{s.backend}</td><td>{s.gates ?? '—'}</td><td>{s.depth ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------ right pane ------------------------------ */}
        <section className="cx-pane cx-right" aria-label="Workspace">
          <div className="cx-toolbar">
            <div className="cx-seg" role="tablist" aria-label="Mode">
              <button type="button" role="tab" aria-selected={mode === 'code'} className={mode === 'code' ? 'is-on' : ''} onClick={() => setMode('code')}>Code</button>
              <button type="button" role="tab" aria-selected={mode === 'circuit'} className={mode === 'circuit' ? 'is-on' : ''} onClick={() => setMode('circuit')}>Circuit</button>
            </div>
            <div className="cx-seg" role="tablist" aria-label="Backend">
              {BACKENDS.map((b) => (
                <button key={b.id} type="button" role="tab" aria-selected={backend === b.id} className={backend === b.id ? 'is-on' : ''} onClick={() => setBackend(b.id)}>{b.label}</button>
              ))}
            </div>
            {mode === 'code' && backendInfo.python && (
              <label className="cx-runtime" title="Browser: runs instantly in a compatible subset of the library. Server: runs the real library on the runner service.">
                Runtime
                <select value={runtime} onChange={(e) => setRuntime(e.target.value)} aria-label="Python runtime">
                  <option value="browser">Browser</option>
                  <option value="server" disabled={!serverConfigured()}>Server{serverConfigured() ? '' : ' (not configured)'}</option>
                </select>
              </label>
            )}
            <button type="button" className="cx-btn cx-btn-ghost cx-reset" onClick={reset}>Reset</button>
          </div>

          <div className="cx-editor-wrap">
            {mode === 'code' ? (
              <CodeEditor
                value={code}
                onChange={setCode}
                lang={lang}
                onRun={() => execute('run')}
                onSubmit={() => execute('submit')}
                ariaLabel={`${backendInfo.label} code`}
              />
            ) : (
              <div className="cx-builder-wrap">
                <CircuitBuilder n={problem.n} ops={builder} onChange={setBuilder} disabled={disabledGates} oracleQubits={oracle ? oracle.qubits : null} />
                <details className="cx-gen" open={showCode} onToggle={(e) => setShowCode(e.currentTarget.open)}>
                  <summary>Generated {backendInfo.label} code</summary>
                  <pre className="cx-code-block"><code>{generated}</code></pre>
                  <button type="button" className="cx-btn cx-btn-ghost" onClick={() => { setCode(generated); setMode('code'); }}>Copy into the code editor</button>
                </details>
              </div>
            )}
          </div>

          <div className="cx-actions">
            {banner && (
              <span className="cx-banner" role="status">
                Accepted! {banner.xp > 0 ? `+${banner.xp} XP` : 'No XP this time (solution was revealed).'}
                {' '}<button type="button" className="cx-link" onClick={() => setTab('solution')}>See the optimised solution</button>
              </span>
            )}
            <span className="cx-spacer" />
            <button type="button" className="cx-btn cx-btn-ghost" onClick={() => execute('run')} disabled={Boolean(running)}>Run</button>
            <button type="button" className="cx-btn cx-btn-primary" onClick={() => execute('submit')} disabled={Boolean(running)}>Submit</button>
            <button type="button" className="cx-link cx-reset-all" onClick={resetAll} title="Discard saved code and circuit for this challenge">Clear saved work</button>
          </div>

          <ResultsPanel result={result} running={running} oracleNote={oracle ? 'each hidden case uses a different oracle' : ''} />
        </section>
      </div>
    </div>
  );
}
