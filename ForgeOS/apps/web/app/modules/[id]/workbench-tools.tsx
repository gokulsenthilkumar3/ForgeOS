'use client';
import { useRef, useState } from 'react';
import { useLlm } from './use-llm';
import { openVault, persistVault, workspaceVaultKey, type UnlockedVault } from './vault-storage';

export function CommitTool() {
  const [diff, setDiff] = useState(''); const [kind, setKind] = useState('feat'); const [scope, setScope] = useState(''); const [summary, setSummary] = useState('');
  const llm = useLlm(); const [aiMessage, setAiMessage] = useState('');
  const files = [...diff.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(match => match[1]);
  const subject = summary.trim() || (files.length ? `update ${files.length === 1 ? files[0] : `${files.length} files`}` : '');
  const commit = subject ? `${kind}${scope.trim() ? `(${scope.trim()})` : ''}: ${subject.charAt(0).toLowerCase()}${subject.slice(1)}` : '';
  async function generateAi() { try { setAiMessage((await llm.run(`Write one Conventional Commit message for this diff. Type: ${kind}. Scope: ${scope || 'none'}. Return only the commit message.\n\n${diff.slice(0, 12000)}`)).trim()); } catch { setAiMessage(''); } }
  return <section className="tool-card"><h2>Draft a commit</h2><p>Paste a Git diff, choose a conventional commit type, and edit the summary.</p><div className="tool-row"><select value={kind} onChange={event => setKind(event.target.value)}>{['feat','fix','docs','refactor','test','chore','perf'].map(type => <option key={type}>{type}</option>)}</select><input value={scope} onChange={event => setScope(event.target.value)} placeholder="Scope (optional)" /></div><textarea value={diff} onChange={event => setDiff(event.target.value)} placeholder="Paste git diff here…" rows={12} /><input value={summary} onChange={event => setSummary(event.target.value)} placeholder="Describe the change" /><pre>{aiMessage || commit || 'Your commit message will appear here.'}</pre><button disabled={!aiMessage && !commit} onClick={() => void navigator.clipboard.writeText(aiMessage || commit)}>Copy commit message</button><h3>AI option</h3><div className="tool-row"><select value={llm.provider} onChange={event => { const provider = event.target.value as 'openai'|'anthropic'; llm.setProvider(provider); llm.setModel(provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-latest'); }}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select><input value={llm.model} onChange={event => llm.setModel(event.target.value)} placeholder="Model" /><input type="password" value={llm.apiKey} onChange={event => llm.setApiKey(event.target.value)} placeholder="Provider API key" /></div><button disabled={!diff || !llm.apiKey || llm.busy} onClick={() => void generateAi()}>{llm.busy ? 'Generating…' : 'Generate with AI'}</button>{llm.error && <div role="alert">{llm.error}</div>}</section>;
}

export function CompareTool() {
  const [left, setLeft] = useState(''); const [right, setRight] = useState(''); const [format, setFormat] = useState<'text'|'json'>('text');
  let a = left, b = right, error = '';
  if (format === 'json') { try { a = JSON.stringify(JSON.parse(left), null, 2); b = JSON.stringify(JSON.parse(right), null, 2); } catch { error = 'Both inputs must contain valid JSON.'; } }
  const oldLines = a.split('\n'), newLines = b.split('\n');
  return <section className="tool-card"><h2>Compare content</h2><p>Inspect line changes or normalize JSON before comparison.</p><select value={format} onChange={event => setFormat(event.target.value as 'text'|'json')}><option value="text">Text / SQL</option><option value="json">JSON</option></select><div className="tool-row"><textarea aria-label="Original content" value={left} onChange={event => setLeft(event.target.value)} rows={12} placeholder="Original" /><textarea aria-label="Updated content" value={right} onChange={event => setRight(event.target.value)} rows={12} placeholder="Updated" /></div>{error ? <div role="alert">{error}</div> : <div className="diff-lines">{oldLines.map((line, index) => <div className={line === newLines[index] ? '' : 'changed'} key={index}><span>{index + 1}</span><code>{line || ' '}</code><code>{newLines[index] ?? ' '}</code></div>)}</div>}</section>;
}

export function RegexTool() {
  const [pattern, setPattern] = useState(''); const [flags, setFlags] = useState('g'); const [sample, setSample] = useState('');
  let matches: Array<{ match: string; index: number }> = [], error = '';
  try { const expression = new RegExp(pattern, flags); if (pattern) matches = [...sample.matchAll(new RegExp(expression, expression.flags.includes('g') ? expression.flags : expression.flags + 'g'))].slice(0, 100).map(match => ({ match: match[0], index: match.index })); } catch (cause) { error = cause instanceof Error ? cause.message : 'Invalid expression'; }
  return <section className="tool-card"><h2>Test a regular expression</h2><div className="tool-row"><input value={pattern} onChange={event => setPattern(event.target.value)} placeholder="Pattern" aria-label="Pattern" /><input value={flags} onChange={event => setFlags(event.target.value)} placeholder="Flags" aria-label="Flags" /></div><textarea value={sample} onChange={event => setSample(event.target.value)} rows={10} placeholder="Text to test…" />{error ? <p role="alert">{error}</p> : <p>{matches.length} match{matches.length === 1 ? '' : 'es'}</p>}<div className="diff-lines">{matches.map((match, index) => <div key={index}><span>{match.index}</span><code>{match.match || '(empty match)'}</code></div>)}</div></section>;
}

export function ResumeTool() {
  const [name, setName] = useState(''); const [title, setTitle] = useState(''); const [email, setEmail] = useState(''); const [summary, setSummary] = useState(''); const [experience, setExperience] = useState('');
  return <section className="tool-card"><h2>Build a CV</h2><div className="tool-row"><input value={name} onChange={event => setName(event.target.value)} placeholder="Full name" /><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Professional title" /></div><input value={email} onChange={event => setEmail(event.target.value)} placeholder="Email" /><textarea value={summary} onChange={event => setSummary(event.target.value)} placeholder="Profile summary" rows={4} /><textarea value={experience} onChange={event => setExperience(event.target.value)} placeholder="Experience" rows={7} /><button onClick={() => window.print()}>Print / save as PDF</button><div className="cv-preview"><h1>{name || 'Your name'}</h1><h2>{title}</h2><p>{email}</p><p>{summary}</p><h3>Experience</h3><p className="preline">{experience}</p></div></section>;
}

export function VaultTool() {
  const activeVault = useRef<UnlockedVault | null>(null);
  const savingRef = useRef(false);
  const [password, setPassword] = useState(''); const [entries, setEntries] = useState<Array<{ name: string; username: string; password: string }>>([]); const [unlocked, setUnlocked] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const [name, setName] = useState(''); const [username, setUsername] = useState(''); const [secret, setSecret] = useState(''); const [showSecret, setShowSecret] = useState(false);
  async function unlock() {
    if (!password) return;
    try {
      const existing = Boolean(localStorage.getItem(workspaceVaultKey(localStorage)));
      const vault = await openVault(localStorage, password);
      activeVault.current = vault;
      setEntries(vault.entries);
      setPassword(''); setUnlocked(true);
      setMessage(existing ? 'Vault unlocked' : 'New vault ready. Add an entry to save it.');
    } catch { setMessage('Could not unlock vault. Check your master password and workspace.'); }
  }
  function lock() { if (activeVault.current) activeVault.current.active = false; activeVault.current = null; setEntries([]); setUnlocked(false); setPassword(''); setName(''); setUsername(''); setSecret(''); setMessage('Vault locked'); }
  async function save(next: typeof entries) {
    const vault = activeVault.current;
    if (!vault || savingRef.current) return;
    if (workspaceVaultKey(localStorage) !== vault.storageKey) { lock(); setMessage('Workspace changed. Unlock its vault before saving.'); return; }
    savingRef.current = true; setSaving(true);
    try {
      await persistVault(localStorage, vault, next);
      if (activeVault.current !== vault) return;
      setEntries(next); setName(''); setUsername(''); setSecret(''); setMessage('Encrypted vault saved on this device');
    } catch { setMessage('Vault was not saved. Check the workspace and browser storage, then try again.'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  const generate = () => { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'; const values = crypto.getRandomValues(new Uint32Array(24)); setSecret([...values].map(value => alphabet[value % alphabet.length]).join('')); };
  return <section className="tool-card"><h2>Private vault</h2><p>Entries are encrypted in this browser with your master password. Losing that password means the data cannot be recovered.</p>{!unlocked ? <><input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Master password" aria-label="Master password" /><button disabled={!password} onClick={() => void unlock()}>Unlock or create vault</button></> : <><button onClick={lock}>Lock vault</button><div className="tool-row"><input value={name} onChange={event => setName(event.target.value)} placeholder="Entry name" /><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Username" /></div><div className="tool-row"><input type={showSecret ? 'text' : 'password'} autoComplete="new-password" value={secret} onChange={event => setSecret(event.target.value)} placeholder="Password" aria-label="Entry password" /><button onClick={() => setShowSecret(value => !value)}>{showSecret ? 'Hide' : 'Show'}</button><button onClick={generate}>Generate</button></div><button disabled={saving || !name.trim() || !secret} onClick={() => void save([...entries, { name: name.trim(), username, password: secret }])}>{saving ? 'Saving…' : 'Save entry'}</button>{entries.map((entry, index) => <div className="activity" key={index}><b>{entry.name}</b><span>{entry.username}</span><button onClick={() => void navigator.clipboard.writeText(entry.password)}>Copy password</button></div>)}</>}{message && <div role="status">{message}</div>}</section>;
}

export function MathShieldTool() {
  const startedAt = useRef(0);
  const [challenge, setChallenge] = useState<{ id: string; question: string; options?: string[] } | null>(null); const [answer, setAnswer] = useState(''); const [result, setResult] = useState(''); const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true); setResult(''); setChallenge(null); setAnswer('');
    try {
      const response = await fetch('/api/mathshield/challenge/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ difficulty: 'easy', type: 'arithmetic' }) });
      if (!response.ok) throw new Error(`Challenge service returned ${response.status}`);
      const value = await response.json(); startedAt.current = Date.now(); setChallenge(value);
    } catch (cause) { setResult(cause instanceof Error ? cause.message : 'Could not generate challenge'); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (!challenge || !answer.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/mathshield/verification/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ challengeId: challenge.id, answer: answer.trim(), timeTaken: Math.max(0, Date.now() - startedAt.current) }) });
      const value = await response.json();
      setResult(response.ok ? (value.success ? `Verified · ${value.riskLevel ?? 'unknown'} risk` : 'Verification failed. Generate another challenge to retry.') : value.message || 'Verification failed');
      if (response.ok || response.status === 404) setChallenge(null);
    } catch { setResult('Could not reach verification service. Try again.'); }
    finally { setBusy(false); }
  }
  return <section className="tool-card"><h2>Human verification</h2><p>Generate and verify a challenge through the ForgeOS origin. The embeddable widget is available at <code>/shield.js</code>.</p><button disabled={busy} onClick={() => void generate()}>{busy ? 'Working…' : 'Generate challenge'}</button>{challenge && <><h3>{challenge.question}</h3>{challenge.options?.map(option => <button key={option} aria-pressed={answer === option} onClick={() => setAnswer(option)}>{option}</button>)}<input value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Your answer" aria-label="Challenge answer" /><button className="primary" disabled={busy || !answer.trim()} onClick={() => void verify()}>Verify</button></>}{result && <pre role="status">{result}</pre>}</section>;
}

export function ImageDiffTool() {
  const first = useRef<HTMLCanvasElement>(null), second = useRef<HTMLCanvasElement>(null), diff = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState<number | null>(null); const [message, setMessage] = useState('');
  async function load(canvas: HTMLCanvasElement | null, file?: File) { if (!canvas || !file) return; const bitmap = await createImageBitmap(file); canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d')?.drawImage(bitmap, 0, 0); bitmap.close(); }
  function compare() { const a = first.current, b = second.current, out = diff.current; if (!a || !b || !out || !a.width || !b.width) { setMessage('Choose both images first.'); return; } if (a.width !== b.width || a.height !== b.height) { setMessage('Images must have the same dimensions.'); return; } out.width = a.width; out.height = a.height; const left = a.getContext('2d')!.getImageData(0, 0, a.width, a.height), right = b.getContext('2d')!.getImageData(0, 0, b.width, b.height), result = out.getContext('2d')!.createImageData(a.width, a.height); let changed = 0; for (let i = 0; i < left.data.length; i += 4) { const different = Math.max(...[0,1,2,3].map(offset => Math.abs(left.data[i+offset] - right.data[i+offset]))) > 20; if (different) changed++; result.data.set(different ? [255,75,105,255] : [left.data[i],left.data[i+1],left.data[i+2],80], i); } out.getContext('2d')!.putImageData(result, 0, 0); setCount(changed); setMessage(''); }
  return <section className="tool-card"><h2>Visual difference</h2><p>Compare two screenshots of equal dimensions. Pixels differing by more than 20 channel values are highlighted.</p><div className="tool-row"><label>Baseline<input type="file" accept="image/*" onChange={event => void load(first.current, event.target.files?.[0])} /></label><label>Current<input type="file" accept="image/*" onChange={event => void load(second.current, event.target.files?.[0])} /></label></div><button onClick={compare}>Compare screenshots</button>{message && <div role="alert">{message}</div>}{count !== null && <p>{count.toLocaleString()} changed pixels <button onClick={() => diff.current && window.open(diff.current.toDataURL('image/png'), '_blank')}>Open diff PNG</button></p>}<div className="canvas-grid"><canvas ref={first} /><canvas ref={second} /><canvas ref={diff} /></div></section>;
}
