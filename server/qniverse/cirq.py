import cirq


class Oracle(cirq.Gate):
    """Black-box placeholder. Use Oracle(n).on(q[0], ..., q[n-1])."""

    def __init__(self, num_qubits):
        self._n = int(num_qubits)

    def _num_qubits_(self):
        return self._n

    def __repr__(self):
        return f"Oracle({self._n})"
