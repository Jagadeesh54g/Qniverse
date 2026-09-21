from qiskit.circuit import Gate


class Oracle(Gate):
    """Black-box placeholder. The grader swaps it for the hidden oracle."""

    def __init__(self, num_qubits):
        super().__init__("oracle", int(num_qubits), [])
