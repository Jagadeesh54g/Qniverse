'use client';

import Link from 'next/link';
import { lessons, challenges } from '@/lib/content';
import { useProgress } from '@/lib/progress';

export default function ProgressPage() {
  const { data } = useProgress();
  const doneLessons = data.lessons || {};
  const doneChallenges = data.challenges || {};

  // Count only items that exist in the current curriculum, so old saved IDs
  // can never push the totals above 100%.
  const lessonDone = lessons.filter((l) => (doneLessons[l.id] || 0) > 0).length;
  const challengeDone = challenges.filter((c) => (doneChallenges[c.id] || 0) > 0).length;
  const total = lessons.length + challenges.length;
  const pct = total ? Math.round(((lessonDone + challengeDone) / total) * 100) : 0;

  const nextLesson = lessons.find((l) => !(doneLessons[l.id] > 0));

  return (
    <div className="container page">
      <div className="progress-hero">
        <div>
          <div className="eyebrow">YOUR QNIVERSE</div>
          <h1>Momentum becomes<br /><em>mastery.</em></h1>
          <p>Qniverse remembers the concepts you complete and the challenges you solve, and keeps them with your account.</p>
        </div>
        <div className="xp-orb">
          <span>XP</span>
          <b>{data.xp || 0}</b>
          <small>earned</small>
        </div>
      </div>

      <div className="stats-row">
        <div><span>OVERALL</span><b>{pct}%</b><small>path complete</small></div>
        <div><span>LESSONS</span><b>{lessonDone}/{lessons.length}</b><small>concepts mastered</small></div>
        <div><span>CHALLENGES</span><b>{challengeDone}/{challenges.length}</b><small>solutions validated</small></div>
        <div><span>NEXT</span><b>{nextLesson ? 'Learn' : 'Explore'}</b><small>recommended action</small></div>
      </div>

      <div className="progress-grid">
        <section className="mastery-card">
          <div className="card-head">
            <div>
              <div className="eyebrow">MASTERY MAP</div>
              <h2>Quantum foundations</h2>
            </div>
            <span>{pct}%</span>
          </div>
          {lessons.map((l, i) => {
            const value = doneLessons[l.id] || 0;
            return (
              <div className="mastery-row" key={l.id}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <b>{l.title}</b>
                <div><i style={{ width: `${value}%` }} /></div>
                <strong>{value}%</strong>
              </div>
            );
          })}
        </section>

        <aside className="recommend-card">
          <div className="eyebrow">NEXT RECOMMENDATION</div>
          <h2>{nextLesson ? nextLesson.title : 'Algorithm Studio'}</h2>
          <p>
            {nextLesson
              ? 'Your next step builds directly on the concepts you have already completed.'
              : 'You have completed the learning path. Explore an algorithm and challenge yourself.'}
          </p>
          <Link href={nextLesson ? '/learn' : '/algorithms'} className="primary-btn">Continue →</Link>
        </aside>
      </div>
    </div>
  );
}
