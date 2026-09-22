'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { lessons, challenges } from '@/lib/content';

function initials(name = 'Student') {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

export default function Dashboard() {
  const [user, setUser] = useState(null);

  const [progress, setProgress] = useState({
    xp: 0,
    lessons: {},
    challenges: {},
    streak: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/progress'),
    ])
      .then(async ([authResponse, progressResponse]) => {
        const auth = await authResponse.json();
        const progressData =
          await progressResponse.json();

        setUser(auth.user || null);

        setProgress(
          progressData.data || {
            xp: 0,
            lessons: {},
            challenges: {},
            streak: 0,
          }
        );

        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const lessonDone = Object.keys(
    progress.lessons || {}
  ).filter(
    (key) =>
      (progress.lessons || {})[key] > 0
  ).length;

  const challengeDone = Object.keys(
    progress.challenges || {}
  ).length;

  const total =
    lessons.length + challenges.length;

  const completed =
    lessonDone + challengeDone;

  const percentage =
    total > 0
      ? Math.min(
          100,
          Math.round(
            (completed / total) * 100
          )
        )
      : 0;

  const next =
    lessons.find(
      (lesson) =>
        !(progress.lessons || {})[
          lesson.id
        ]
    ) || lessons[0];

  const stats = useMemo(
    () => [
      {
        label: 'XP EARNED',
        value: progress.xp || 0,
        meta: 'learning points',
      },
      {
        label: 'STREAK',
        value: progress.streak || 0,
        meta: 'days in a row',
      },
      {
        label: 'LESSONS',
        value: `${lessonDone}/${lessons.length}`,
        meta: 'completed',
      },
      {
        label: 'CHALLENGES',
        value: `${challengeDone}/${challenges.length}`,
        meta: 'attempted',
      },
    ],
    [
      progress,
      lessonDone,
      challengeDone,
    ]
  );

  if (loading) {
    return (
      <div className="page dashboard-page">
        <div className="dashboard-loading">
          Loading your Qniverse…
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">

      <section className="dashboard-head">

        <div>
          <div className="eyebrow">
            YOUR QNIVERSE
          </div>

          <h1>
            Welcome back,
            <br />
            <em>
              {user?.name?.split(' ')[0] ||
                'Explorer'}
              .
            </em>
          </h1>

          <p>
            Your dashboard brings your learning
            path, experiments, progress and
            community activity into one place.
          </p>
        </div>

        <div className="profile-hero">

          <span className="avatar large">
            {initials(user?.name || 'Student')}
          </span>

          <b>
            {user?.name || 'Student'}
          </b>

          <span>
            {user?.email}
          </span>

          <small>
            {user?.learnerLevel ||
              'curious'}{' '}
            learner
          </small>

        </div>

      </section>

      <section className="dashboard-stats">

        {stats.map((stat) => (
          <div key={stat.label}>

            <span>{stat.label}</span>

            <b>{stat.value}</b>

            <small>{stat.meta}</small>

          </div>
        ))}

      </section>

      <div className="dashboard-grid">

        <section className="dash-card path-card">

          <div className="card-head">

            <div>
              <div className="eyebrow">
                LEARNING PATH
              </div>

              <h2>
                Your next concept
              </h2>
            </div>

            <strong>
              {percentage}%
            </strong>

          </div>

          <div className="dash-progress">
            <i
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>

          <div className="next-lesson">

            <div>

              <span className="lesson-number">
                01
              </span>

              <div>
                <b>
                  {next.title}
                </b>

                <p>
                  {next.desc ||
                    'Continue building your quantum foundations.'}
                </p>
              </div>

            </div>

            <Link
              href="/learn"
              className="primary-btn"
            >
              Continue →
            </Link>

          </div>

        </section>

        <section className="dash-card profile-card">

          <div className="eyebrow">
            LEARNER PROFILE
          </div>

          <h2>
            {user?.learnerLevel ||
              'Curious'}{' '}
            learner
          </h2>

          <p>
            Your Quantum Compass profile is used
            to shape the starting point of your
            learning journey.
          </p>

          <div className="profile-tags">
            <span>Intuition</span>
            <span>Circuits</span>
            <span>Mathematics</span>
          </div>

          <Link
            href="/onboarding"
            className="text-link"
          >
            Retake Quantum Compass →
          </Link>

        </section>

        <section className="dash-card quick-card">

          <div className="eyebrow">
            QUICK ACTIONS
          </div>

          <div className="quick-grid">

            <Link href="/learn">
              <b>Learn</b>
              <span>
                Continue theory
              </span>
            </Link>

            <Link href="/playground">
              <b>Lab</b>
              <span>
                Build a circuit
              </span>
            </Link>

            <Link href="/community">
              <b>Community</b>
              <span>
                Ask students
              </span>
            </Link>

            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(
                    'qniverse:tutor',
                    {
                      detail: {
                        question:
                          'Give me a study plan for my next quantum topic.',
                      },
                    }
                  )
                )
              }
            >
              <b>Bujji</b>
              <span>
                Ask your tutor
              </span>
            </button>

          </div>

        </section>

        <section className="dash-card activity-card">

          <div className="card-head">

            <div>
              <div className="eyebrow">
                MASTERY SNAPSHOT
              </div>

              <h2>
                Foundations
              </h2>
            </div>

            <Link
              href="/progress"
              className="text-link"
            >
              Full progress →
            </Link>

          </div>

          {lessons.slice(0, 6).map(
            (lesson, index) => (
              <div
                className="mastery-mini"
                key={lesson.id}
              >

                <span>
                  {String(index + 1).padStart(
                    2,
                    '0'
                  )}
                </span>

                <b>
                  {lesson.title}
                </b>

                <div>
                  <i
                    style={{
                      width: `${
                        progress.lessons?.[
                          lesson.id
                        ] || 0
                      }%`,
                    }}
                  />
                </div>

                <strong>
                  {progress.lessons?.[
                    lesson.id
                  ] || 0}
                  %
                </strong>

              </div>
            )
          )}

        </section>

        <section className="dashboard-community">

          <div>
            <div className="eyebrow">
              STUDENT NETWORK
            </div>

            <h2>
              Don't get stuck alone.
            </h2>

            <p>
              Ask a question, compare circuits
              and help another learner get
              unstuck.
            </p>
          </div>

          <Link
            href="/community"
            className="primary-btn"
          >
            Open Community →
          </Link>

        </section>

      </div>

      <section className="logout-panel">

        <div>
          <span className="eyebrow">
            ACCOUNT
          </span>

          <h3>
            Ready to leave Qniverse?
          </h3>

          <p>
            Your learning data stays safely
            associated with your account.
          </p>
        </div>

        <button
          onClick={async () => {
            await fetch(
              '/api/auth/logout',
              {
                method: 'POST',
              }
            );

            window.location.href =
              '/sign-in';
          }}
        >
          Sign out
        </button>

      </section>

    </div>
  );
}