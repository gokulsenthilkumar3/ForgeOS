'use client';

import './login.css';
import { useEffect, useState, type FormEvent } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

type SetupState = 'loading' | 'setup' | 'signin' | 'unavailable';

function destination() {
  const next = new URLSearchParams(window.location.search).get('next') || '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

async function message(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
  return body.error || body.message || `Request failed (${response.status})`;
}

export default function Login() {
  const [setupState, setSetupState] = useState<SetupState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/auth/setup', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(await message(response));
        const result = await response.json() as { ownerRequired: boolean };
        setSetupState(result.ownerRequired ? 'setup' : 'signin');
      })
      .catch(cause => { setSetupState('unavailable'); setError(cause instanceof Error ? cause.message : 'Authentication service unavailable'); });
  }, []);

  async function signInWithKey() {
    if (!email.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const optionsResponse = await fetch('/api/v1/auth/webauthn/authenticate/options', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
      });
      if (!optionsResponse.ok) throw new Error(await message(optionsResponse));
      const { challengeId, options } = await optionsResponse.json();
      const response = await startAuthentication({ optionsJSON: options });
      const session = await fetch('/api/session', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'webauthn', challengeId, response }),
      });
      if (!session.ok) throw new Error(await message(session));
      window.location.assign(destination());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Security key sign-in failed');
    } finally { setBusy(false); }
  }

  async function enrollWithPassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const session = await fetch('/api/session', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'password', email: email.trim(), password }),
      });
      if (!session.ok) throw new Error(await message(session));
      setPassword('');
      window.location.assign('/enroll-key');
    } catch (cause) {
      setPassword('');
      setError(cause instanceof Error ? cause.message : 'Enrollment sign-in failed');
    } finally { setBusy(false); }
  }

  async function createOwner(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const setup = await fetch('/api/v1/auth/setup', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, bootstrapPassword }),
      });
      if (!setup.ok) throw new Error(await message(setup));
      const session = await fetch('/api/session', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'password', email: email.trim(), password }),
      });
      if (!session.ok) throw new Error(await message(session));
      setPassword(''); setBootstrapPassword('');
      window.location.assign('/enroll-key');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Owner setup failed');
    } finally { setBusy(false); }
  }

  return <main className="login-page"><section className="login-panel" aria-labelledby="login-title">
    <div className="brand"><span>F</span> ForgeOS</div>
    {setupState === 'loading' && <><h1 id="login-title">Checking sign-in</h1><p>Connecting to your ForgeOS installation…</p></>}
    {setupState === 'unavailable' && <><h1 id="login-title">Sign-in unavailable</h1><p>Check the ForgeOS API and try again.</p><button className="button-primary" onClick={() => window.location.reload()}>Retry</button></>}
    {setupState === 'setup' && <form onSubmit={event => void createOwner(event)}>
      <h1 id="login-title">Set up ForgeOS</h1>
      <p>Create the first owner account. You will enroll physical security keys before using the workspace.</p>
      <label>Email<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>New account password<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <label>Installation bootstrap password<input type="password" autoComplete="off" value={bootstrapPassword} onChange={event => setBootstrapPassword(event.target.value)} required /></label>
      <button className="button-primary" disabled={busy} type="submit">{busy ? 'Creating owner…' : 'Create owner and enroll keys'}</button>
    </form>}
    {setupState === 'signin' && <form onSubmit={event => { event.preventDefault(); void signInWithKey(); }}>
      <h1 id="login-title">Sign in with a security key</h1>
      <p>ForgeOS requires an enrolled physical key and its PIN or biometric check. A math challenge or password alone cannot open the workspace.</p>
      <label>Email<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <button className="button-primary" disabled={busy} type="submit">{busy ? 'Waiting for key…' : 'Use security key'}</button>
      <button className="login-secondary" type="button" onClick={() => { setEnrolling(!enrolling); setError(''); }}>
        {enrolling ? 'Hide enrollment' : 'Need to enroll your first key?'}
      </button>
    </form>}
    {setupState === 'signin' && enrolling && <form className="login-enrollment" onSubmit={event => void enrollWithPassword(event)}>
      <p>Existing account passwords grant enrollment access only. They do not unlock projects or modules.</p>
      <label>Account password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <button disabled={busy || !email.trim()} type="submit">Continue to key enrollment</button>
    </form>}
    {error && <div role="alert">{error}</div>}
  </section></main>;
}
