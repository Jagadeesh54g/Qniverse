'use client';

import { useState } from 'react';
import Link from 'next/link';
import QniverseLogo from './QniverseLogo';

export default function SignInForm() {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [state, setState] = useState({ loading: false, message: '', error: false });

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, message: '', error: false });
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, ...form }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      if (!result.user.onboardingComplete) {
        window.location.assign('/onboarding');
      } else {
        window.location.assign('/learn');
      }
    } catch (error) {
      setState({ loading: false, message: error.message || 'Something went wrong.', error: true });
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-signal auth-signal-one" />
      <div className="auth-signal auth-signal-two" />
      <div className="auth-grid" />
      <Link href="/" className="auth-logo"><QniverseLogo /></Link>
      <div className="auth-layout">
        <section className="auth-intro">
          <div className="auth-kicker"><span /> YOUR NEXT STATE</div>
          <h1>{mode === 'signup' ? <>Start your<br /><em>quantum journey.</em></> : <>Return to the<br /><em>superposition.</em></>}</h1>
          <p>{mode === 'signup' ? 'Create your space, then let Qniverse calibrate a learning route around what you already know.' : 'Your circuits, challenges and quantum intuition are waiting in the lab.'}</p>
          <div className="auth-equation" aria-hidden="true"><span>|ψ⟩</span><i>→</i><b>U</b><i>→</i><span>measure()</span></div>
          <div className="auth-status"><span className="status-dot" /> QNIVERSE SYSTEMS <b>SECURE</b></div>
        </section>

        <section className="auth-card" aria-label={mode === 'signin' ? 'Sign in' : 'Create account'}>
          <div className="auth-card-head"><span className="eyebrow">ACCESS / 01</span><span className="auth-lock">⌁ SECURE ENTRY</span></div>
          <h2>{mode === 'signin' ? 'Welcome back.' : 'Create your space.'}</h2>
          <p className="auth-subtitle">{mode === 'signin' ? 'Pick up exactly where your curiosity left off.' : 'After signup, a short Quantum Compass will build your starting route.'}</p>

          <div className="auth-divider"><span>{mode === 'signin' ? 'sign in with your email' : 'create with your email'}</span></div>

          <form onSubmit={submit}>
            {mode === 'signup' && <label>Name<input name="name" value={form.name} onChange={update} placeholder="How should we call you?" autoComplete="name" required /></label>}
            <label>Email<input name="email" type="email" value={form.email} onChange={update} placeholder="you@domain.com" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" value={form.password} onChange={update} placeholder="8+ characters" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength="8" required /></label>
            <button className="auth-submit" type="submit" disabled={state.loading}>{state.loading ? (mode === 'signup' ? 'Creating your space...' : 'Opening your state...') : mode === 'signin' ? 'Enter Qniverse' : 'Create account'} <span>→</span></button>
          </form>
          {state.message && <p className={`auth-message ${state.error ? 'is-error' : ''}`} role="status">{state.message}</p>}
          <p className="auth-switch">{mode === 'signin' ? 'New to Qniverse?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setState({ loading: false, message: '', error: false }); }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
          <small className="auth-terms">Your learning profile is stored with your Qniverse account so recommendations can improve over time.</small>
        </section>
      </div>
    </main>
  );
}
