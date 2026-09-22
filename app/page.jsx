import Link from 'next/link';
import QuantumHero from '@/components/QuantumHero';
import Logo from '@/components/Logo';

const features = [
  [
    '01',
    'Learn by doing',
    'Every concept moves from intuition to mathematics to an experiment you can actually run.',
  ],
  [
    '02',
    'See the state',
    'Measurement distributions, amplitudes and Bloch-sphere views turn invisible quantum behaviour into visual feedback.',
  ],
  [
    '03',
    'Build circuits',
    'Compose quantum gates, inspect their matrices and run experiments inside the Quantum Lab.',
  ],
  [
    '04',
    'Think with Bujji',
    'Your AI tutor explains the concept, circuit and result in the context of what you are currently learning.',
  ],
  [
    '05',
    'Master algorithms',
    'Move from foundations into Bell states, Deutsch–Jozsa, Grover, teleportation and superdense coding.',
  ],
  [
    '06',
    'Learn with others',
    'Ask questions, discuss circuits and learn from other students through the Qniverse Community.',
  ],
];

const journey = [
  ['01', 'LEARN', 'Understand the idea before touching the circuit.'],
  ['02', 'PREDICT', 'Make a prediction about the quantum state or measurement.'],
  ['03', 'BUILD', 'Construct the circuit using real quantum gates.'],
  ['04', 'RUN', 'Execute the experiment with configurable shots.'],
  ['05', 'VISUALIZE', 'Inspect probabilities, statevectors and quantum behaviour.'],
  ['06', 'UNDERSTAND', 'Ask Bujji why the result happened.'],
];

export default function Home() {
  return (
    <>
      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="hero">
        <QuantumHero />

        <div className="hero-copy">

          <div className="hero-kicker">
            <span className="kicker-line" />
            QUANTUM LEARNING, REIMAGINED
          </div>

          <h1>
            Make the invisible
            <br />
            <em>visible.</em>
          </h1>

          <p>
            Qniverse is an interactive quantum
            computing environment where concepts
            become circuits, circuits become
            experiments and experiments become
            intuition.
          </p>

          <div className="hero-buttons">

            <Link
              href="/learn"
              className="primary-btn"
            >
              Start learning
              <span>→</span>
            </Link>

            <Link
              href="/playground"
              className="ghost-btn"
            >
              Open Quantum Lab
              <span>↗</span>
            </Link>

          </div>

          <div className="hero-proof">
            <span>
              <b>14</b> lessons
            </span>

            <span>
              <b>5</b> algorithms
            </span>

            <span>
              <b>∞</b> experiments
            </span>

            <span>
              <b>1</b> learning community
            </span>
          </div>

        </div>

        <div className="hero-orbit-label">
          <Logo compact />

          <span>
            Qniverse Lab
            <br />
            <b>SIMULATOR ONLINE</b>
          </span>
        </div>

      </section>


      {/* =====================================================
          MARQUEE
          ===================================================== */}

      <section className="marquee">
        <div>
          LEARN · PREDICT · BUILD · RUN · VISUALIZE · ASK ·
          UNDERSTAND · DISCUSS · CHALLENGE · MASTER ·
          LEARN · PREDICT · BUILD · RUN · VISUALIZE · ASK ·
          UNDERSTAND · DISCUSS · CHALLENGE · MASTER
        </div>
      </section>


      {/* =====================================================
          WHY QNIVERSE
          ===================================================== */}

      <section className="section intro container">

        <div className="section-index">
          01 / WHY QNIVERSE
        </div>

        <div>

          <h2>
            Quantum computing shouldn't
            <br />
            <span>
              feel like a wall of notation.
            </span>
          </h2>

          <p>
            Most learners encounter quantum computing
            as disconnected pieces: mathematics,
            circuits, algorithms, simulators and
            documentation. Qniverse connects those
            pieces into one continuous learning
            experience.
          </p>

          <p>
            Every concept can move from intuition to
            mathematics, from mathematics to a circuit,
            from a circuit to an experiment and from
            an experiment to an explanation.
          </p>

        </div>

      </section>


      {/* =====================================================
          FEATURE GRID
          ===================================================== */}

      <section className="feature-grid container">

        {features.map(
          ([number, title, description]) => (
            <article
              className="feature-card"
              key={number}
            >

              <span>{number}</span>

              <h3>{title}</h3>

              <p>{description}</p>

              <i>↗</i>

            </article>
          )
        )}

      </section>


      {/* =====================================================
          LEARNING LOOP
          ===================================================== */}

      <section className="section container">

        <div className="section-head">

          <div>
            <div className="section-index">
              02 / THE QNIVERSE METHOD
            </div>

            <h2>
              Don't just read.
              <br />
              <em>Run the idea.</em>
            </h2>
          </div>

          <p>
            Qniverse is designed around an experiment
            loop. The learner makes a prediction,
            builds a circuit, runs it and then explains
            the result.
          </p>

        </div>

        <div className="journey-grid">

          {journey.map(
            ([number, title, description]) => (
              <article
                className="journey-step"
                key={number}
              >

                <span>{number}</span>

                <b>{title}</b>

                <p>{description}</p>

              </article>
            )
          )}

        </div>

      </section>


      {/* =====================================================
          QUANTUM LAB
          ===================================================== */}

      <section className="lab-preview container">

        <div className="preview-copy">

          <div className="section-index">
            03 / THE QUANTUM LAB
          </div>

          <h2>
            A lab that answers
            <br />
            <em>“why?”</em>
          </h2>

          <p>
            Build a circuit and the interface responds
            immediately. Inspect gate matrices, state
            amplitudes, probabilities and Bloch-sphere
            behaviour instead of treating the simulator
            as a black box.
          </p>

          <div className="lab-points">

            <span>
              ✓ Gate matrix explorer
            </span>

            <span>
              ✓ Parameterized rotations
            </span>

            <span>
              ✓ Shot-based simulation
            </span>

            <span>
              ✓ Statevector inspection
            </span>

            <span>
              ✓ Probability visualization
            </span>

            <span>
              ✓ Bujji circuit explanation
            </span>

          </div>

          <Link
            href="/playground"
            className="text-link"
          >
            Enter the Quantum Lab →
          </Link>

        </div>

        <div className="mini-circuit">

          <div className="mini-header">
            <span>LIVE CIRCUIT</span>

            <span className="live-pill">
              <i />
              RUNNING
            </span>
          </div>

          <div className="mini-wire">
            <b>q0</b>
            <span>──</span>
            <strong>H</strong>
            <span>──</span>
            <strong>●</strong>
            <span>──</span>
            <strong>M</strong>
          </div>

          <div className="mini-wire">
            <b>q1</b>
            <span>────────</span>
            <strong>⊕</strong>
            <span>──</span>
            <strong>M</strong>
          </div>

          <div className="mini-results">

            <div>
              <small>00</small>
              <b>50.1%</b>
            </div>

            <div>
              <small>01</small>
              <b>0.0%</b>
            </div>

            <div>
              <small>10</small>
              <b>0.0%</b>
            </div>

            <div>
              <small>11</small>
              <b>49.9%</b>
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          BUJJI
          ===================================================== */}

      <section className="bujji-section container">

        <div>

          <div className="section-index">
            04 / MEET BUJJI
          </div>

          <h2>
            Your quantum
            <br />
            <em>thinking partner.</em>
          </h2>

          <p>
            Bujji is not designed to replace the learning
            process. It is designed to stay inside it.
          </p>

          <p>
            Ask why a gate changed the state. Ask for a
            mathematical explanation. Ask for an analogy.
            Give Bujji your circuit and let it help you
            reason about the result.
          </p>

          <div className="bujji-actions">
            <span>Explain simply</span>
            <span>Show mathematics</span>
            <span>Visualize</span>
            <span>Quiz me</span>
            <span>Give a challenge</span>
            <span>Go deeper</span>
          </div>

        </div>

        <div className="bujji-panel">

          <div className="bujji-head">
            <i className="bujji-dot" />
            BUJJI
            <small>CONTEXT AWARE</small>
          </div>

          <div className="bujji-line" />

          <p>
            <b>
              “Why does applying H twice return
              the qubit to its original state?”
            </b>
          </p>

          <p>
            Because the Hadamard gate is its own
            inverse:
          </p>

          <div className="formula">
            H · H = I
          </div>

          <p>
            Try placing two H gates in the Lab and
            run the experiment. Your prediction
            should be:
          </p>

          <span className="bujji-prompt">
            |0⟩ → H → |+⟩ → H → |0⟩
          </span>

        </div>

      </section>


      {/* =====================================================
          COMMUNITY
          ===================================================== */}

      <section className="community-preview container">

        <div>

          <div className="section-index">
            05 / STUDENT COMMUNITY
          </div>

          <h2>
            Quantum is difficult.
            <br />
            <em>Don't learn it alone.</em>
          </h2>

          <p>
            Ask other students about a confusing
            equation, compare circuit approaches,
            discuss algorithms or help someone
            understand why their experiment produced
            an unexpected result.
          </p>

          <Link
            href="/community"
            className="text-link"
          >
            Enter the Community →
          </Link>

        </div>

        <div className="community-cards">

          <div>
            <span>QUESTION</span>
            <b>
              Why does CNOT create entanglement
              after H?
            </b>
            <small>
              8 replies · Quantum Foundations
            </small>
          </div>

          <div>
            <span>DISCUSSION</span>
            <b>
              How should I visualize phase on
              the Bloch sphere?
            </b>
            <small>
              5 replies · Quantum Foundations
            </small>
          </div>

          <div>
            <span>CHALLENGE</span>
            <b>
              I built Grover but my probability
              distribution looks wrong.
            </b>
            <small>
              12 replies · Algorithms
            </small>
          </div>

        </div>

      </section>


      {/* =====================================================
          PLATFORM STATS
          ===================================================== */}

      <section className="impact-strip">

        <div>
          <b>Interactive theory</b>
          <span>
            Beginner → advanced quantum concepts
          </span>
        </div>

        <div>
          <b>Quantum Lab</b>
          <span>
            Build, simulate and inspect circuits
          </span>
        </div>

        <div>
          <b>Bujji</b>
          <span>
            Context-aware quantum tutoring
          </span>
        </div>

        <div>
          <b>Community</b>
          <span>
            Students learning from students
          </span>
        </div>

      </section>


      {/* =====================================================
          FINAL CTA
          ===================================================== */}

      <section className="final-cta">

        <div>

          <div className="section-index">
            06 / BEGIN
          </div>

          <h2>
            Stop reading about
            <br />
            <em>quantum.</em>
            <br />
            Start running it.
          </h2>

          <div className="final-actions">

            <Link
              href="/learn"
              className="primary-btn"
            >
              Enter Qniverse →
            </Link>

            <Link
              href="/community"
              className="ghost-btn"
            >
              Meet the Community
            </Link>

          </div>

        </div>

      </section>
    </>
  );
}