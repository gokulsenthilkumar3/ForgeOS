'use client';

import { useEffect, useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import '../login/login.css';

type Credential = { id: string; label: string; createdAt: string; lastUsedAt?: string | null };

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
  return body.error || body.message || `Request failed (${response.status})`;
}

export default function EnrollKey() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [label, setLabel] = useState('');
  const [migrationPassword, setMigrationPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function refresh() {
    const keys = await fetch('/api/v1/auth/webauthn/credentials', { cache: 'no-store' });
    if (!keys.ok) throw new Error(await errorMessage(keys));
    const data = await keys.json() as { credentials: Credential[]; count: number };
    setCredentials(data.credentials);
  }

  useEffect(() => { void refresh().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not load keys')).finally(() => setLoading(false)); }, []);

  async function addKey() {
    if (!label.trim() || busy) return;
    setBusy(true); setError(''); setStatus('');
    try {
      let approvalId: string | undefined;
      if (credentials.length > 0) {
        const stepOptionsResponse = await fetch('/api/v1/auth/webauthn/step-up/options', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ workspaceId: null, action: 'webauthn.enroll' }),
        });
        if (!stepOptionsResponse.ok) throw new Error(await errorMessage(stepOptionsResponse));
        const stepOptions = await stepOptionsResponse.json();
        const stepResponse = await startAuthentication({ optionsJSON: stepOptions.options });
        const stepVerify = await fetch('/api/v1/auth/webauthn/step-up/verify', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ challengeId: stepOptions.challengeId, response: stepResponse }),
        });
        if (!stepVerify.ok) throw new Error(await errorMessage(stepVerify));
        approvalId = (await stepVerify.json()).approvalId;
      }
      const optionsResponse = await fetch('/api/v1/auth/webauthn/register/options', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), ...(credentials.length === 0 ? { migrationPassword } : {}) }),
      });
      if (!optionsResponse.ok) throw new Error(await errorMessage(optionsResponse));
      const options = await optionsResponse.json();
      const response = await startRegistration({ optionsJSON: options.options });
      const verify = await fetch('/api/v1/auth/webauthn/register/verify', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId: options.challengeId, response, approvalId }),
      });
      if (!verify.ok) throw new Error(await errorMessage(verify));
      setLabel(''); setMigrationPassword('');
      await refresh();
      setStatus('Security key registered. Keep the recovery key in a separate safe place.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not register the key');
    } finally { setBusy(false); }
  }

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    window.location.assign('/login');
  }

  return <main className="login-page"><section className="login-panel" aria-labelledby="enroll-title">
    <div className="brand"><span>F</span> ForgeOS</div>
    <h1 id="enroll-title">Enroll physical security keys</h1>
    <p>Register a primary key and a separate recovery key. Both must require a physical gesture and PIN or biometric verification. Password access is limited to this enrollment process.</p>
    {loading ? <p role="status">Loading enrolled keys…</p> : <>
      <p role="status"><strong>{credentials.length} of 2 keys</strong> registered for minimum recovery.</p>
      {credentials.length > 0 && <ul className="enrolled-keys">{credentials.map(key => <li key={key.id}>
        <strong>{key.label}</strong><small>Added {new Date(key.createdAt).toLocaleDateString()}</small>
      </li>)}</ul>}
      <label>Key label<input value={label} onChange={event => setLabel(event.target.value)} maxLength={80} placeholder={credentials.length ? 'Recovery key' : 'Primary key'} /></label>
      {credentials.length === 0 && <label>Confirm account password<input type="password" autoComplete="current-password" value={migrationPassword} onChange={event => setMigrationPassword(event.target.value)} required /></label>}
      <button className="button-primary" type="button" disabled={busy || !label.trim() || (credentials.length === 0 && !migrationPassword)} onClick={() => void addKey()}>
        {busy ? 'Waiting for key…' : 'Register security key'}
      </button>
      <p className="enroll-note">If you already registered one key using password access, sign out and use that key to approve enrollment of the recovery key.</p>
      <button className="login-secondary" type="button" onClick={() => void signOut()}>
        {credentials.length >= 2 ? 'Sign out and enter with a security key' : 'Sign out'}
      </button>
    </>}
    {status && <p role="status">{status}</p>}
    {error && <div role="alert">{error}</div>}
  </section></main>;
}
