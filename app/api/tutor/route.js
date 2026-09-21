import { getAuthUser } from '@/lib/auth';

const DEPTH_STYLE = {
  simple: 'Explain at a complete-beginner level. Short sentences, everyday analogies, no matrices unless asked. Assume no physics background.',
  university: 'Explain at undergraduate level. Use Dirac notation and 2x2 matrices freely, state assumptions, and show the key algebraic steps.',
  advanced: 'Explain at graduate level. Be precise about unitarity, density matrices, partial traces and basis choices. Skip hand-holding.',
  research: 'Explain at research level. Reference the relevant theorems, complexity classes, error models and open problems. Assume full fluency.',
};

function lessonSystemPrompt(ctx) {
  const depth = DEPTH_STYLE[ctx?.depth] || DEPTH_STYLE.simple;
  return [
    'You are Bujji, the AI quantum tutor inside Qniverse.',
    `The learner is currently studying the lesson "${ctx?.topic || 'quantum computing'}" (marked ${ctx?.level || 'Foundation'} level).`,
    ctx?.formula ? `Its key expression is: ${ctx.formula}` : '',
    ctx?.summary ? `The lesson documentation says: ${ctx.summary}` : '',
    ctx?.misconception ? `A misconception to watch for: ${ctx.misconception}` : '',
    depth,
    'Stay on this topic unless the learner clearly moves on. Prefer concrete circuits the learner can build in the Qniverse Lab. Encourage prediction before execution. Be warm, rigorous and direct.',
  ].filter(Boolean).join(' ');
}

function localLessonAnswer(question, ctx) {
  const topic = ctx?.topic || 'this topic';
  const q = question.toLowerCase();
  const summary = ctx?.summary || '';
  const first = summary.split('. ').slice(0, 3).join('. ');
  if (q.includes('analogy')) return `Bujji is running offline. Here is the lesson material for ${topic}.\n\n${first}.\n\nFor a generated analogy, configure OPENAI_API_KEY on the server.`;
  if (q.includes('quiz') || q.includes('question')) return `Offline mode — use the Quick Check in the Theory tab for ${topic}. For generated quizzes, configure OPENAI_API_KEY on the server.`;
  if (q.includes('math') || q.includes('equation')) return `Key expression for ${topic}: ${ctx?.formula || 'see the Theory tab'}.\n\n${first}.`;
  return `Bujji is running offline. Here is what the ${topic} documentation covers:\n\n${first || 'Open the Theory tab for the full write-up.'}`;
}

function localTutor(question, context, kind) {
  if (kind === 'lesson') return localLessonAnswer(question, context);
  const x = question.toLowerCase();
  if (x.includes('superposition')) return 'Superposition means a qubit can be represented as α|0⟩ + β|1⟩, with |α|² + |β|² = 1. Try H on |0⟩ in the Lab and run 1,000 shots.';
  if (x.includes('entangle')) return 'Try H(q0) followed by CNOT(q0,q1). H creates the superposition; CNOT correlates the second qubit with the first. Look for 00 and 11 outcomes.';
  if (x.includes('h²') || x.includes('twice')) return 'Hadamard is its own inverse: H·H = I. Applying H twice returns a computational-basis state to itself.';
  return 'Start with one question, build the smallest circuit that tests it, run several shots, and compare the result with your prediction.';
}

export async function POST(req) {
  const user = await getAuthUser();
  if (!user) return Response.json({ answer: 'Please sign in to use Bujji.' }, { status: 401 });

  try {
    const { question, context, kind } = await req.json();
    if (!question) return Response.json({ answer: 'Ask me a quantum question.' }, { status: 400 });

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ answer: localTutor(question, context, kind) });
    }

    const system = kind === 'lesson'
      ? lessonSystemPrompt(context)
      : 'You are Bujji, a rigorous but beginner-friendly quantum computing tutor inside Qniverse. Explain intuition first, then mathematics. Never pretend a simulation result is known if it is not in context.';

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
  } catch (error) {
    console.error('[Qniverse tutor]', error);
    return Response.json({ answer: 'Bujji could not reach the model right now. The Theory and Lab remain available.', error: process.env.NODE_ENV === 'production' ? undefined : String(error.message || error) }, { status: 200 });
  }
}
