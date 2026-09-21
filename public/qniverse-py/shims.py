"""
Qniverse browser runtime: tiny, dependency-free stand-ins for the most-used parts of
Qiskit, Cirq and PennyLane.  They don't simulate anything - they *record* the circuit
your code builds and hand it to the shared JavaScript grader as
    {"n": <qubits>, "ops": [{"g": "cx", "q": [0, 1]}, {"g": "rx", "q": [0], "p": [1.57]}, ...]}

Runs unchanged in Pyodide (browser) and CPython (tests).  Anything outside the supported
subset raises ShimUnsupported with a message that suggests the Server runtime, which uses
the real libraries.
"""
import contextlib
import io
import json
import math
import sys
import traceback
import types


class ShimUnsupported(Exception):
    pass


HINT = " Switch Runtime to 'Server' to use the real library."


def _num(x, what="angle"):
    try:
        v = float(x)
    except Exception:
        raise ShimUnsupported("The %s must be a plain number (got %r)." % (what, x) + HINT)
    if not math.isfinite(v):
        raise ValueError("The %s must be finite." % what)
    return v


def _op(g, qubits, params=None):
    d = {"g": g, "q": [int(q) for q in qubits]}
    if params:
        d["p"] = [float(p) for p in params]
    return d


def _close(a, b):
    return abs(a - b) < 1e-9


# ----------------------------------------------------------------------------------------
# Qiskit
# ----------------------------------------------------------------------------------------
def _build_qiskit():
    mod = types.ModuleType("qiskit")

    class Gate:
        def __init__(self, name, num_qubits, params=None, label=None):
            self.name = name
            self.num_qubits = num_qubits
            self.params = list(params or [])

    class QuantumCircuit:
        def __init__(self, num_qubits, num_clbits=0, name=None):
            if not isinstance(num_qubits, int) or isinstance(num_qubits, bool):
                raise ShimUnsupported("QuantumCircuit(...) expects a number of qubits, e.g. QuantumCircuit(2)." + HINT)
            if num_qubits < 1:
                raise ValueError("QuantumCircuit needs at least one qubit")
            self.num_qubits = num_qubits
            self.num_clbits = num_clbits if isinstance(num_clbits, int) else 0
            self.name = name or "circuit"
            self._ops = []

        # -- helpers
        def _idx(self, q):
            if isinstance(q, bool) or not isinstance(q, int):
                raise ShimUnsupported("Qubits are given as integers here, e.g. qc.h(0) (got %r)." % (q,) + HINT)
            if q < 0 or q >= self.num_qubits:
                raise IndexError("qubit %d is out of range for QuantumCircuit(%d)" % (q, self.num_qubits))
            return q

        def _many(self, q):
            if isinstance(q, (list, tuple, range)):
                return [self._idx(x) for x in q]
            return [self._idx(q)]

        def _add(self, g, qs, params=None):
            if len(set(qs)) != len(qs):
                raise ValueError("%s was given the same qubit twice: %s" % (g, qs))
            self._ops.append(_op(g, qs, params))
            return self

        def _one(self, g, q, params=None):
            for x in self._many(q):
                self._add(g, [x], params)
            return self

        # -- introspection
        def __len__(self):
            return len([o for o in self._ops if o["g"] not in ("measure", "barrier")])

        def size(self):
            return len(self)

        def _text(self):
            lines = ["QuantumCircuit(%d qubits), %d operations" % (self.num_qubits, len(self._ops))]
            for o in self._ops:
                p = "(%s)" % ", ".join("%.4g" % v for v in o.get("p", [])) if o.get("p") else ""
                lines.append("  %s%s %s" % (o["g"], p, " ".join("q%d" % q for q in o["q"])))
            return "\n".join(lines)

        __str__ = _text
        __repr__ = _text

        def draw(self, *args, **kwargs):
            return self._text()

        # -- measurement & bookkeeping
        def measure(self, qubit, cbit=None):
            for x in self._many(qubit):
                self._ops.append(_op("measure", [x]))
            return self

        def measure_all(self, *args, **kwargs):
            for x in range(self.num_qubits):
                self._ops.append(_op("measure", [x]))
            return self

        def barrier(self, *qubits, **kwargs):
            self._ops.append({"g": "barrier", "q": []})
            return self

        def append(self, instruction, qargs=None, cargs=None):
            if getattr(instruction, "_qn_oracle", False):
                qs = self._many(list(qargs or []))
                if len(qs) != instruction.num_qubits:
                    raise ValueError("Oracle(%d) needs %d qubits, got %d" % (instruction.num_qubits, instruction.num_qubits, len(qs)))
                self._ops.append(_op("oracle", qs))
                return self
            raise ShimUnsupported(
                "qc.append() only accepts the Oracle helper in the browser runtime; use qc.h(0), qc.cx(0, 1), ... directly." + HINT
            )

    # gates taking only qubits
    for name, alias in [("id", ["i"]), ("x", []), ("y", []), ("z", []), ("h", []), ("s", []),
                        ("sdg", []), ("t", []), ("tdg", []), ("sx", [])]:
        def make(g):
            def f(self, qubit):
                return self._one(g, qubit)
            return f
        setattr(QuantumCircuit, name, make(name))
        for a in alias:
            setattr(QuantumCircuit, a, make(name))

    for name in ("rx", "ry", "rz", "p"):
        def make(g):
            def f(self, theta, qubit):
                return self._one(g, qubit, [_num(theta)])
            return f
        setattr(QuantumCircuit, name, make(name))

    for name, alias in [("cx", ["cnot"]), ("cy", []), ("cz", []), ("ch", []), ("swap", [])]:
        def make(g):
            def f(self, a, b):
                return self._add(g, [self._idx(a), self._idx(b)])
            return f
        setattr(QuantumCircuit, name, make(name))
        for a in alias:
            setattr(QuantumCircuit, a, make(name))

    for name in ("cp", "crx", "cry", "crz"):
        def make(g):
            def f(self, theta, c, t):
                return self._add(g, [self._idx(c), self._idx(t)], [_num(theta)])
            return f
        setattr(QuantumCircuit, name, make(name))

    for name, alias in [("ccx", ["toffoli"]), ("ccz", []), ("cswap", ["fredkin"])]:
        def make(g):
            def f(self, a, b, c):
                return self._add(g, [self._idx(a), self._idx(b), self._idx(c)])
            return f
        setattr(QuantumCircuit, name, make(name))
        for a in alias:
            setattr(QuantumCircuit, a, make(name))

    mod.QuantumCircuit = QuantumCircuit
    mod.Gate = Gate
    return mod, QuantumCircuit


# ----------------------------------------------------------------------------------------
# Cirq
# ----------------------------------------------------------------------------------------
def _build_cirq():
    mod = types.ModuleType("cirq")

    class LineQubit:
        def __init__(self, x):
            self.x = int(x)

        @staticmethod
        def range(*args):
            return [LineQubit(i) for i in range(*args)]

        def __eq__(self, o):
            return isinstance(o, LineQubit) and o.x == self.x

        def __hash__(self):
            return hash(("lq", self.x))

        def __lt__(self, o):
            return self.x < o.x

        def __repr__(self):
            return "cirq.LineQubit(%d)" % self.x

    def _q(q):
        if not isinstance(q, LineQubit):
            raise ShimUnsupported("Use cirq.LineQubit.range(n) for qubits in the browser runtime." + HINT)
        return q.x

    class Operation:
        def __init__(self, gate, qubits, controls=()):
            self.gate = gate
            self.qubits = tuple(qubits)
            self.controls = tuple(controls)

        def controlled_by(self, *controls):
            return Operation(self.gate, self.qubits, tuple(controls) + self.controls)

        def _resolve(self):
            """-> list of op dicts"""
            g = self.gate
            qs = [_q(q) for q in self.qubits]
            cs = [_q(c) for c in self.controls]
            if g.kind == "measure":
                return [_op("measure", [q]) for q in qs]
            if g.kind == "oracle":
                return [_op("oracle", qs)]
            name, params = g.base()
            if cs:
                allq = cs + qs
                key = (name, len(cs))
                table = {("x", 1): "cx", ("x", 2): "ccx", ("y", 1): "cy", ("z", 1): "cz", ("z", 2): "ccz",
                         ("h", 1): "ch", ("rx", 1): "crx", ("ry", 1): "cry", ("rz", 1): "crz", ("p", 1): "cp",
                         ("cx", 1): "ccx", ("swap", 1): "cswap"}
                if key not in table:
                    raise ShimUnsupported("controlled_by() on this gate isn't supported in the browser runtime." + HINT)
                return [_op(table[key], allq, params)]
            return [_op(name, qs, params)]

    class Gate:
        def __init__(self, kind, exponent=1.0, theta=None, nq=1):
            self.kind = kind
            self.exponent = float(exponent)
            self.theta = theta
            self.nq = nq

        def base(self):
            k, e = self.kind, self.exponent
            if k == "Z":
                for val, nm in ((1, "z"), (0.5, "s"), (-0.5, "sdg"), (0.25, "t"), (-0.25, "tdg")):
                    if _close(e, val):
                        return nm, None
                return "p", [math.pi * e]
            if k == "X":
                if _close(e, 1):
                    return "x", None
                if _close(e, 0.5):
                    return "sx", None
                return "rx", [math.pi * e]  # equal up to a global phase
            if k == "Y":
                if _close(e, 1):
                    return "y", None
                return "ry", [math.pi * e]  # equal up to a global phase
            if k == "CZ":
                return ("cz", None) if _close(e, 1) else ("cp", [math.pi * e])
            if k in ("rx", "ry", "rz"):
                return k, [self.theta]
            simple = {"H": "h", "I": "id", "CNOT": "cx", "SWAP": "swap", "CCX": "ccx", "CCZ": "ccz", "CSWAP": "cswap"}
            if k in simple:
                if not _close(e, 1):
                    raise ShimUnsupported("Powers of %s aren't supported in the browser runtime." % k + HINT)
                return simple[k], None
            raise ShimUnsupported("Unsupported gate %s." % k + HINT)

        def __call__(self, *qubits):
            return self.on(*qubits)

        def on(self, *qubits):
            if len(qubits) != self.nq:
                raise ValueError("This gate acts on %d qubit(s), got %d" % (self.nq, len(qubits)))
            return Operation(self, qubits)

        def on_each(self, *qubits):
            flat = []
            for q in qubits:
                flat.extend(q if isinstance(q, (list, tuple)) else [q])
            return [self.on(q) for q in flat]

        def __pow__(self, e):
            if self.kind in ("X", "Y", "Z", "CZ"):
                return Gate(self.kind, self.exponent * float(e), nq=self.nq)
            raise ShimUnsupported("Powers of %s aren't supported in the browser runtime." % self.kind + HINT)

    def mk(kind, e=1.0, nq=1):
        return Gate(kind, e, nq=nq)

    for nm, kind in (("XPowGate", "X"), ("YPowGate", "Y"), ("ZPowGate", "Z")):
        def make(kind):
            def f(*, exponent=1.0, global_shift=0.0):
                return Gate(kind, exponent)
            return f
        setattr(mod, nm, make(kind))
    mod.CZPowGate = lambda *, exponent=1.0, global_shift=0.0: Gate("CZ", exponent, nq=2)

    mod.X, mod.Y, mod.Z = mk("X"), mk("Y"), mk("Z")
    mod.H, mod.I = mk("H"), mk("I")
    mod.S, mod.T = Gate("Z", 0.5), Gate("Z", 0.25)
    mod.CNOT = mod.CX = mk("CNOT", nq=2)
    mod.CZ = mk("CZ", nq=2)
    mod.SWAP = mk("SWAP", nq=2)
    mod.CCX = mod.TOFFOLI = mk("CCX", nq=3)
    mod.CCZ = mk("CCZ", nq=3)
    mod.CSWAP = mk("CSWAP", nq=3)
    for nm in ("rx", "ry", "rz"):
        def make(nm):
            def f(rads):
                return Gate(nm, theta=_num(rads), nq=1)
            return f
        setattr(mod, nm, make(nm))

    def measure(*qubits, key=None):
        return Operation(Gate("measure", nq=len(qubits)), qubits)
    mod.measure = measure

    class Moment:
        def __init__(self, *ops):
            self.operations = list(ops)

    class Circuit:
        def __init__(self, *contents):
            self._ops = []
            for c in contents:
                self.append(c)

        def append(self, moment_or_ops, strategy=None):
            def walk(x):
                if isinstance(x, Operation):
                    self._ops.extend(x._resolve())
                elif isinstance(x, Moment):
                    for o in x.operations:
                        walk(o)
                elif isinstance(x, (list, tuple)) or hasattr(x, "__iter__"):
                    for y in x:
                        walk(y)
                else:
                    raise TypeError("circuit.append() expects operations such as cirq.H(q[0]), got %r" % (x,))
            walk(moment_or_ops)
            return self

        def __iadd__(self, other):
            return self.append(other)

        def _text(self):
            lines = ["cirq.Circuit, %d operations" % len(self._ops)]
            for o in self._ops:
                p = "(%s)" % ", ".join("%.4g" % v for v in o.get("p", [])) if o.get("p") else ""
                lines.append("  %s%s %s" % (o["g"], p, " ".join("q%d" % q for q in o["q"])))
            return "\n".join(lines)

        __str__ = _text
        __repr__ = _text

    mod.LineQubit = LineQubit
    mod.Circuit = Circuit
    mod.Moment = Moment
    mod.Gate = Gate
    mod.Operation = Operation
    return mod, Circuit, Operation, Gate


# ----------------------------------------------------------------------------------------
# PennyLane
# ----------------------------------------------------------------------------------------
class _Tape:
    current = None


def _build_pennylane():
    mod = types.ModuleType("pennylane")

    def wires_of(a, kw, nparams):
        rest = a[nparams:]
        w = rest[0] if rest else kw.get("wires")
        if w is None:
            raise TypeError("Missing wires - e.g. qml.Hadamard(wires=0)")
        w = list(w) if isinstance(w, (list, tuple, range)) else [w]
        for x in w:
            if isinstance(x, bool) or not isinstance(x, int):
                raise ShimUnsupported("Wires must be integers such as 0, 1, 2." + HINT)
            if x < 0:
                raise ValueError("Wire labels must be non-negative")
        return w

    class Op:
        def __init__(self, g, wires, params):
            self.g, self.wires, self.params = g, wires, params

        def __repr__(self):
            return "%s(wires=%s)" % (self.g, self.wires)

    def emit(g, wires, params=None):
        op = Op(g, wires, params)
        if _Tape.current is not None:
            _Tape.current.append(op)
        return op

    table = [
        ("Identity", "id", 0, 1), ("PauliX", "x", 0, 1), ("PauliY", "y", 0, 1), ("PauliZ", "z", 0, 1),
        ("Hadamard", "h", 0, 1), ("S", "s", 0, 1), ("T", "t", 0, 1), ("SX", "sx", 0, 1),
        ("RX", "rx", 1, 1), ("RY", "ry", 1, 1), ("RZ", "rz", 1, 1), ("PhaseShift", "p", 1, 1),
        ("CNOT", "cx", 0, 2), ("CY", "cy", 0, 2), ("CZ", "cz", 0, 2), ("CH", "ch", 0, 2),
        ("ControlledPhaseShift", "cp", 1, 2), ("CRX", "crx", 1, 2), ("CRY", "cry", 1, 2), ("CRZ", "crz", 1, 2),
        ("SWAP", "swap", 0, 2), ("Toffoli", "ccx", 0, 3), ("CCZ", "ccz", 0, 3), ("CSWAP", "cswap", 0, 3),
    ]
    by_func = {}
    for cls_name, g, npar, nw in table:
        def make(cls_name, g, npar, nw):
            def f(*a, **kw):
                params = [_num(x) for x in a[:npar]] if npar else None
                if npar and len(a) < npar:
                    if "phi" in kw:
                        params = [_num(kw["phi"])]
                    else:
                        raise TypeError("%s needs an angle" % cls_name)
                w = wires_of(a, kw, npar)
                if len(w) != nw:
                    raise ValueError("%s acts on %d wire(s), got %d" % (cls_name, nw, len(w)))
                if len(set(w)) != len(w):
                    raise ValueError("%s was given the same wire twice" % cls_name)
                return emit(g, w, params)
            f.__name__ = cls_name
            return f
        fn = make(cls_name, g, npar, nw)
        setattr(mod, cls_name, fn)
        by_func[fn] = (g, npar)
    mod.CCX = mod.Toffoli
    mod.CX = mod.CNOT

    def adjoint(fn):
        if fn not in by_func:
            raise ShimUnsupported("qml.adjoint() supports the basic gates only." + HINT)
        g, npar = by_func[fn]

        def wrapper(*a, **kw):
            tape = _Tape.current
            before = len(tape) if tape is not None else 0
            op = fn(*a, **kw)
            inv = {"s": "sdg", "t": "tdg", "h": "h", "x": "x", "y": "y", "z": "z", "id": "id", "cx": "cx", "cy": "cy",
                   "cz": "cz", "ch": "ch", "swap": "swap", "ccx": "ccx", "ccz": "ccz", "cswap": "cswap"}
            if g in inv:
                op.g = inv[g]
            elif npar:
                op.params = [-p for p in op.params]
            else:
                raise ShimUnsupported("qml.adjoint of this gate isn't supported in the browser runtime." + HINT)
            return op
        return wrapper
    mod.adjoint = adjoint

    # measurement processes and devices: accepted, but they record nothing
    def drop(obs):
        t = _Tape.current
        if t is not None and obs in t:
            t.remove(obs)
    mod.expval = lambda obs=None, **k: (drop(obs), None)[1]
    mod.var = mod.expval
    mod.probs = lambda *a, **k: None
    mod.state = lambda *a, **k: None
    mod.sample = lambda *a, **k: None
    mod.counts = lambda *a, **k: None

    class Device:
        def __init__(self, name, wires=None, shots=None, **kw):
            self.name, self.wires = name, wires
    mod.device = Device

    def qnode(dev=None, **kw):
        def deco(fn):
            def wrapper(*a, **k):
                if _Tape.current is not None:
                    return fn(*a, **k)
                _Tape.current = []
                try:
                    return fn(*a, **k)
                finally:
                    wrapper._last_tape = _Tape.current
                    _Tape.current = None
            wrapper._qn_qnode = True
            wrapper._last_tape = []
            wrapper.__name__ = getattr(fn, "__name__", "circuit")
            return wrapper
        return deco
    mod.qnode = qnode
    mod.Op = Op
    return mod, Op, emit


def _record_pennylane(fn):
    if getattr(fn, "_qn_qnode", False):
        fn()
        return fn._last_tape
    _Tape.current = []
    try:
        fn()
        return _Tape.current
    finally:
        _Tape.current = None


# ----------------------------------------------------------------------------------------
# module installation & entry point
# ----------------------------------------------------------------------------------------
_STATE = {}


def install():
    if _STATE:
        return _STATE
    qk, QuantumCircuit = _build_qiskit()
    cq, Circuit, COperation, CGate = _build_cirq()
    pl, POp, pemit = _build_pennylane()

    qn = types.ModuleType("qniverse")
    qn_qk = types.ModuleType("qniverse.qiskit")
    qn_cq = types.ModuleType("qniverse.cirq")
    qn_pl = types.ModuleType("qniverse.pennylane")

    class QOracle(qk.Gate):
        _qn_oracle = True

        def __init__(self, num_qubits):
            super().__init__("oracle", int(num_qubits), [])
    qn_qk.Oracle = QOracle

    class COracle:
        def __init__(self, num_qubits):
            self.n = int(num_qubits)

        def on(self, *qubits):
            if len(qubits) != self.n:
                raise ValueError("Oracle(%d) needs %d qubits, got %d" % (self.n, self.n, len(qubits)))
            return COperation(CGate("oracle", nq=self.n), qubits)
    qn_cq.Oracle = COracle

    def poracle(wires):
        w = list(wires) if isinstance(wires, (list, tuple, range)) else [wires]
        return pemit("oracle", w)

    def POracle(wires):
        return poracle(wires)
    qn_pl.Oracle = POracle

    qn.qiskit, qn.cirq, qn.pennylane = qn_qk, qn_cq, qn_pl
    for name, m in (("qiskit", qk), ("cirq", cq), ("pennylane", pl), ("qniverse", qn),
                    ("qniverse.qiskit", qn_qk), ("qniverse.cirq", qn_cq), ("qniverse.pennylane", qn_pl)):
        sys.modules[name] = m
    _STATE.update(QuantumCircuit=QuantumCircuit, Circuit=Circuit)
    return _STATE


def _collect(backend, ns):
    st = _STATE
    if backend == "qiskit":
        qc = ns.get("qc")
        if not isinstance(qc, st["QuantumCircuit"]):
            found = [v for v in ns.values() if isinstance(v, st["QuantumCircuit"])]
            if not found:
                raise LookupError("No QuantumCircuit found. Create one named qc, e.g.  qc = QuantumCircuit(2)")
            qc = found[-1]
        return {"n": qc.num_qubits, "ops": qc._ops}
    if backend == "cirq":
        c = ns.get("circuit")
        if not isinstance(c, st["Circuit"]):
            found = [v for v in ns.values() if isinstance(v, st["Circuit"])]
            if not found:
                raise LookupError("No cirq.Circuit found. Create one named circuit, e.g.  circuit = cirq.Circuit()")
            c = found[-1]
        n = 1 + max([q for o in c._ops for q in o["q"]] or [-1])
        return {"n": max(n, 1), "ops": c._ops}
    if backend == "pennylane":
        fn = ns.get("circuit")
        if not callable(fn):
            raise LookupError("Define a function named circuit(), e.g.  def circuit():  qml.Hadamard(wires=0)")
        tape = _record_pennylane(fn)
        ops = []
        for o in tape:
            ops.append(_op(o.g, o.wires, o.params))
        n = 1 + max([q for o in ops for q in o["q"]] or [-1])
        return {"n": max(n, 1), "ops": ops}
    raise ValueError("Unknown backend %r" % backend)


def _user_line(tb):
    line = None
    for fs in traceback.extract_tb(tb):
        if fs.filename == "<solution>":
            line = fs.lineno
    return line


def run(backend, code):
    """Execute user code; returns a JSON string {ok, circuit|error, kind, stdout}."""
    install()
    _Tape.current = None
    buf = io.StringIO()
    ns = {"__name__": "__qniverse_solution__"}
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(code, "<solution>", "exec"), ns)
            circuit = _collect(backend, ns)
        return json.dumps({"ok": True, "circuit": circuit, "stdout": buf.getvalue()[:4000]})
    except ShimUnsupported as e:
        return json.dumps({"ok": False, "kind": "unsupported", "error": str(e), "stdout": buf.getvalue()[:4000]})
    except SyntaxError as e:
        return json.dumps({"ok": False, "kind": "error", "error": "Line %s: SyntaxError: %s" % (e.lineno, e.msg)})
    except (ImportError, ModuleNotFoundError) as e:
        return json.dumps({"ok": False, "kind": "unsupported",
                           "error": "%s. The browser runtime only ships a subset of Python libraries." % e + HINT})
    except (Exception, SystemExit) as e:
        line = _user_line(e.__traceback__)
        where = "Line %d: " % line if line else ""
        return json.dumps({"ok": False, "kind": "error", "error": "%s%s: %s" % (where, type(e).__name__, e),
                           "stdout": buf.getvalue()[:4000]})
    finally:
        _Tape.current = None
