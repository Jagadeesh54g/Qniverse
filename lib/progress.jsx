'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const seed = { lessons: {}, challenges: {}, xp: 0, streak: 0, last: null };
const Ctx = createContext(null);

export function ProgressProvider({ children }) {
  const [data, setData] = useState(seed);
  // Only true once we have successfully loaded this user's saved progress.
  // Saving before that would overwrite their real data with the empty seed
  // (e.g. when the first GET fails because the DB was briefly unreachable).
  const [syncEnabled, setSyncEnabled] = useState(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    let active = true;
    fetch('/api/progress')
      .then(async (response) => {
        const json = await response.json();
        if (!active) return;
        if (response.ok && json.authenticated && json.data) {
          skipNextSave.current = true; // don't echo freshly loaded data straight back
          setData({ ...seed, ...json.data });
          setSyncEnabled(true);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!syncEnabled) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {});
    }, 250);
    return () => window.clearTimeout(timer);
  }, [data, syncEnabled]);

  const api = useMemo(() => ({
    data,
    completeLesson(id) {
      setData((d) => ({ ...d, lessons: { ...d.lessons, [id]: 100 }, xp: d.xp + 50 }));
    },
    completeChallenge(id, score = 100) {
      setData((d) => ({ ...d, challenges: { ...d.challenges, [id]: score }, xp: d.xp + Math.round(score / 2) }));
    },
  }), [data]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useProgress = () => useContext(Ctx);
