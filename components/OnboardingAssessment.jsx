'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ASSESSMENT } from '@/lib/onboarding';
import QniverseLogo from './QniverseLogo';

const levelCopy = {
  curious: ['Quantum Curious', 'We will build your intuition from the ground up.'],
  foundation: ['Quantum Foundation', 'You have useful building blocks; we will connect them into circuits.'],
  intermediate: ['Quantum Explorer', 'You can move quickly into algorithms and deeper experiments.'],
  advanced: ['Quantum Builder', 'We will emphasize algorithms, mathematics and implementation.'],
  research: ['Quantum Researcher', 'Your route can move toward papers, advanced algorithms and experiments.'],
};

export default function OnboardingAssessment() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const question = ASSESSMENT[step];
  const progress = Math.round(((step + 1) / ASSESSMENT.length) * 100);
  const selected = answers[question.id];

  const canContinue = !!selected;

  function choose(key) {
    setAnswers((current) => ({ ...current, [question.id]: key }));
    setError('');
  }

  async function next() {
    if (!canContinue) {
      setError('Choose the option that feels most like you.');
      return;
    }
    if (step < ASSESSMENT.length - 1) {
      setStep((value) => value + 1);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not save your profile.');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    const [title, description] = levelCopy[result.level] || levelCopy.curious;
    return (
      <main className="onboarding-page">
        <Link href="/" className="onboarding-logo"><QniverseLogo /></Link>
        <section className="assessment-result">
          <div className="assessment-orbit" aria-hidden="true"><span>|ψ⟩</span></div>
          <span className="assessment-kicker">YOUR QUANTUM COMPASS / CALIBRATED</span>
          <h1>You are a <em>{title}.</em></h1>
          <p>{description}</p>
          <div className="level-meter"><span style={{ width: `${Math.max(8, Math.min(100, result.score))}%` }} /></div>
          <div className="result-score"><b>{result.score}</b><span>/ 100 starting signal</span></div>
          <div className="route-card">
            <span className="eyebrow">YOUR FIRST ROUTE</span>
            <div>{result.recommendedPath.map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, '0')}</b>{item}</span>)}</div>
          </div>
          <p className="result-note">This is a starting estimate, not a permanent label. Your level will adapt as you learn and solve challenges.</p>
          <button className="assessment-primary" onClick={() => router.replace('/learn')}>Enter my learning space <span>→</span></button>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <Link href="/" className="onboarding-logo"><QniverseLogo /></Link>
      <div className="assessment-shell">
        <aside className="assessment-aside">
          <span className="assessment-kicker">QNIVERSE / ORIENTATION</span>
          <h1>Let's find your<br /><em>quantum coordinates.</em></h1>
          <p>Not an exam. A short set of thought experiments helps Qniverse decide where to begin, what to skip, and how deeply to explain.</p>
          <div className="aside-equation">|ψ⟩ <span>→</span> learn <span>→</span> build <span>→</span> understand</div>
          <div className="assessment-note"><b>7 signals</b><span>intuition · math · code · exposure · goals</span></div>
        </aside>

        <section className="assessment-card">
          <div className="assessment-top"><span>{String(step + 1).padStart(2, '0')} / {String(ASSESSMENT.length).padStart(2, '0')}</span><span>{progress}% calibrated</span></div>
          <div className="assessment-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="question-meta"><span>{question.kind === 'single' ? 'CHOOSE ONE' : 'YOUR SIGNAL'}</span><span>NO WRONG ANSWERS</span></div>
          <h2>{question.title}</h2>
          <p className="question-prompt">{question.prompt}</p>
          <p className="question-hint">↳ {question.hint}</p>
          <div className="assessment-options">
            {question.options.map(([key, label]) => (
              <button key={key} className={selected === key ? 'assessment-option selected' : 'assessment-option'} onClick={() => choose(key)}>
                <span className="option-key">{key.toUpperCase()}</span>
                <span>{label}</span>
                <i>{selected === key ? '✓' : '→'}</i>
              </button>
            ))}
          </div>
          {error && <p className="assessment-error">{error}</p>}
          <div className="assessment-actions">
            <button className="assessment-back" disabled={step === 0 || saving} onClick={() => setStep((value) => value - 1)}>← Back</button>
            <button className="assessment-primary" disabled={saving} onClick={next}>{saving ? 'Calibrating...' : step === ASSESSMENT.length - 1 ? 'Reveal my route' : 'Next signal'} <span>→</span></button>
          </div>
        </section>
      </div>
    </main>
  );
}
