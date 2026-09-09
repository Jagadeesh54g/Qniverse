
'use client';

import { useEffect, useState } from 'react';

export default function TutorPanel() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'I’m your quantum lab partner. Ask me why a circuit behaves the way it does.',
    },
  ]);

  useEffect(() => {
    const handleTutorEvent = (event) => {
      if (event.detail?.open) setOpen(true);
    };

    window.addEventListener('qniverse:tutor', handleTutorEvent);
    return () => window.removeEventListener('qniverse:tutor', handleTutorEvent);
  }, []);

  async function ask() {
    const question = q.trim();
    if (!question || loading) return;

    setQ('');
    setMessages((current) => [...current, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const circuit =
        typeof window !== 'undefined'
          ? localStorage.getItem('qniverse-circuit')
          : null;

      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: {
            product: 'Qniverse',
            circuit: circuit || 'No circuit is currently loaded.',
          },
        }),
      });

      if (!response.ok) throw new Error('Tutor API request failed');

      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          role: 'ai',
          text: data.answer || 'I could not generate an answer right now.',
        },
      ]);
    } catch (error) {
      console.error('Qniverse Tutor Error:', error);
      setMessages((current) => [
        ...current,
        {
          role: 'ai',
          text: 'The AI tutor is not connected yet. Add OPENAI_API_KEY to .env.local, or use the built-in Qniverse explanations.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          className="floating-tutor"
          onClick={() => setOpen(true)}
          aria-label="Open Qniverse AI Tutor"
        >
          ✦ Ask Qniverse
        </button>
      )}

      {open && (
        <aside className="tutor-drawer" aria-label="Qniverse AI Quantum Tutor">
          <div className="tutor-head">
            <div>
              <span className="eyebrow">AI QUANTUM TUTOR</span>
              <h3>Think with the circuit.</h3>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close tutor">
              ×
            </button>
          </div>

          <div className="tutor-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`tutor-msg ${message.role}`}>
                {message.text}
              </div>
            ))}

            {loading && (
              <div className="tutor-msg ai typing">
                Thinking<span>.</span><span>.</span><span>.</span>
              </div>
            )}
          </div>

          <div className="suggestions">
            {[
              'Explain superposition simply',
              'Why does H twice return the state?',
              'How do I create entanglement?',
            ].map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setQ(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>

          <div className="tutor-input">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask();
                }
              }}
              placeholder="Ask a quantum question…"
              disabled={loading}
            />
            <button type="button" onClick={ask} disabled={loading || !q.trim()}>
              {loading ? '…' : 'Send'}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
