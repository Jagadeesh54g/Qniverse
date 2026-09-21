// Turns "code in some backend" into the common circuit format.
//   OpenQASM 3      → parsed right here (instant, works offline)
//   Python backends → Browser runtime (Pyodide worker + compat shims)  or  Server runtime (real libraries)
import { parseQasm } from './qasm.js';

// Must stay in this literal form so Next.js can inline it at build time.
const SERVER_URL = process.env.NEXT_PUBLIC_QNIVERSE_RUNNER_URL || '';
const WORKER_URL = '/qniverse-py/worker.js';
const EXEC_TIMEOUT_MS = 10000;
const LOAD_TIMEOUT_MS = 90000;

export const serverConfigured = () => Boolean(SERVER_URL);

/* ---------- browser worker ---------- */
let worker = null;
let ready = null;
let seq = 1;
const waiting = new Map();

function killWorker() {
  if (worker) worker.terminate();
  worker = null;
  ready = null;
  for (const { reject } of waiting.values()) reject(new Error('Runtime was stopped.'));
  waiting.clear();
}

function ensureWorker() {
  if (worker) return ready;
  worker = new Worker(WORKER_URL);
  worker.onmessage = (e) => {
    const w = waiting.get(e.data.id);
    if (!w) return;
    waiting.delete(e.data.id);
    if (e.data.type === 'fatal') w.reject(new Error(e.data.error));
    else w.resolve(e.data);
  };
  worker.onerror = (e) => {
    const msg = e && e.message ? e.message : 'unknown error';
    killWorker();
    console.warn('Qniverse worker error:', msg);
  };
  ready = post({ type: 'warmup' }, LOAD_TIMEOUT_MS).catch((err) => {
    killWorker();
    throw new Error(
      `Couldn't start the in-browser Python runtime (${err.message}). It downloads Pyodide from a CDN on first use, ` +
      'so it needs an internet connection. OpenQASM 3 works offline.',
    );
  });
  return ready;
}

function post(msg, timeoutMs) {
  return new Promise((resolve, reject) => {
    const id = seq++;
    const timer = setTimeout(() => {
      waiting.delete(id);
      reject(new Error('timed out'));
    }, timeoutMs);
    waiting.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    worker.postMessage({ id, ...msg });
  });
}

/** Optionally call early (e.g. when the user opens a Python tab) so the first Run is fast. */
export function warmUpPython() {
  if (typeof Worker === 'undefined') return Promise.resolve();
  return ensureWorker().catch(() => {});
}

async function runInBrowser(backend, code) {
  if (typeof Worker === 'undefined') return { ok: false, kind: 'error', error: 'This environment has no Web Worker support.' };
  try {
    await ensureWorker();
  } catch (err) {
    return { ok: false, kind: 'error', error: err.message };
  }
  try {
    const { result } = await post({ type: 'run', backend, code }, EXEC_TIMEOUT_MS);
    return result;
  } catch (err) {
    if (err.message === 'timed out') {
      killWorker();
      return {
        ok: false, kind: 'error',
        error: `Your code ran for more than ${EXEC_TIMEOUT_MS / 1000} s and was stopped — is there an infinite loop?`,
      };
    }
    killWorker();
    return { ok: false, kind: 'error', error: err.message };
  }
}

/* ---------- server ---------- */
async function runOnServer(backend, code) {
  if (!SERVER_URL) {
    return {
      ok: false, kind: 'error',
      error: 'No server runtime is configured. Set NEXT_PUBLIC_QNIVERSE_RUNNER_URL to your runner service (see server/README.md).',
    };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(`${SERVER_URL.replace(/\/$/, '')}/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backend, code }), signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, kind: 'error', error: `Runner service returned HTTP ${res.status}.` };
    return await res.json();
  } catch (err) {
    return { ok: false, kind: 'error', error: err.name === 'AbortError' ? 'The runner service timed out.' : `Couldn't reach the runner service (${err.message}).` };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- public ---------- */
/**
 * @param {{backend: 'qiskit'|'cirq'|'pennylane'|'qasm3', code: string, runtime?: 'browser'|'server'}} req
 * @returns {Promise<{ok: boolean, circuit?: {n:number, ops: object[]}, error?: string, kind?: string, stdout?: string, ranOn: string}>}
 */
export async function runCode({ backend, code, runtime = 'browser' }) {
  if (backend === 'qasm3') {
    try {
      return { ok: true, circuit: parseQasm(code), ranOn: 'browser' };
    } catch (e) {
      return { ok: false, kind: 'error', error: e.message, ranOn: 'browser' };
    }
  }
  if (runtime === 'server') return { ...(await runOnServer(backend, code)), ranOn: 'server' };
  const first = await runInBrowser(backend, code);
  if (!first.ok && first.kind === 'unsupported' && serverConfigured()) {
    const second = await runOnServer(backend, code);
    return { ...second, ranOn: 'server', fellBack: true };
  }
  return { ...first, ranOn: 'browser' };
}
