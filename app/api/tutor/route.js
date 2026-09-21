import { getAuthUser } from '@/lib/auth';

const DEPTH_STYLE = {
  simple:
    'Explain at a complete-beginner level. Use simple language, intuition and everyday analogies. Avoid heavy mathematics unless requested.',

  university:
    'Explain at undergraduate quantum-computing level. Use Dirac notation, matrices and equations when useful. Show important reasoning steps.',

  advanced:
    'Explain at graduate level. Be mathematically precise. Discuss unitarity, statevectors, tensor products, density matrices and quantum algorithms when relevant.',

  research:
    'Explain at research level. Be rigorous about assumptions, algorithms, complexity, noise, error models and relevant theoretical details.',
};

function lessonSystemPrompt(ctx) {
  const depth =
    DEPTH_STYLE[ctx?.depth] ||
    DEPTH_STYLE.university;

  return [
    'You are Bujji, the AI quantum-computing tutor inside Qniverse.',
    'Your job is to help learners understand quantum computing rather than simply give answers.',
    `The learner is currently studying: ${ctx?.topic || 'quantum computing'}.`,
    `Current level: ${ctx?.level || 'Foundation'}.`,
    ctx?.formula
      ? `Important formula: ${ctx.formula}`
      : '',
    ctx?.summary
      ? `Lesson summary: ${ctx.summary}`
      : '',
    ctx?.misconception
      ? `Common misconception to address: ${ctx.misconception}`
      : '',
    depth,
    'Explain intuition first and mathematics second.',
    'Use small quantum circuits when appropriate.',
    'Encourage the learner to predict the result before running a circuit.',
    'Do not invent simulation results.',
    'Stay focused on the current topic unless the learner explicitly changes topics.',
    'Be rigorous, friendly and concise.',
  ]
    .filter(Boolean)
    .join('\n');
}

function generalSystemPrompt(context) {
  return [
    'You are Bujji, the AI quantum-computing tutor inside Qniverse.',
    'Qniverse is an interactive quantum learning laboratory.',
    'Teach quantum computing using intuition, mathematics, circuits and experiments.',
    'Prefer explanation over simply giving the final answer.',
    'When useful, suggest a circuit the learner can build in the Qniverse Lab.',
    'Encourage prediction before execution.',
    'Never claim that a circuit was simulated unless simulation results are explicitly provided.',
    context?.topic
      ? `Current topic: ${context.topic}`
      : '',
    context?.level
      ? `Learner level: ${context.level}`
      : '',
    context?.depth
      ? DEPTH_STYLE[context.depth] || ''
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function offlineAnswer(question, context, kind) {
  const q = String(question || '').toLowerCase();

  if (q.includes('superposition')) {
    return `A qubit in superposition can be written as

|ψ⟩ = α|0⟩ + β|1⟩

where |α|² + |β|² = 1.

Try this in the Qniverse Lab:

|0⟩ → H → Measure

You should observe approximately 50% |0⟩ and 50% |1⟩ over many shots.`;
  }

  if (
    q.includes('entangle') ||
    q.includes('entanglement')
  ) {
    return `Try:

q0: |0⟩ ── H ── ● ──
                 │
q1: |0⟩ ─────── X ──

The H gate creates superposition and the CNOT correlates the two qubits.

The resulting Bell state is:

(|00⟩ + |11⟩)/√2`;
  }

  if (
    q.includes('h²') ||
    q.includes('h2') ||
    q.includes('hadamard twice')
  ) {
    return `Hadamard is self-inverse:

H² = I

So applying H twice returns the qubit to its original computational-basis state.`;
  }

  if (kind === 'lesson' && context?.summary) {
    return `Bujji is currently running in local fallback mode.

Current lesson:
${context.topic || 'Quantum Computing'}

${context.summary}`;
  }

  return `Bujji is currently running without the Qwen server.

Try asking about:
• Superposition
• Measurement
• Hadamard
• Entanglement
• Quantum gates
• Bloch sphere
• Quantum circuits`;
}

async function callQwen(messages) {
  const baseUrl =
    process.env.QWEN_BASE_URL ||
    'http://localhost:11434';

  const model =
    process.env.QWEN_MODEL ||
    'qwen2.5:7b';

  const url =
    `${baseUrl.replace(/\/$/, '')}/api/chat`;

  const headers = {
    'Content-Type': 'application/json',
  };

  // Optional authentication for a hosted Ollama server.
  if (process.env.QWEN_API_KEY) {
    headers.Authorization =
      `Bearer ${process.env.QWEN_API_KEY}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.2,
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Qwen server returned ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  return (
    data?.message?.content ||
    data?.response ||
    ''
  );
}

export async function POST(request) {
  const user = await getAuthUser();

  if (!user) {
    return Response.json(
      {
        answer: 'Please sign in to use Bujji.',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const question =
      String(body.question || '').trim();

    const context =
      body.context || {};

    const kind =
      body.kind || 'general';

    if (!question) {
      return Response.json(
        {
          answer:
            'Ask Bujji a quantum-computing question.',
        },
        { status: 400 }
      );
    }

    const system =
      kind === 'lesson'
        ? lessonSystemPrompt(context)
        : generalSystemPrompt(context);

    const messages = [
      {
        role: 'system',
        content: system,
      },
      {
        role: 'user',
        content:
          `Question: ${question}\n\n` +
          `Current Qniverse context:\n` +
          JSON.stringify(context, null, 2),
      },
    ];

    try {
      const answer =
        await callQwen(messages);

      if (!answer.trim()) {
        throw new Error(
          'Qwen returned an empty response.'
        );
      }

      return Response.json({
        answer,
        provider: 'qwen',
        model:
          process.env.QWEN_MODEL ||
          'qwen2.5:7b',
      });
    } catch (qwenError) {
      console.error(
        '[Qniverse Bujji / Qwen]',
        qwenError
      );

      // Keep Bujji usable even when the model server
      // is unavailable.
      return Response.json({
        answer: offlineAnswer(
          question,
          context,
          kind
        ),
        provider: 'offline-fallback',
        model:
          process.env.QWEN_MODEL ||
          'qwen2.5:7b',
      });
    }
  } catch (error) {
    console.error(
      '[Qniverse Bujji]',
      error
    );

    return Response.json(
      {
        answer:
          'Bujji encountered an unexpected error. Please try again.',
      },
      { status: 200 }
    );
  }
}