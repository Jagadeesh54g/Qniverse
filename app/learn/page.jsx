'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { lessons, TRACKS } from '@/lib/lessons';
import { useProgress } from '@/lib/progress';

const DEPTHS = [
  ['simple', 'Beginner'],
  ['university', 'University'],
  ['advanced', 'Advanced'],
  ['research', 'Research'],
];

const QUICK_ACTIONS = [
  ['Explain simply', 'Explain this topic as simply as possible, as if I have never seen it before.'],
  ['Give an analogy', 'Give me a concrete everyday analogy for this topic, then say exactly where the analogy breaks down.'],
  ['Show the math', 'Show me the mathematics behind this topic, step by step, with the key equations worked through.'],
  ['Show an example', 'Walk me through a worked example of this topic using a small concrete circuit.'],
  ['Quiz me', 'Ask me three questions of increasing difficulty about this topic. Wait for my answer to each before moving on.'],
  ["I don't understand", 'I am lost on this topic. Find the simplest possible starting point and rebuild my understanding from there.'],
];

function TheoryMode({ lesson }) {
  return (
    <div className="theory-doc">
      <div className="doc-toc">
        <span className="eyebrow">ON THIS PAGE</span>
        <ol>
          {lesson.theory.map((s) => (
            <li key={s.heading}>
              <a href={`#sec-${s.heading.replace(/\s+/g, '-').toLowerCase()}`}>{s.heading}</a>
            </li>
          ))}
          <li><a href="#sec-misconception">Common misconception</a></li>
          <li><a href="#sec-check">Quick check</a></li>
        </ol>
      </div>

      <div className="doc-body">
        <div className="formula-large">{lesson.formula}</div>

        {lesson.theory.map((s) => (
          <section key={s.heading} id={`sec-${s.heading.replace(/\s+/g, '-').toLowerCase()}`} className="doc-section">
            <h3>{s.heading}</h3>
            <p>{s.body}</p>
          </section>
        ))}

        <section id="sec-misconception" className="doc-callout doc-callout-warn">
          <span className="callout-tag">COMMON MISCONCEPTION</span>
          <p>{lesson.misconception}</p>
        </section>

        <QuickCheck check={lesson.check} lessonId={lesson.id} />

        <section className="doc-callout doc-callout-lab">
          <span className="callout-tag">TRY IT IN THE LAB</span>
          <p>{lesson.experiment}</p>
          <Link href="/playground" className="primary-btn">Open the Lab →</Link>
        </section>
      </div>
    </div>
  );
}

function QuickCheck({ check, lessonId }) {
  const [picked, setPicked] = useState(null);
  useEffect(() => setPicked(null), [lessonId]);
  const correct = picked === check.answer;

  return (
    <section id="sec-check" className="quick-check">
      <span className="callout-tag">QUICK CHECK</span>
      <p className="qc-question">{check.q}</p>
      <div className="qc-options">
        {check.options.map((o, i) => (
          <button
            key={o}
            className={
              picked === null ? 'qc-opt'
                : i === check.answer ? 'qc-opt qc-right'
                : picked === i ? 'qc-opt qc-wrong'
                : 'qc-opt qc-dim'
            }
            onClick={() => setPicked(i)}
            disabled={picked !== null}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className={correct ? 'qc-feedback qc-ok' : 'qc-feedback'}>
          <b>{correct ? 'Correct.' : 'Not quite.'}</b> {check.why}
        </p>
      )}
    </section>
  );
}

function AIMode({ lesson }) {
  const [depth, setDepth] = useState('simple');
  const [messages, setMessages] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    setMessages([{
      role: 'ai',
      text: `I'm Bujji. We're on "${lesson.title}". Pick a depth above, tap an action, or just ask me anything about this topic.`,
    }]);
  }, [lesson.id, lesson.title]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, loading]);

  async function send(preset) {
    const question = (preset ?? q).trim();
    if (!question || loading) return;
    if (!preset) setQ('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          kind: 'lesson',
          context: {
            product: 'Qniverse',
            assistant: 'Bujji',
            topic: lesson.title,
            level: lesson.level,
            depth,
            formula: lesson.formula,
            summary: lesson.theory.map((s) => `${s.heading}: ${s.body}`).join(' '),
            misconception: lesson.misconception,
          },
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'ai', text: data.answer || 'No answer returned.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Bujji is unreachable right now — try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-mode">
      <div className="ai-depth">
        <span className="eyebrow">EXPLANATION DEPTH</span>
        <div className="depth-row">
          {DEPTHS.map(([id, label]) => (
            <button key={id} className={depth === id ? 'depth-pill selected' : 'depth-pill'} onClick={() => setDepth(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="ai-thread" ref={scroller}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'ai-msg ai-user' : 'ai-msg ai-bot'}>
            {m.text}
          </div>
        ))}
        {loading && <div className="ai-msg ai-bot ai-typing">Bujji is thinking…</div>}
      </div>

      <div className="ai-quick">
        {QUICK_ACTIONS.map(([label, prompt]) => (
          <button key={label} onClick={() => send(prompt)} disabled={loading}>{label}</button>
        ))}
      </div>

      <form className="ai-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask Bujji about ${lesson.title}…`}
        />
        <button className="primary-btn" type="submit" disabled={loading}>Ask</button>
      </form>
    </div>
  );
}

export default function Learn() {
  const { data, completeLesson } = useProgress();
  const [selected, setSelected] = useState(lessons[0]);
  const [mode, setMode] = useState('theory');

  const overall = Math.round(
    Object.values(data.lessons).reduce((a, b) => a + b, 0) / (lessons.length || 1)
  ) || 0;

  function pick(l) {
    setSelected(l);
    setMode('theory');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="container page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">LEARNING PATH / BEGINNER → ADVANCED</div>
          <h1>Build intuition.<br /><em>Then build circuits.</em></h1>
        </div>
        <div className="mastery">
          <span>OVERALL MASTERY</span>
          <b>{overall}%</b>
          <div className="mastery-line"><i style={{ width: `${overall}%` }} /></div>
        </div>
      </div>

      <div className="learn-layout">
        <aside className="lesson-list">
          {TRACKS.map((track) => {
            const group = lessons.filter((l) => l.track === track.id);
            if (!group.length) return null;
            return (
              <div key={track.id} className="track-group">
                <div className="track-label">{track.label}</div>
                {group.map((l) => (
                  <button
                    key={l.id}
                    className={selected.id === l.id ? 'lesson-item selected' : 'lesson-item'}
                    onClick={() => pick(l)}
                  >
                    <span>{l.tag}</span>
                    <div><b>{l.title}</b><small>{l.level} · {l.time}</small></div>
                    <strong>{data.lessons[l.id] || 0}%</strong>
                  </button>
                ))}
              </div>
            );
          })}
        </aside>

        <section className="lesson-view">
          <div className="lesson-meta">
            <span>{selected.level}</span>
            <span>{selected.time}</span>
            <span>Interactive</span>
          </div>
          <h2>{selected.title}</h2>
          <p className="lead">{selected.desc}</p>

          <div className="mode-switch">
            <button className={mode === 'theory' ? 'selected' : ''} onClick={() => setMode('theory')}>
              Theory
            </button>
            <button className={mode === 'ai' ? 'selected' : ''} onClick={() => setMode('ai')}>
              ✦ AI Mode
            </button>
          </div>

          {mode === 'theory' ? <TheoryMode lesson={selected} /> : <AIMode lesson={selected} />}

          <div className="completion">
            <div>
              <b>Ready to mark this concept?</b>
              <p>Work through the theory and the lab experiment, then record it as mastered.</p>
            </div>
            <button className="primary-btn" onClick={() => completeLesson(selected.id)}>
              Mark mastered ✓
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
