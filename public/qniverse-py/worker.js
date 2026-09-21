/* Qniverse in-browser Python runtime (classic Web Worker).
 * Loads Pyodide from the jsDelivr CDN on first use, installs shims.py (Qiskit / Cirq / PennyLane stand-ins)
 * and executes learner code. Terminate the worker to stop runaway code. */
/* eslint-disable no-restricted-globals */
const PYODIDE_VERSION = '0.26.4';
let runner = null;

async function init() {
  if (runner) return runner;
  importScripts(`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`);
  const py = await self.loadPyodide();
  const res = await fetch(new URL('shims.py', self.location.href));
  if (!res.ok) throw new Error(`Could not load shims.py (${res.status})`);
  py.runPython(await res.text());
  runner = py.globals.get('run');
  return runner;
}

self.onmessage = async (e) => {
  const { id, type, backend, code } = e.data;
  try {
    const run = await init();
    if (type === 'warmup') { self.postMessage({ id, type: 'ready' }); return; }
    self.postMessage({ id, type: 'result', result: JSON.parse(run(backend, code)) });
  } catch (err) {
    self.postMessage({ id, type: 'fatal', error: String((err && err.message) || err) });
  }
};
