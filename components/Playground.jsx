// components/Playground.jsx
'use client';

import { useMemo, useState } from 'react';
import {
  GATE_GROUPS,
  GATE_LIBRARY,
  defaultParams,
  gateMatrix,
  formatAngle,
} from '@/lib/gates';
import { simulate, blochFromState, parseCode, circuitText, circuitToQASM } from '@/lib/quantum';
import { useCircuitSession, toast } from '@/lib/session';

const MAX_QUBITS = 6;
const MIN_COLS = 8;

function formatComplex(v) {
  const re = Math.abs(v.re) < 1e-10 ? 0 : v.re;
  const im = Math.abs(v.im) < 1e-10 ? 0 : v.im;

  if (im === 0) return re.toFixed(3);
  if (re === 0) return `${im.toFixed(3)}i`;
  return `${re.toFixed(3)} ${im >= 0 ? '+' : '−'} ${Math.abs(im).toFixed(3)}i`;
}

function MatrixView({ matrix }) {
  if (!matrix) {
    return (
      <div className="gate-no-matrix">
        <b>No unitary matrix</b>
        <span>This operation is non-unitary and is described by its state-transition rule instead.</span>
      </div>
    );
  }

  return (
    <div className="gate-matrix" role="table" aria-label="Gate matrix">
      {matrix.map((row, r) => (
        <div className="matrix-row" key={r}>
          <span className="matrix-bracket">│</span>
          {row.map((v, c) => (
            <code key={c}>{formatComplex(v)}</code>
          ))}
          <span className="matrix-bracket">│</span>
        </div>
      ))}
    </div>
  );
}

function Bloch({ v }) {
  const scale = 31;
  const x = 40 + Math.max(-1, Math.min(1, v.x)) * scale;
  const y = 40 - Math.max(-1, Math.min(1, v.z)) * scale;

  return (
    <div className="gate-bloch">
      <svg viewBox="0 0 80 80" aria-label="Bloch vector">
        <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" opacity=".25" />
        <ellipse cx="40" cy="40" rx="30" ry="10" fill="none" stroke="currentColor" opacity=".18" />
        <path d="M40 8V72M8 40H72" stroke="currentColor" opacity=".18" />
        <line x1="40" y1="40" x2={x} y2={y} stroke="#0f62fe" strokeWidth="2.5" />
        <circle cx={x} cy={y} r="4" fill="#0f62fe" />
      </svg>
      <code>X {v.x.toFixed(2)} · Y {v.y.toFixed(2)} · Z {v.z.toFixed(2)}</code>
    </div>
  );
}

function GateInspector({
  gateId,
  params,
  setParams,
  selectedInstance,
  onAddExample,
  onAskBujji,
}) {
  const gate = GATE_LIBRARY[gateId];
  if (!gate) return null;

  const matrix = gateMatrix(gateId, params);
  const paramEntries = Object.entries(gate.params || {});

  function changeParam(key, value) {
    const next = { ...params, [key]: Number(value) };
    setParams(next);
  }

  return (
    <aside className="gate-inspector">
      <div className="inspector-top">
        <div>
          <span className="inspector-eyebrow">{gate.category.toUpperCase()}</span>
          <h2>{gate.name}</h2>
        </div>
        <div className="inspector-symbol">{gate.symbol}</div>
      </div>

      <p className="gate-description">{gate.description}</p>

      <section className="inspector-block">
        <div className="block-label">MATRIX</div>
        <MatrixView matrix={matrix} />
      </section>

      {paramEntries.length > 0 && (
        <section className="inspector-block">
          <div className="block-label">PARAMETERS</div>
          {paramEntries.map(([key, spec]) => (
            <label className="gate-param" key={key}>
              <div>
                <span>{spec.label}</span>
                <code>{formatAngle(params[key])}</code>
              </div>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={params[key]}
                onChange={(e) => changeParam(key, e.target.value)}
              />
            </label>
          ))}
          {selectedInstance && <small className="param-note">Parameter changes apply to the selected gate.</small>}
        </section>
      )}

      <section className="inspector-block">
        <div className="block-label">WHAT IT DOES</div>
        <div className="gate-equation">{gate.equation}</div>
        <ul className="gate-properties">
          {gate.properties.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="inspector-block">
        <div className="block-label">EXAMPLE</div>
        <div className="gate-example">{gate.example}</div>
      </section>

      {gate.category !== 'measurement' && gate.category !== 'circuit' && (
        <button className="inspector-example-btn" onClick={onAddExample}>
          Try this gate →
        </button>
      )}

      <button className="inspector-bujji" onClick={onAskBujji}>
        <span>✦</span> Ask Bujji about {gate.symbol}
      </button>
    </aside>
  );
}

function GateLibrary({ selected, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(
    Object.fromEntries(GATE_GROUPS.map((g) => [g.id, true]))
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GATE_GROUPS.map((group) => ({
      ...group,
      gates: group.gates.filter((id) => {
        if (!q) return true;
        const g = GATE_LIBRARY[id];
        return `${g.name} ${g.symbol} ${g.tags.join(' ')}`.toLowerCase().includes(q);
      }),
    })).filter((group) => group.gates.length);
  }, [query]);

  return (
    <aside className="gate-library">
      <div className="library-head">
        <span>GATE LIBRARY</span>
        <small>{Object.keys(GATE_LIBRARY).length} operations</small>
      </div>

      <div className="gate-search">
        <span>⌕</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search gates..." />
      </div>

      <div className="gate-groups">
        {filteredGroups.map((group) => (
          <section className="gate-group" key={group.id}>
            <button
              className="gate-group-title"
              onClick={() => setOpen((x) => ({ ...x, [group.id]: !x[group.id] }))}
            >
              <span>{open[group.id] ? '▾' : '▸'} {group.label}</span>
              <small>{group.gates.length}</small>
            </button>

            {open[group.id] && (
              <div className="gate-list">
                {group.gates.map((id) => {
                  const gate = GATE_LIBRARY[id];
                  return (
                    <button
                      key={id}
                      className={`gate-library-item ${selected === id ? 'active' : ''}`}
                      draggable
                      onDragStart={() => onSelect(id)}
                      onClick={() => onSelect(id)}
                    >
                      <span className="gate-symbol">{gate.symbol}</span>
                      <span>
                        <b>{gate.name}</b>
                        <small>{gate.category}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}

function ExperimentResults({ result, n, shots, tab, setTab, blochQubit, setBlochQubit }) {
  const bloch = useMemo(
    () => blochFromState(result.statevector, n, Math.min(blochQubit, n - 1)),
    [result, n, blochQubit]
  );

  return (
    <section className="experiment-results">
      <div className="experiment-head">
        <div>
          <span className="inspector-eyebrow">EXPERIMENT</span>
          <h2>What did the circuit do?</h2>
        </div>
        <div className="result-tabs">
          {[
            ['prob', 'Probabilities'],
            ['state', 'Statevector'],
            ['bloch', 'Bloch sphere'],
          ].map(([id, label]) => (
            <button className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'prob' && (
        <div className="histogram">
          {result.counts.map((x) => (
            <div className="hist" key={x.basis}>
              <div className="bar" style={{ height: `${Math.max(4, x.probability * 170)}px` }} />
              <b>|{x.basis}⟩</b>
              <span>{Math.round(x.probability * 100)}%</span>
              <small>{x.count} / {shots}</small>
            </div>
          ))}
        </div>
      )}

      {tab === 'state' && (
        <div className="state-grid">
          {result.statevector.map((v, i) => (
            <div className="state-row" key={i}>
              <code>|{i.toString(2).padStart(n, '0')}⟩</code>
              <span>{formatComplex(v)}</span>
              <b>{(result.probabilities[i] * 100).toFixed(2)}%</b>
            </div>
          ))}
        </div>
      )}

      {tab === 'bloch' && (
        <div className="bloch-result">
          <Bloch v={bloch} />
          <div>
            <span className="block-label">REDUCED STATE</span>
            <div className="qubit-picker">
              {Array.from({ length: n }, (_, q) => (
                <button key={q} className={blochQubit === q ? 'active' : ''} onClick={() => setBlochQubit(q)}>
                  q{q}
                </button>
              ))}
            </div>
            <p>
              The Bloch vector is computed from the reduced density matrix of q{blochQubit}.
              {bloch.purity < 0.98
                ? ' Its shortened vector indicates that this qubit is mixed/entangled with the rest of the system.'
                : ' The state is pure, so the vector lies on the sphere surface.'}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Playground() {
  const { circuit, setCircuit } = useCircuitSession();
  const c = circuit || [];

  const [n, setN] = useState(2);
  const [shots, setShots] = useState(1000);
  const [selectedGateId, setSelectedGateId] = useState('H');
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [inspectorParams, setInspectorParams] = useState(defaultParams('H'));
  const [blochQubit, setBlochQubit] = useState(0);
  const [tab, setTab] = useState('prob');
  const [running, setRunning] = useState(false);
  const [animCol, setAnimCol] = useState(-1);
  const [code, setCode] = useState('qc.h(0)\nqc.cx(0, 1)\nqc.measure_all()');

  const numCols = Math.max(MIN_COLS, ...c.map((g) => (g.col ?? 0) + 2));
  const gridCols = `70px repeat(${numCols}, minmax(64px, 1fr))`;

  const selectedGateDef = GATE_LIBRARY[selectedGateId] || GATE_LIBRARY.H;
  const selectedPlaced = c.find((g) => g.id === selectedInstanceId);
  const inspectorId = selectedPlaced?.name || selectedGateDef.id;
  const inspectorDef = GATE_LIBRARY[inspectorId];
  const currentInspectorParams = selectedPlaced?.params || inspectorParamsStateFallback(inspectorDef, inspectorParams);

  const result = useMemo(() => {
    try {
      return simulate(n, c, shots);
    } catch {
      return simulate(n, [], shots);
    }
  }, [n, c, shots]);

  function inspectorParamsStateFallback(def, local) {
    if (selectedPlaced?.params) return selectedPlaced.params;
    if (!def?.params) return {};
    const defaults = defaultParams(def.id);
    return { ...defaults, ...local };
  }

  function selectGate(id) {
    setSelectedGateId(id);
    setSelectedInstanceId(null);
    setInspectorParams(defaultParams(id));
  }

  function selectPlaced(gate) {
    setSelectedGateId(gate.name);
    setSelectedInstanceId(gate.id);
    setInspectorParams({ ...defaultParams(gate.name), ...(gate.params || {}) });
  }

  function createGate(q, col) {
    const def = GATE_LIBRARY[selectedGateId];
    const gate = {
      id: crypto.randomUUID(),
      name: selectedGateId,
      qubit: q,
      col,
      params: defaultParams(selectedGateId),
    };

    if ((def.qubits || 1) === 2) {
      gate.target = (q + 1) % n;
    }

    if ((def.qubits || 1) === 3) {
      if (q + 2 >= n) return null;
      gate.targets = [q + 1, q + 2];
    }

    return gate;
  }

  function placeGate(q, col) {
    const gate = createGate(q, col);
    if (!gate) {
      toast(`${GATE_LIBRARY[selectedGateId].symbol} needs ${GATE_LIBRARY[selectedGateId].qubits} qubits`);
      return;
    }

    const occupied = c.find((g) => g.col === col && (g.qubit === q || g.target === q || g.targets?.includes(q)));
    if (occupied) {
      const shifted = c.map((g) => (g.col >= col ? { ...g, col: g.col + 1 } : g));
      setCircuit([...shifted, gate]);
    } else {
      setCircuit([...c, gate]);
    }

    selectPlaced(gate);
  }

  function removeGate(gate) {
    setCircuit(c.filter((x) => x.id !== gate.id));
    setSelectedInstanceId(null);
  }

  function handleDrop(q, col) {
    placeGate(q, col);
  }

  function updateInspectorParams(next) {
    setInspectorParams(next);
    if (!selectedPlaced) return;
    setCircuit(c.map((g) => g.id === selectedPlaced.id ? { ...g, params: next } : g));
  }

  function run() {
    setRunning(true);
    setAnimCol(0);
    setTimeout(() => {
      setRunning(false);
      setAnimCol(-1);
      toast('Circuit simulated successfully');
    }, Math.min(numCols * 240 + 300, 3200));
  }

  function addExample() {
    const def = GATE_LIBRARY[inspectorId];
    const example = { id: crypto.randomUUID(), name: inspectorId, qubit: 0, col: c.length ? Math.max(...c.map((g) => g.col ?? 0)) + 1 : 0, params: defaultParams(inspectorId) };
    if (def.qubits === 2) example.target = n > 1 ? 1 : 0;
    if (def.qubits === 3) {
      if (n < 3) {
        setN(3);
        example.targets = [1, 2];
      } else {
        example.targets = [1, 2];
      }
    }
    setCircuit([...c, example]);
    selectPlaced(example);
    toast(`${def.symbol} added to q0`);
  }

  function askBujji() {
    window.dispatchEvent(new CustomEvent('qniverse:tutor', {
      detail: {
        open: true,
        prompt: `Explain the ${inspectorDef.name} gate in depth, including its matrix, action on |0⟩ and |1⟩, Bloch-sphere effect, circuit use and the current circuit context.`,
        context: {
          gate: inspectorDef.name,
          matrix: gateMatrix(inspectorId, inspectorParams),
          circuit: circuitText(c),
        },
      },
    }));
  }

  function loadCode() {
    const parsed = parseCode(code);
    setCircuit(parsed);
    toast('Code converted to circuit');
  }

  const qasm = useMemo(() => circuitToQASM(c, n), [c, n]);

  return (
    <div className="lab-page-new">
      <div className="lab-heading-new">
        <div>
          <span className="lab-kicker">QNIVERSE / QUANTUM LAB</span>
          <h1>Build the state you want to understand.</h1>
          <p>Select a gate, inspect its mathematics, place it on the circuit, then run the experiment.</p>
        </div>
        <div className="lab-heading-actions">
          <button className="lab-secondary" onClick={() => { setCircuit([]); setSelectedInstanceId(null); }}>Clear</button>
          <button className="lab-primary" onClick={run}>{running ? 'Running…' : 'Run circuit'} <span>▶</span></button>
        </div>
      </div>

      <div className="lab-explorer">
        <GateLibrary selected={selectedGateId} onSelect={selectGate} />

        <section className="circuit-workspace">
          <div className="workspace-toolbar">
            <div className="workspace-status"><i /> SIMULATOR READY <span>· {n}-qubit workspace</span></div>
            <div className="workspace-controls">
              <label>SHOTS
                <select value={shots} onChange={(e) => setShots(Number(e.target.value))}>
                  <option value={100}>100</option>
                  <option value={1000}>1,000</option>
                  <option value={10000}>10,000</option>
                </select>
              </label>
              <label>QUBITS
                <button onClick={() => { setN((v) => Math.max(1, v - 1)); setBlochQubit((q) => Math.max(0, q - 1)); }} disabled={n <= 1}>−</button>
                <b>{n}</b>
                <button onClick={() => setN((v) => Math.min(MAX_QUBITS, v + 1))} disabled={n >= MAX_QUBITS}>+</button>
              </label>
            </div>
          </div>

          <div className="circuit-board-new">
            <div className="time-row-new" style={{ gridTemplateColumns: gridCols }}>
              <span>QUBITS</span>
              {Array.from({ length: numCols }, (_, i) => <span key={i}>t{i + 1}</span>)}
            </div>

            {Array.from({ length: n }, (_, q) => (
              <div className="wire-row-new" key={q} style={{ gridTemplateColumns: gridCols }}>
                <strong>q{q}</strong>
                {Array.from({ length: numCols }, (_, col) => {
                  const gate = c.find((g) => g.col === col && (g.qubit === q || g.target === q || g.targets?.includes(q)));
                  const isSelected = gate?.id === selectedInstanceId;

                  return (
                    <button
                      key={col}
                      className={`wire-slot-new ${animCol === col ? 'animating' : ''}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(q, col)}
                      onClick={() => gate ? selectPlaced(gate) : placeGate(q, col)}
                      title={gate ? `${GATE_LIBRARY[gate.name]?.name || gate.name} — click to inspect` : `Place ${selectedGateDef.symbol}`}
                    >
                      {gate ? (
                        <span
                          className={`placed-new ${isSelected ? 'selected' : ''} ${gate.target === q || gate.targets?.includes(q) ? 'target' : ''}`}
                          onDoubleClick={(e) => { e.stopPropagation(); removeGate(gate); }}
                        >
                          {gate.target === q
                            ? (gate.name === 'CX' ? '⊕' : gate.name === 'SWAP' ? '×' : GATE_LIBRARY[gate.name]?.symbol)
                            : gate.targets?.includes(q)
                              ? (gate.name === 'CCX' ? '⊕' : gate.name === 'CSWAP' ? '×' : GATE_LIBRARY[gate.name]?.symbol)
                              : GATE_LIBRARY[gate.name]?.symbol || gate.name}
                        </span>
                      ) : <span className="empty-slot">+</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="experiment-bar">
            <div>
              <span className="bar-label">CURRENT CIRCUIT</span>
              <code>{circuitText(c)}</code>
            </div>
            <div className="experiment-bar-actions">
              <button onClick={run}>Animate</button>
              <button onClick={() => window.dispatchEvent(new CustomEvent('qniverse:tutor', { detail: { open: true } }))}>Ask Bujji</button>
            </div>
          </div>

          <ExperimentResults
            result={result}
            n={n}
            shots={shots}
            tab={tab}
            setTab={setTab}
            blochQubit={Math.min(blochQubit, n - 1)}
            setBlochQubit={setBlochQubit}
          />

          <details className="advanced-panel">
            <summary>Advanced / Code / OpenQASM</summary>
            <div className="advanced-grid">
              <div>
                <span className="block-label">OPENQASM</span>
                <pre>{qasm}</pre>
              </div>
              <div>
                <span className="block-label">CODE INPUT</span>
                <textarea value={code} onChange={(e) => setCode(e.target.value)} />
                <button className="lab-secondary" onClick={loadCode}>Apply code</button>
              </div>
            </div>
          </details>
        </section>

        <GateInspector
          gateId={inspectorId}
          params={currentInspectorParams}
          setParams={updateInspectorParams}
          selectedInstance={selectedPlaced}
          onAddExample={addExample}
          onAskBujji={askBujji}
        />
      </div>

      <div className="lab-note">
        <b>Learning loop:</b> inspect the gate → predict what it will do → place it → run → compare the result → ask Bujji → modify the circuit.
      </div>
    </div>
  );
}
