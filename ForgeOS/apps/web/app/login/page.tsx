'use client';
import './login.css';
import { useState } from 'react';
export default function Login() {
  const [password, setPassword] = useState(''); const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!response.ok) { setError(response.status === 503 ? 'ForgeOS login is not configured.' : 'Incorrect password.'); return; }
    const next = new URLSearchParams(window.location.search).get('next') || '/'; window.location.assign(next.startsWith('/') && !next.startsWith('//') ? next : '/');
  }
  return <main className="login-page"><form onSubmit={event => void submit(event)}><div className="brand"><span>F</span> ForgeOS</div><h1>Sign in</h1><p>Use the administrator password configured for this installation.</p><input autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Administrator password" /><button className="primary" type="submit">Continue</button>{error && <div role="alert">{error}</div>}</form></main>;
}
