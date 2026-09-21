// Progress, XP and drafts, kept in localStorage.
// Swap the four functions marked [STORE] for API calls if you later persist to a database or your auth system.
'use client';
import { useEffect, useState } from 'react';
import { problems, XP_BY_DIFFICULTY } from './problems.js';

const KEY = 'qniverse:challenges:v1';
const DRAFT_KEY = 'qniverse:challenges:drafts:v1';
export const PROGRESS_EVENT = 'qniverse:challenges-changed';

const blank = () => ({ v: 1, xp: 0, problems: {} });

/* [STORE] ------------------------------------------------------------- */
function readJSON(key, fallback) {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  } catch {
    /* storage full or blocked — progress simply won't persist */
  }
}
/* -------------------------------------------------------------------- */

export const getProgress = () => readJSON(KEY, blank());

export function getSummary() {
  const p = getProgress();
  const solved = Object.values(p.problems).filter((x) => x.status === 'solved').length;
  return { xp: p.xp, solved, total: problems.length, byProblem: p.problems };
}

/**
 * Record a graded Submit.  Returns { firstSolve, xpGained, entry }.
 * stats = grader stats; refGates = gate count of the reference solution.
 */
export function recordSubmission({ slug, difficulty, verdict, backend, mode, stats, refGates }) {
  const p = getProgress();
  const entry = p.problems[slug] || { status: 'attempted', failed: 0, revealed: false, submissions: [] };
  entry.submissions = [
    { t: Date.now(), verdict, backend, mode, gates: stats ? stats.gates : null, depth: stats ? stats.depth : null },
    ...entry.submissions,
  ].slice(0, 30);
  let xpGained = 0;
  let firstSolve = false;
  if (verdict === 'accepted') {
    if (entry.status !== 'solved') {
      firstSolve = true;
      entry.status = 'solved';
      entry.solvedAt = Date.now();
      if (!entry.revealed) {
        xpGained = XP_BY_DIFFICULTY[difficulty] || 0;
        if (stats && stats.gates <= refGates) xpGained += 5; // bonus for matching the optimised circuit
      }
      p.xp += xpGained;
    }
    if (stats && (entry.bestGates == null || stats.gates < entry.bestGates)) {
      entry.bestGates = stats.gates;
      entry.bestDepth = stats.depth;
    }
  } else if (entry.status !== 'solved' && (verdict === 'wrong' || verdict === 'rule')) {
    entry.failed += 1; // compile/runtime errors don't count as a failed attempt
  }
  p.problems[slug] = entry;
  writeJSON(KEY, p);
  return { firstSolve, xpGained, entry };
}

export function markRevealed(slug) {
  const p = getProgress();
  const entry = p.problems[slug] || { status: 'attempted', failed: 0, revealed: false, submissions: [] };
  entry.revealed = true;
  p.problems[slug] = entry;
  writeJSON(KEY, p);
}

export const loadDraft = (slug) => (readJSON(DRAFT_KEY, {})[slug] || null);
export function saveDraft(slug, patch) {
  const all = readJSON(DRAFT_KEY, {});
  all[slug] = { ...(all[slug] || {}), ...patch };
  writeJSON(DRAFT_KEY, all);
}
export function clearDraft(slug) {
  const all = readJSON(DRAFT_KEY, {});
  delete all[slug];
  writeJSON(DRAFT_KEY, all);
}

/** React hook. Returns null until mounted (avoids a hydration mismatch), then the live progress object. */
export function useProgress() {
  const [state, setState] = useState(null);
  useEffect(() => {
    const update = () => setState(getProgress());
    update();
    window.addEventListener(PROGRESS_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return state;
}
