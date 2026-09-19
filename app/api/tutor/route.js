const DEPTH_STYLE = {
  simple:
    'Explain at a complete-beginner level. Short sentences, everyday analogies, no matrices unless asked. Assume no physics background.',
  university:
    'Explain at undergraduate level. Use Dirac notation and 2x2 matrices freely, state assumptions, and show the key algebraic steps.',
  advanced:
    'Explain at graduate level. Be precise about unitarity, density matrices, partial traces and basis choices. Skip hand-holding.',
  research:
    'Explain at research level. Reference the relevant theorems, complexity classes, error models and open problems. Assume full fluency.',
};

function lessonSystemPrompt(ctx) {
  const depth = DEPTH_STYLE[ctx?.depth] || DEPTH_STYLE.simple;
  return [
    'You are Bujji, the AI quantum tutor inside Qniverse.',
    `The learner is currently studying the lesson "${ctx?.topic || 'quantum computing'}" (marked ${ctx?.level || 'Foundation'} level).`,
    ctx?.formula ? `Its key expression is: ${ctx.formula}` : '',
    ctx?.summary ? `The lesson's own documentation says: ${ctx.summary}` : '',
    ctx?.misconception ? `A misconception to watch for: ${ctx.misconception}` : '',
    depth,
    'Stay on this topic unless the learner clearly moves on. Prefer concrete circuits the learner can build in the Qniverse Lab (gates available: H, X, Y, Z, S, T, Rx, Ry, Rz, CNOT, CZ, SWAP, measurement). Encourage them to predict an outcome before running it. Be warm and direct; never pad the answer.',
  ]
    .filter(Boolean)
    .join(' ');
}

function localLessonAnswer(question, ctx) {
  const topic = ctx?.topic || 'this topic';
  const q = question.toLowerCase();
  const summary = ctx?.summary || '';
  const first = summary.split('. ').slice(0, 3).join('. ');

  if (q.includes('analogy')) {
    return `Bujji is running offline (no OPENAI_API_KEY set), so here is the lesson's own material for ${topic}.\n\n${first}.\n\nFor a live analogy tailored to you, add an OpenAI API key to .env.local.`;
  }
  if (q.includes('quiz') || q.includes('question')) {
    return `Offline mode — try the Quick Check in the Theory tab for ${topic}. It has a graded question with a worked explanation.\n\nFor generated quizzes, add an OPENAI_API_KEY to .env.local.`;
  }
  if (q.includes('math') || q.includes('equation')) {
    return `Key expression for ${topic}: ${ctx?.formula || 'see the Theory tab'}.\n\n${first}.\n\nFull step-by-step derivations need a live model — add an OPENAI_API_KEY to .env.local.`;
  }
  return `Bujji is running offline (no OPENAI_API_KEY set). Here is what the ${topic} documentation covers:\n\n${first || 'Open the Theory tab for the full write-up.'}\n\n${ctx?.misconception ? `Common misconception to avoid — ${ctx.misconception}` : ''}`.trim();
}

function localTutor(question, context, kind) {
  if (kind === 'lesson') return localLessonAnswer(question, context);
  const x = question.toLowerCase();
  if (x.includes('superposition'))
    return 'Superposition means a qubit can be represented as \u03b1|0\u27e9 + \u03b2|1\u27e9, with |\u03b1|\u00b2 + |\u03b2|\u00b2 = 1. The Hadamard gate turns |0\u27e9 into an equal-amplitude superposition. Try H in the Lab and run 1,000 shots.';
  if (x.includes('entangle'))
    return 'A simple Bell-state experiment is H(q0) followed by CNOT(q0,q1). H creates the superposition; CNOT correlates the second qubit with the first. Try it and look for 00 and 11 outcomes.';
  if (x.includes('h\u00b2') || x.includes('twice'))
    return 'Hadamard is its own inverse: H\u00b7H = I. Applying H twice returns each computational-basis state to itself. Verify it experimentally with two H gates on q0.';
  return 'Start with one question, build the smallest circuit that tests it, run several shots, and compare the result with your prediction. That experiment is often the fastest route to intuition.';
}

export async function POST(req) {
  try {
    const { question, context, kind } = await req.json();
    if (!question) return Response.json({ answer: 'Ask me a quantum question.' }, { status: 400 });

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ answer: localTutor(question, context, kind) });
    }

    const system =
      kind === 'lesson'
        ? lessonSystemPrompt(context)
        : 'You are Bujji, a rigorous but beginner-friendly quantum computing tutor inside Qniverse. Explain intuition first, then mathematics. Never pretend a simulation result is known if it is not in context. When circuit context is supplied, reason from it. Encourage experimentation rather than simply giving answers.';

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Question: ${question}\nContext: ${JSON.stringify(context || {})}` },
        ],
      }),
    });

    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || 'OpenAI request failed');
    return Response.json({ answer: j.choices?.[0]?.message?.content || 'No answer returned.' });
  } catch (e) {
    return Response.json(
      {
        answer:
          'Bujji could not reach the model right now. Check your API key/model configuration — the Theory tab and the Lab still work offline.',
        error: String(e.message || e),
      },
      { status: 200 }
    );
  }
}
