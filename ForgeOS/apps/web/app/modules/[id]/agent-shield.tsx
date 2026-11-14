'use client';
import { useEffect, useState } from 'react';
import { SecurityProducts } from '../../security-products';
import { previewShieldDecision, shieldProtocols, validateShieldPolicy, type ShieldPolicy } from '@forgeos/contracts';

type Saved = { id: string; name: string; content: ShieldPolicy };
export function AgentShieldTool() {
  const [name, setName] = useState('Default protection');
  const [mode, setMode] = useState<ShieldPolicy['mode']>('sandbox');
  const [origins, setOrigins] = useState('');
  const [actions, setActions] = useState('projects:read');
  const [budget, setBudget] = useState(2000);
  const [ttl, setTtl] = useState(300);
  const [records, setRecords] = useState<Saved[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [action, setAction] = useState('projects:read');
  const [origin, setOrigin] = useState('');
  const [tokens, setTokens] = useState(500);
  const [verified, setVerified] = useState(false);
  const [decision, setDecision] = useState('');
  const workspace = typeof window === 'undefined' ? '' : localStorage.getItem('forgeos-workspace-id') || '';
  const endpoint = `/api/v1/modules/agentshield/records?workspaceId=${encodeURIComponent(workspace)}`;
  useEffect(() => {
    const controller = new AbortController();
    setLoaded(false); setRecords([]);
    fetch(endpoint, { signal: controller.signal, cache: 'no-store' }).then(async r => {
      if (!r.ok) throw new Error(`Could not load policies (${r.status})`);
      setRecords(await r.json()); setLoaded(true);
    }).catch(e => { if (!controller.signal.aborted) setError(String(e.message)); });
    return () => controller.abort();
  }, [endpoint]);
  useEffect(() => { setDecision(''); }, [mode, origins, actions, budget, ttl, action, origin, tokens, verified]);
  const split = (s: string) => s.split(/[\n,]/).map(v => v.trim()).filter(Boolean);
  function policy() { return validateShieldPolicy({ mode, allowedOrigins: split(origins), allowedActions: split(actions), tokenBudget: budget, cacheTtlSeconds: ttl }); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setStatus(''); setBusy(true);
    try {
      const content = policy();
      const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recordType: 'policy', name: name.trim(), content }) });
      if (!r.ok) { const body = await r.json().catch(() => ({})); throw new Error(body.message || `Save failed (${r.status})`); }
      const saved = await r.json() as Saved;
      setRecords(old => [saved, ...old.filter(item => item.id !== saved.id)]);
      setStatus('Policy draft saved. Gateway enforcement is not deployed.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }
  function load(record: Saved) {
    try {
      const p = validateShieldPolicy(record.content);
      setName(record.name); setMode(p.mode); setOrigins(p.allowedOrigins.join('\n')); setActions(p.allowedActions.join('\n')); setBudget(p.tokenBudget); setTtl(p.cacheTtlSeconds); setDecision(''); setError(''); setStatus('Loaded saved draft');
    } catch { setError('Saved policy is invalid'); }
  }
  return <div className="tool-card"><SecurityProducts current="agentshield"/>
    <h2>AgentShield</h2>
    <p>Configure agent permission drafts separately from MathShield human verification and the proposed managed CDN product.</p>
    <p role="status"><strong>Policy workbench:</strong> drafts and previews are available. A2A execution and sandbox network isolation are not deployed. Managed CDN is a separate proposed product.</p>
    <form onSubmit={save}>
      <div className="tool-row"><label>Policy name<br /><input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>Environment<br /><select value={mode} onChange={e => { setMode(e.target.value as ShieldPolicy['mode']); setDecision(''); }}><option value="sandbox">Sandbox — no internet</option><option value="community">Community — verified peers</option></select></label></div>
      <div className="tool-row"><label>Allowed HTTPS origins, one per line<br /><textarea rows={4} value={origins} placeholder="https://assets.example.com" onChange={e => setOrigins(e.target.value)} /></label>
      <label>Explicit actions, one per line<br /><textarea rows={4} value={actions} onChange={e => setActions(e.target.value)} /></label></div>
      <div className="tool-row"><label>Token budget per request<br /><input type="number" min={1} max={100000} required value={budget} onChange={e => setBudget(Number(e.target.value))} /></label>
      <label>Legacy cache metadata TTL (seconds)<br /><input type="number" min={0} max={86400} required value={ttl} onChange={e => setTtl(Number(e.target.value))} /></label></div>
      <p>The retained cache field is draft metadata only and does not deploy CDN behavior. Sandbox requires an empty origin list. Community requires verified peer identities and exact origin allowlists. Unlisted actions are denied. Private responses and mutations must never enter a shared cache.</p>
      <button disabled={busy || !loaded || !name.trim()} type="submit">{busy ? 'Saving…' : 'Save policy draft'}</button>
    </form>
    {error && <p role="alert" className="error">{error}</p>}{status && <p role="status">{status}</p>}
    <h3>Saved policies</h3>
    {!loaded ? <p>Loading policies…</p> : records.length ? records.map(r => <button key={r.id} onClick={() => load(r)}>{r.name}</button>) : <p>No saved policies in this workspace.</p>}
    <h3>Decision preview</h3><p>This local simulation makes no network request and grants no permission. Peer verification is simulated.</p>
    <div className="tool-row"><label>Requested action<br /><input value={action} onChange={e => setAction(e.target.value)} /></label><label>Internet origin (empty for local)<br /><input value={origin} onChange={e => setOrigin(e.target.value)} /></label><label>Estimated tokens<br /><input type="number" min={0} value={tokens} onChange={e => setTokens(Number(e.target.value))} /></label></div>
    <label><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} /> Simulate verified peer</label><br />
    <button onClick={() => { try { setDecision(JSON.stringify(previewShieldDecision(policy(), { action, origin, tokens, verifiedPeer: verified }), null, 2)); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Invalid policy'); setDecision(''); } }}>Preview decision</button>
    {decision && <pre aria-live="polite">{decision}</pre>}
    <h3>Protocols and integration status</h3>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Protocol</th><th>Status</th><th>Purpose</th></tr></thead><tbody>{shieldProtocols.map(([protocol, state, purpose]) => <tr key={protocol}><td>{protocol}</td><td>{state}</td><td>{purpose}</td></tr>)}</tbody></table></div>
    <h3>Existing agent identities</h3><p><a href="/settings/agents">Manage signed agent access</a>. Registration and grants require a human administrator and physical-key approval.</p>
  </div>;
}

