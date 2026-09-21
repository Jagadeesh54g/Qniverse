'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { problems, topics as ALL_TOPICS, XP_BY_DIFFICULTY } from '../../lib/challenges/problems.js';
import { analyze } from '../../lib/challenges/grader.js';
import { useProgress } from '../../lib/challenges/progress.js';

const ORDER = { Easy: 0, Medium: 1, Hard: 2 };
const REF_GATES = Object.fromEntries(problems.map((p) => [p.slug, analyze({ ops: p.reference.ops }).gates]));

function StatusIcon({ status }) {
  if (status === 'solved') {
    return (
      <svg className="cx-st cx-st-solved" viewBox="0 0 20 20" role="img" aria-label="Solved">
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'attempted') {
    return (
      <svg className="cx-st cx-st-attempted" viewBox="0 0 20 20" role="img" aria-label="Attempted">
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 1.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className="cx-st" viewBox="0 0 20 20" role="img" aria-label="Not started">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.5 3" />
    </svg>
  );
}

function Ring({ done, total }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg className="cx-ring" viewBox="0 0 84 84" role="img" aria-label={`${done} of ${total} solved`}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--cx-line)" strokeWidth="7" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--cx-blue)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(done / total) * c} ${c}`} transform="rotate(-90 42 42)" />
      <text x="42" y="40" textAnchor="middle" className="cx-ring-n">{done}</text>
      <text x="42" y="56" textAnchor="middle" className="cx-ring-t">/ {total} solved</text>
    </svg>
  );
}

export default function ChallengeList() {
  const router = useRouter();
  const progress = useProgress();
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState('All');
  const [status, setStatus] = useState('All');
  const [topic, setTopic] = useState('All');
  const [sort, setSort] = useState('number');

  const stat = (slug) => (progress && progress.problems[slug] ? progress.problems[slug].status : 'todo');

  const counts = useMemo(() => {
    const t = {};
    for (const p of problems) for (const x of p.topics) t[x] = (t[x] || 0) + 1;
    return t;
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = problems.filter((p) => {
      if (diff !== 'All' && p.difficulty !== diff) return false;
      if (topic !== 'All' && !p.topics.includes(topic)) return false;
      const s = progress && progress.problems[p.slug] ? progress.problems[p.slug].status : 'todo';
      if (status !== 'All' && s !== status) return false;
      if (needle && !(`${p.id} ${p.title} ${p.topics.join(' ')}`.toLowerCase().includes(needle))) return false;
      return true;
    });
    if (sort === 'easy') list.sort((a, b) => ORDER[a.difficulty] - ORDER[b.difficulty] || a.id - b.id);
    if (sort === 'hard') list.sort((a, b) => ORDER[b.difficulty] - ORDER[a.difficulty] || a.id - b.id);
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [q, diff, status, topic, sort, progress]);

  const solvedBy = (d) => problems.filter((p) => p.difficulty === d && stat(p.slug) === 'solved').length;
  const totalBy = (d) => problems.filter((p) => p.difficulty === d).length;
  const solved = problems.filter((p) => stat(p.slug) === 'solved').length;
  const firstTodo = problems.find((p) => stat(p.slug) !== 'solved') || problems[0];

  const random = () => {
    const pool = problems.filter((p) => stat(p.slug) !== 'solved');
    const list = pool.length ? pool : problems;
    router.push(`/challenges/${list[Math.floor(Math.random() * list.length)].slug}`);
  };
  const reset = () => { setQ(''); setDiff('All'); setStatus('All'); setTopic('All'); setSort('number'); };

  return (
    <div className="cx-root cx-page">
      <header className="cx-head">
        <div>
          <h1>Challenges</h1>
          <p>Build the circuit. Twenty quantum problems from a single X gate to Grover search and error correction — write code in Qiskit, Cirq, PennyLane or OpenQASM 3, or drag gates into the circuit builder. Every attempt is graded by the same simulator.</p>
        </div>
      </header>

      <div className="cx-topics" role="group" aria-label="Filter by topic">
        <button type="button" className={`cx-chip${topic === 'All' ? ' is-on' : ''}`} onClick={() => setTopic('All')} aria-pressed={topic === 'All'}>All topics</button>
        {ALL_TOPICS.map((t) => (
          <button key={t} type="button" className={`cx-chip${topic === t ? ' is-on' : ''}`} onClick={() => setTopic(topic === t ? 'All' : t)} aria-pressed={topic === t}>
            {t} <span>{counts[t] || 0}</span>
          </button>
        ))}
      </div>

      <div className="cx-list-grid">
        <section aria-label="Challenge list">
          <div className="cx-filters">
            <input className="cx-search" type="search" placeholder="Search challenges" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search challenges" />
            <select value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Difficulty">
              <option value="All">Difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="All">Status</option><option value="todo">Todo</option><option value="attempted">Attempted</option><option value="solved">Solved</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              <option value="number">Sort: order</option><option value="easy">Easiest first</option><option value="hard">Hardest first</option><option value="title">Title A–Z</option>
            </select>
            <button type="button" className="cx-btn cx-btn-ghost" onClick={random}>Pick one for me</button>
          </div>

          <div className="cx-table-wrap">
            <table className="cx-table cx-problems">
              <thead>
                <tr><th className="cx-c-status">Status</th><th>Title</th><th className="cx-c-topics">Topics</th><th>Difficulty</th><th className="cx-c-best">Your gates</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const s = stat(p.slug);
                  const e = progress && progress.problems[p.slug];
                  return (
                    <tr key={p.slug}>
                      <td className="cx-c-status"><StatusIcon status={s} /></td>
                      <td><Link href={`/challenges/${p.slug}`} className="cx-title-link">{p.id}. {p.title}</Link></td>
                      <td className="cx-c-topics">{p.topics.map((t) => <span key={t} className="cx-topic">{t}</span>)}</td>
                      <td><span className={`cx-diff cx-diff-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span></td>
                      <td className="cx-c-best">
                        {e && e.bestGates != null ? (
                          <span title={`Optimised reference: ${REF_GATES[p.slug]} gates`}>
                            {e.bestGates}{e.bestGates <= REF_GATES[p.slug] && <span className="cx-optimal"> optimal</span>}
                          </span>
                        ) : <span className="cx-dim">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr><td colSpan={5} className="cx-empty">No challenges match. <button type="button" className="cx-link" onClick={reset}>Clear filters</button></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="cx-side" aria-label="Your progress">
          <div className="cx-card">
            <Ring done={solved} total={problems.length} />
            <ul className="cx-diff-stats">
              {['Easy', 'Medium', 'Hard'].map((d) => (
                <li key={d}>
                  <span className={`cx-diff cx-diff-${d.toLowerCase()}`}>{d}</span>
                  <span>{solvedBy(d)} / {totalBy(d)}</span>
                  <div className="cx-mini-track"><div className={`cx-mini-fill cx-fill-${d.toLowerCase()}`} style={{ width: `${(solvedBy(d) / totalBy(d)) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="cx-xp-line"><b>{progress ? progress.xp : 0}</b> XP earned <span className="cx-dim">· {XP_BY_DIFFICULTY.Easy} / {XP_BY_DIFFICULTY.Medium} / {XP_BY_DIFFICULTY.Hard} per solve</span></p>
            <Link className="cx-btn cx-btn-primary cx-continue" href={`/challenges/${firstTodo.slug}`}>{solved ? 'Continue' : 'Start'}: {firstTodo.title}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
