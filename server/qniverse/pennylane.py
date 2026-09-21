import pennylane as qml


class Oracle(qml.operation.Operation):
    """Black-box placeholder. Use Oracle(wires=[0, 1, ...]) inside circuit()."""

    # AnyWires was removed in recent PennyLane; None means "any number" there.
    num_wires = getattr(qml.operation, "AnyWires", None)

    def __init__(self, wires):
        super().__init__(wires=wires)
