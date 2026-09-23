'use client';
import './login.css';
import { useState } from 'react';
export default function Login() {
  const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) {
        setPassword('');
        setError(response.status === 503 ? 'ForgeOS login is not configured.' : response.status === 401 ? 'That password does not match this installation. Use FORGEOS_ADMIN_PASSWORD from ForgeOS/.env, not a previous development password.' : `Sign-in failed (${response.status}). Try again.`);
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/'; window.location.assign(next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch { setError('Could not reach ForgeOS. Check the connection and try again.'); }
    finally { setSubmitting(false); }
  }
  return <main className="login-page"><form onSubmit={event => void submit(event)}><div className="brand"><span>F</span> ForgeOS</div><h1>Sign in</h1><p>Use the administrator password configured for this installation.</p><input autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Administrator password" aria-label="Administrator password" required /><button className="button-primary" disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Continue'}</button>{error && <div role="alert">{error}</div>}</form></main>;
}
