'use client';

import './login.css';
import { useEffect, useRef, useState, type FormEvent } from 'react';
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
  const [authMode, setAuthMode] = useState<'password' | 'security-key'>('security-key');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/v1/auth/setup', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(await message(response));
        const result = await response.json() as { ownerRequired: boolean; authenticationMode?: string };
        setAuthMode(result.authenticationMode === 'password' ? 'password' : 'security-key');
        setSetupState(result.ownerRequired ? 'setup' : 'signin');
      })
      .catch(cause => { setSetupState('unavailable'); setError(cause instanceof Error ? cause.message : 'Authentication service unavailable'); });
  }, []);

  useEffect(() => {
    if (recoveryOpen) document.getElementById('access-recovery')?.focus();
  }, [recoveryOpen]);

  function validateSignIn(requirePassword: boolean) {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (requirePassword && !password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (errors.email) emailInput.current?.focus();
    else if (errors.password) passwordInput.current?.focus();
    return Object.keys(errors).length === 0;
  }

  async function signInWithKey() {
    if (busy || !validateSignIn(false)) return;
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
    if (busy || !validateSignIn(true)) return;
    setBusy(true); setError('');
    try {
      const session = await fetch('/api/session', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'password', email: email.trim(), password }),
      });
      if (!session.ok) throw new Error(await message(session));
      setPassword('');
      window.location.assign(authMode === 'password' ? destination() : '/enroll-key');
    } catch (cause) {
      setPassword('');
      setError(cause instanceof Error ? cause.message : 'Sign-in failed');
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
      window.location.assign(authMode === 'password' ? destination() : '/enroll-key');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Owner setup failed');
    } finally { setBusy(false); }
  }

  return <main className="login-page login-focus">
    <header className="signin-header"><a className="signin-brand" href="/login"><span>F</span>ForgeOS</a><nav aria-label="Sign-in help"><button type="button" onClick={() => setRecoveryOpen(!recoveryOpen)} aria-expanded={recoveryOpen} aria-controls="access-recovery">Need help?</button><a href="/design/PRODUCT-CATALOG.md" target="_blank" rel="noopener noreferrer">Docs <span aria-hidden="true">↗</span></a></nav></header>
    <div className="signin-layout"><aside className="signin-story" aria-label="About ForgeOS"><span className="signin-eyebrow">ENGINEERING WORKBENCH</span><h2>From your next idea<br />to your next change.</h2><p>Draft, inspect, and apply changes with the evidence close at hand.</p><ol className="signin-workflow" aria-label="How ForgeOS works">{[
      ['workspace','Choose your workspace'],['tool','Open a focused tool'],['inspect','Inspect the evidence'],['apply','Apply your decision'],
    ].map(([icon,label],index) => <li key={icon}><span className={`signin-step-icon ${index===0?'step-accent':''}`}><WorkflowIcon kind={icon}/></span><span>{label}</span></li>)}</ol><div className="signin-proof">CommitCraft <span>·</span> StackForge <span>·</span> SnapDiff</div></aside>
    <div className="signin-form-column"><section className="login-panel" aria-labelledby="login-title" aria-busy={busy||setupState==='loading'}>
      {setupState === 'loading' && <div className="signin-connection" role="status"><span className="signin-loader" aria-hidden="true"/><h1 id="login-title">Connecting</h1><p>Checking your workspace sign-in options.</p></div>}
      {setupState === 'unavailable' && <><h1 id="login-title">Unable to connect</h1><p>We could not reach your ForgeOS installation. Check the connection and try again.</p><button className="button-primary" onClick={() => window.location.reload()}>Try again</button></>}
      {setupState === 'setup' && <form onSubmit={event => void createOwner(event)}><h1 id="login-title">Create your workspace</h1><p>{authMode === 'password' ? 'Set up the first owner account.' : 'Create your owner account, then enroll a security key.'}</p><label>Email<input type="email" disabled={busy} autoComplete="username" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} required /></label><label>New password<input type="password" disabled={busy} autoComplete="new-password" minLength={12} maxLength={256} value={password} onChange={event => setPassword(event.target.value)} required /></label><label>Installation bootstrap password<input type="password" disabled={busy} autoComplete="off" value={bootstrapPassword} onChange={event => setBootstrapPassword(event.target.value)} required /></label><button className="button-primary" disabled={busy} type="submit">{busy ? 'Creating account...' : 'Create owner account'}</button></form>}
      {setupState === 'signin' && <form noValidate onSubmit={event => { if(authMode==='password') void enrollWithPassword(event); else {event.preventDefault();void signInWithKey();} }}><h1 id="login-title">Welcome back</h1><p>Sign in to continue your work.</p>
        <label htmlFor="signin-email">Email</label><input ref={emailInput} id="signin-email" type="email" disabled={busy} autoComplete="username" inputMode="email" maxLength={254} value={email} onChange={event => {setEmail(event.target.value);setFieldErrors(old=>({...old,email:undefined}));}} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email?'signin-email-error':undefined} placeholder="you@company.com" required />
        {fieldErrors.email && <span className="signin-field-error" id="signin-email-error" role="status">{fieldErrors.email}</span>}
        {authMode === 'password' && <><div className="signin-password-label"><label htmlFor="signin-password">Password</label><button type="button" className="signin-recovery-link" onClick={() => setRecoveryOpen(!recoveryOpen)} aria-expanded={recoveryOpen} aria-controls="access-recovery">Forgot password?</button></div><div className="password-field"><input ref={passwordInput} id="signin-password" type={showPassword?'text':'password'} disabled={busy} autoComplete="current-password" maxLength={256} value={password} onChange={event => {setPassword(event.target.value);setFieldErrors(old=>({...old,password:undefined}));}} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password?'signin-password-error':undefined} required /><button type="button" className="password-reveal" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword?'Hide':'Show'}</button></div>{fieldErrors.password && <span id="signin-password-error" className="signin-field-error" role="status">{fieldErrors.password}</span>}</>}
        {authMode === 'security-key' && <p className="signin-key-note">Use your enrolled physical key and its PIN or biometric check.</p>}
        <button className="button-primary" disabled={busy} type="submit">{busy?'Signing in...':authMode==='password'?'Sign in':'Use security key'}<span aria-hidden="true">→</span></button>
        {authMode === 'security-key' && <button className="login-secondary" type="button" onClick={() => {setEnrolling(!enrolling);setError('');}}>{enrolling?'Hide enrollment':'Enroll your first security key'}</button>}
      </form>}
      {setupState === 'signin' && authMode === 'security-key' && enrolling && <form className="login-enrollment" onSubmit={event=>void enrollWithPassword(event)}><p>Your account password allows key enrollment only.</p><label>Account password<input ref={passwordInput} type="password" disabled={busy} autoComplete="current-password" maxLength={256} value={password} onChange={event=>setPassword(event.target.value)} required /></label><button disabled={busy||!email.trim()} type="submit">Continue to enrollment</button></form>}
      {error && <div className="login-error" role="alert">{error}</div>}
      <aside tabIndex={-1} hidden={!recoveryOpen} id="access-recovery" className="signin-recovery" role="region" aria-labelledby="recovery-title"><h2 id="recovery-title">Recover account access</h2><p>Password reset emails are not configured for this installation. Contact your workspace administrator to arrange account recovery.</p><p>This page cannot reset your password or send a recovery email.</p><button type="button" onClick={()=>{setRecoveryOpen(false);(passwordInput.current||emailInput.current)?.focus();}}>Back to sign in</button></aside>
    </section><footer className="signin-trust"><WorkflowIcon kind="shield"/><span>For security, sessions expire 15 minutes after sign-in.</span></footer></div></div>
  </main>;
}

function WorkflowIcon({kind}:{kind:string}) {
  const paths:Record<string,string>={workspace:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',tool:'M4 6h16M4 12h10M4 18h16M17 10l3 2-3 2',inspect:'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM16 16l5 5',apply:'M4 12h15M13 5l7 7-7 7',shield:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3ZM8 12l3 3 5-6'};
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]||paths.tool}/></svg>;
}
