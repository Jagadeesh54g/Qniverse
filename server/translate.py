"""
Run learner code against the REAL Qiskit / Cirq / PennyLane and convert the circuit it builds
into Qniverse's common format:  {"n": int, "ops": [{"g": "cx", "q": [0, 1], "p": [..]?}]}
The browser then grades that circuit with the same JavaScript grader used everywhere else.
"""
import math

SIMPLE = {"id", "x", "y", "z", "h", "s", "sdg", "t", "tdg", "sx", "rx", "ry", "rz", "p", "cx", "cy", "cz",
          "ch", "cp", "crx", "cry", "crz", "swap", "ccx", "ccz", "cswap"}


class Unsupported(Exception):
    pass


def _op(g, qubits, params=None):
    d = {"g": g, "q": [int(q) for q in qubits]}
    if params:
        d["p"] = [float(p) for p in params]
    return d


def _f(x):
    try:
        v = float(x)
    except Exception:
        raise Unsupported("Parameters must be plain numbers (unbound Parameter objects can't be graded).")
    if not math.isfinite(v):
        raise ValueError("Parameters must be finite numbers.")
    return v


def _close(a, b):
    return abs(a - b) < 1e-9


# ---------------------------------------------------------------- Qiskit
def from_qiskit(ns):
    from qiskit import QuantumCircuit
    qc = ns.get("qc")
    if not isinstance(qc, QuantumCircuit):
        found = [v for v in ns.values() if isinstance(v, QuantumCircuit)]
        if not found:
            raise LookupError("No QuantumCircuit found. Create one named qc, e.g.  qc = QuantumCircuit(2)")
        qc = found[-1]
    aliases = {"u1": "p", "cu1": "cp"}
    ops = []
    for inst in qc.data:
        op = inst.operation
        name = aliases.get(op.name, op.name)
        qs = [qc.find_bit(q).index for q in inst.qubits]
        if name in ("barrier",):
            ops.append({"g": "barrier", "q": []})
        elif name == "measure":
            ops.append(_op("measure", qs))
        elif name == "oracle":
            ops.append(_op("oracle", qs))
        elif name in SIMPLE:
            ops.append(_op(name, qs, [_f(p) for p in op.params]))
        else:
            raise Unsupported(
                f"The gate '{op.name}' isn't supported by the grader. Use basic gates "
                "(h, x, y, z, s, t, rx, ry, rz, p, cx, cz, swap, ccx, ...) or call .decompose() on it first."
            )
    return {"n": qc.num_qubits, "ops": ops}


# ---------------------------------------------------------------- Cirq
def _cirq_base(cirq, g):
    """single-qubit style base gate -> (name, params)"""
    shift = getattr(g, "global_shift", 0.0)
    if isinstance(g, cirq.ZPowGate):
        e = _f(g.exponent)
        if _close(shift, -0.5):
            return "rz", [math.pi * e]
        for val, nm in ((1, "z"), (0.5, "s"), (-0.5, "sdg"), (0.25, "t"), (-0.25, "tdg")):
            if _close(e, val):
                return nm, None
        return "p", [math.pi * e]
    if isinstance(g, cirq.XPowGate):
        e = _f(g.exponent)
        if _close(shift, -0.5):
            return "rx", [math.pi * e]
        if _close(e, 1):
            return "x", None
        if _close(e, 0.5):
            return "sx", None
        return "rx", [math.pi * e]  # equal up to a global phase
    if isinstance(g, cirq.YPowGate):
        e = _f(g.exponent)
        if _close(shift, -0.5):
            return "ry", [math.pi * e]
        return ("y", None) if _close(e, 1) else ("ry", [math.pi * e])
    if isinstance(g, cirq.HPowGate) and _close(_f(g.exponent), 1):
        return "h", None
    if isinstance(g, cirq.IdentityGate) and g.num_qubits() == 1:
        return "id", None
    raise Unsupported(f"The gate {g!r} isn't supported by the grader.")


def from_cirq(ns):
    import cirq
    c = ns.get("circuit")
    if not isinstance(c, cirq.Circuit):
        found = [v for v in ns.values() if isinstance(v, cirq.Circuit)]
        if not found:
            raise LookupError("No cirq.Circuit found. Create one named circuit, e.g.  circuit = cirq.Circuit()")
        c = found[-1]

    def qi(q):
        if not isinstance(q, cirq.LineQubit):
            raise Unsupported("Use cirq.LineQubit.range(n) for qubits so indices are unambiguous.")
        return q.x

    ops = []
    for op in c.all_operations():
        g = op.gate
        qs = [qi(q) for q in op.qubits]
        if g is None:
            raise Unsupported(f"Unsupported operation {op!r}")
        if isinstance(g, cirq.MeasurementGate):
            ops += [_op("measure", [q]) for q in qs]
        elif type(g).__name__ == "Oracle":
            ops.append(_op("oracle", qs))
        elif isinstance(g, cirq.ControlledGate):
            if any(cv != (1,) for cv in g.control_values):
                raise Unsupported("Only controls on |1> are supported.")
            k = g.num_controls()
            name, params = _cirq_base(cirq, g.sub_gate)
            table = {("x", 1): "cx", ("x", 2): "ccx", ("y", 1): "cy", ("z", 1): "cz", ("z", 2): "ccz", ("h", 1): "ch",
                     ("rx", 1): "crx", ("ry", 1): "cry", ("rz", 1): "crz", ("p", 1): "cp"}
            if (name, k) not in table:
                raise Unsupported(f"Controlled version of {g.sub_gate!r} isn't supported.")
            ops.append(_op(table[(name, k)], qs, params))
        elif isinstance(g, cirq.CZPowGate):
            e = _f(g.exponent)
            ops.append(_op("cz", qs) if _close(e, 1) else _op("cp", qs, [math.pi * e]))
        elif isinstance(g, cirq.CXPowGate) and _close(_f(g.exponent), 1):
            ops.append(_op("cx", qs))
        elif type(g).__name__ == "CYPowGate" and _close(_f(g.exponent), 1):
            ops.append(_op("cy", qs))
        elif isinstance(g, cirq.SwapPowGate) and _close(_f(g.exponent), 1):
            ops.append(_op("swap", qs))
        elif isinstance(g, cirq.CCXPowGate) and _close(_f(g.exponent), 1):
            ops.append(_op("ccx", qs))
        elif isinstance(g, cirq.CCZPowGate) and _close(_f(g.exponent), 1):
            ops.append(_op("ccz", qs))
        elif isinstance(g, cirq.CSwapGate):
            ops.append(_op("cswap", qs))
        else:
            name, params = _cirq_base(cirq, g)
            ops.append(_op(name, qs, params))
    n = 1 + max([q for o in ops for q in o["q"]] or [-1])
    return {"n": max(n, 1), "ops": ops}


# ---------------------------------------------------------------- PennyLane
PL = {"Identity": "id", "PauliX": "x", "PauliY": "y", "PauliZ": "z", "Hadamard": "h", "S": "s", "T": "t", "SX": "sx",
      "RX": "rx", "RY": "ry", "RZ": "rz", "PhaseShift": "p", "CNOT": "cx", "CY": "cy", "CZ": "cz", "CH": "ch",
      "ControlledPhaseShift": "cp", "CRX": "crx", "CRY": "cry", "CRZ": "crz", "SWAP": "swap", "Toffoli": "ccx",
      "CCZ": "ccz", "CSWAP": "cswap"}
SELF_INVERSE = {"id", "x", "y", "z", "h", "cx", "cy", "cz", "ch", "swap", "ccx", "ccz", "cswap"}


def from_pennylane(ns):
    import pennylane as qml
    fn = ns.get("circuit")
    if not callable(fn):
        raise LookupError("Define a function named circuit(), e.g.  def circuit():  qml.Hadamard(wires=0)")
    fn = getattr(fn, "func", fn)  # unwrap a QNode
    qs = qml.tape.make_qscript(fn)()
    ops = []
    for op in qs.operations:
        wires = op.wires.tolist()
        if any(not isinstance(w, int) for w in wires):
            raise Unsupported("Wires must be integers such as 0, 1, 2.")
        name = op.name
        if name == "Oracle":
            ops.append(_op("oracle", wires))
            continue
        if name.startswith("Adjoint(") and name.endswith(")"):
            base = PL.get(name[8:-1])
            if base is None:
                raise Unsupported(f"{name} isn't supported by the grader.")
            if base == "s":
                ops.append(_op("sdg", wires))
            elif base == "t":
                ops.append(_op("tdg", wires))
            elif base in SELF_INVERSE:
                ops.append(_op(base, wires))
            elif op.parameters:
                ops.append(_op(base, wires, [-_f(p) for p in op.parameters]))
            else:
                raise Unsupported(f"{name} isn't supported by the grader.")
            continue
        g = PL.get(name)
        if g is None:
            raise Unsupported(f"The operation {name} isn't supported by the grader.")
        ops.append(_op(g, wires, [_f(p) for p in op.parameters] or None))
    n = 1 + max([q for o in ops for q in o["q"]] or [-1])
    return {"n": max(n, 1), "ops": ops}


def translate(backend, code):
    ns = {"__name__": "__qniverse_solution__"}
    exec(compile(code, "<solution>", "exec"), ns)
    if backend == "qiskit":
        return from_qiskit(ns)
    if backend == "cirq":
        return from_cirq(ns)
    if backend == "pennylane":
        return from_pennylane(ns)
    raise ValueError(f"Unknown backend {backend!r}")
