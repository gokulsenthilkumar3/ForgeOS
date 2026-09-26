'use client';

import './agent-access.css';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

type Agent = { id: string; name: string; kind: 'ai' | 'rpa' | 'test' | 'service'; fingerprint: string; enabled: boolean; createdAt: string };
type Grant = { id: string; agentId: string; agentName: string; scope: string; expiresAt: string; revokedAt: string | null };

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
  return body.error || body.message || `Request failed (${response.status})`;
}

async function keyApproval(workspaceId: string, action: 'agent.register' | 'agent.grant') {
  const optionsResponse = await fetch('/api/v1/auth/webauthn/step-up/options', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, action }),
  });
  if (!optionsResponse.ok) throw new Error(await responseError(optionsResponse));
  const options = await optionsResponse.json();
  const response = await startAuthentication({ optionsJSON: options.options });
  const verification = await fetch('/api/v1/auth/webauthn/step-up/verify', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId: options.challengeId, response }),
  });
  if (!verification.ok) throw new Error(await responseError(verification));
  return (await verification.json() as { approvalId: string }).approvalId;
}

export function AgentAccessPanel({ workspaceId, role }: { workspaceId: string; role?: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Agent['kind']>('test');
  const [publicKeyPem, setPublicKeyPem] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const isAdmin = role === 'owner' || role === 'admin';

  const refresh = useCallback(async () => {
    if (!workspaceId || !isAdmin) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const query = `workspaceId=${encodeURIComponent(workspaceId)}`;
      const [agentsResponse, grantsResponse] = await Promise.all([
        fetch(`/api/v1/agent-access/agents?${query}`, { cache: 'no-store' }),
        fetch(`/api/v1/agent-access/grants?${query}`, { cache: 'no-store' }),
      ]);
      if (!agentsResponse.ok) throw new Error(await responseError(agentsResponse));
      if (!grantsResponse.ok) throw new Error(await responseError(grantsResponse));
      const agentRows = await agentsResponse.json() as Agent[];
      setAgents(agentRows);
      setGrants(await grantsResponse.json() as Grant[]);
      setSelectedAgent(previous => agentRows.some(item => item.id === previous) ? previous : agentRows[0]?.id || '');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load agents'); }
    finally { setLoading(false); }
  }, [workspaceId, isAdmin]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function register(event: FormEvent) {
    event.preventDefault(); if (busy || !workspaceId) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const approvalId = await keyApproval(workspaceId, 'agent.register');
      const response = await fetch('/api/v1/agent-access/agents', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId, name: name.trim(), kind, publicKeyPem: publicKeyPem.trim(), approvalId }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setName(''); setPublicKeyPem('');
      setStatus('Named automation identity registered. It has no access until you grant it.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not register agent'); }
    finally { setBusy(false); }
  }

  async function grant(event: FormEvent) {
    event.preventDefault(); if (busy || !workspaceId || !selectedAgent) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const approvalId = await keyApproval(workspaceId, 'agent.grant');
      const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
      const response = await fetch(`/api/v1/agent-access/agents/${selectedAgent}/grants`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId, expiresAt, approvalId }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setStatus('Read-only grant created. It expires automatically.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not grant access'); }
    finally { setBusy(false); }
  }

  async function revoke(grantId: string) {
    if (busy || !workspaceId) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/v1/agent-access/grants/${grantId}?workspaceId=${encodeURIComponent(workspaceId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response));
      setStatus('Agent grant revoked.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not revoke grant'); }
    finally { setBusy(false); }
  }

  if (!workspaceId) return <p role="status">Loading workspace…</p>;
  if (!isAdmin) return <div className="agent-empty"><h2>Administrator access required</h2><p>Only a workspace owner or administrator can register automation or issue grants.</p></div>;
  return <div className="agent-page">
    <header><p className="eyebrow">HUMANS APPROVE, SOFTWARE IDENTIFIES ITSELF</p><h1>Automation access</h1><p>AI agents, test runners, and RPA cannot sign in as people. Every agent has a separate public key and receives only a short-lived, read-only grant approved with your physical security key.</p></header>
    {error && <div role="alert" className="inline-error">{error}</div>}
    {status && <p role="status" className="agent-status">{status}</p>}
    <div className="agent-grid">
      <section className="agent-card"><h2>Registered software</h2>
        {loading ? <p role="status">Loading agents…</p> : agents.length ? <ul className="agent-list">{agents.map(agent => <li key={agent.id}><strong>{agent.name}</strong><span>{agent.kind.toUpperCase()} · {agent.enabled ? 'Enabled' : 'Disabled'}</span><code title="SHA-256 public-key fingerprint">{agent.fingerprint.slice(0, 20)}…</code></li>)}</ul> : <p>No automation identity is registered. Unknown software remains denied.</p>}
      </section>
      <section className="agent-card"><h2>Register a named agent</h2><p>Generate an Ed25519 key pair on the agent host. Paste only its public key here; ForgeOS must never receive its private key.</p>
        <form onSubmit={event => void register(event)}>
          <label>Name<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="CI smoke runner" /></label>
          <label>Declared software type<select value={kind} onChange={event => setKind(event.target.value as Agent['kind'])}><option value="test">Test runner</option><option value="rpa">RPA</option><option value="ai">AI agent</option><option value="service">Service</option></select></label>
          <label>Ed25519 public key (PEM)<textarea required rows={5} value={publicKeyPem} onChange={event => setPublicKeyPem(event.target.value)} placeholder="-----BEGIN PUBLIC KEY-----" /></label>
          <button className="button-primary" disabled={busy} type="submit">Approve with security key and register</button>
        </form>
      </section>
      <section className="agent-card"><h2>Issue a short grant</h2><p>Current pilot scope: read-only project listing in this workspace. No human session, secret, policy, or audit-log access.</p>
        <form onSubmit={event => void grant(event)}>
          <label>Agent<select required value={selectedAgent} onChange={event => setSelectedAgent(event.target.value)}>{agents.map(agent => <option value={agent.id} key={agent.id}>{agent.name}</option>)}</select></label>
          <label>Expires in<select value={minutes} onChange={event => setMinutes(Number(event.target.value))}><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label>
          <button className="button-primary" disabled={busy || !selectedAgent} type="submit">Approve with security key and grant</button>
        </form>
      </section>
      <section className="agent-card"><h2>Grant history</h2>
        {loading ? <p role="status">Loading grants…</p> : grants.length ? <ul className="agent-list">{grants.map(item => {
          const active = !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now();
          return <li key={item.id}><strong>{item.agentName}</strong><span>{item.scope} · {active ? 'Active' : item.revokedAt ? 'Revoked' : 'Expired'}</span><small>Until {new Date(item.expiresAt).toLocaleString()}</small>{active && <button disabled={busy} onClick={() => void revoke(item.id)}>Revoke now</button>}</li>;
        })}</ul> : <p>No grants issued.</p>}
      </section>
    </div>
  </div>;
}
