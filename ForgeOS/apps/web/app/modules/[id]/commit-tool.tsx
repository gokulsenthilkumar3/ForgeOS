'use client';
import { useEffect, useState } from 'react';
import { useLlm } from './use-llm';
import { commitTypes, formatCommit, validateGeneratedCommit } from './commit-engine.mjs';

type CommitContent = { message: string; kind: string; scope: string; summary: string; source: 'manual' | 'ai' | 'legacy'; savedAt: string };
type StoredRecord = { id: string; name: string; recordType: string; content: CommitContent; updatedAt: string };

function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CommitTool() {
  const [pane, setPane] = useState('editor');
  const [diff, setDiff] = useState('');
  const [kind, setKind] = useState('feat');
  const [scope, setScope] = useState('');
  const [summary, setSummary] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [selected, setSelected] = useState('');
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [legacy, setLegacy] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const llm = useLlm();
  const workspaceId = typeof window === 'undefined' ? '' : localStorage.getItem('forgeos-workspace-id') || '';
  const endpoint = `/api/v1/modules/commitcraft/records?workspaceId=${encodeURIComponent(workspaceId)}`;

  async function refresh() {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load commit history (${response.status}).`);
    const rows = await response.json() as StoredRecord[];
    setHistoryError('');
    setRecords(rows.filter(row => row.recordType === 'commit-draft' && typeof row.content?.message === 'string'));
  }

  useEffect(() => {
    setHistoryLoading(true);
    void refresh().catch(cause => setHistoryError(cause instanceof Error ? cause.message : 'Could not load commit history.')).finally(() => setHistoryLoading(false));
    try {
      const history: unknown = JSON.parse(localStorage.getItem('commitcraft_history') || '[]');
      setLegacy(Array.isArray(history) ? history.filter((item): item is string => typeof item === 'string' && item.trim().length > 0 && item.length <= 2000).slice(0, 20) : []);
    } catch { setLegacy([]); }
  }, [workspaceId]);

  let manualMessage = '';
  let validationError = '';
  if (summary.trim()) {
    try { manualMessage = formatCommit({ kind, scope, summary }); }
    catch (cause) { validationError = cause instanceof Error ? cause.message : 'Invalid draft.'; }
  }
  const currentMessage = aiMessage || manualMessage;
  const importable = [...new Set(legacy)].filter(item => !records.some(record => record.content.message === item));

  function resetDraft() {
    setSelected(''); setDiff(''); setKind('feat'); setScope(''); setSummary(''); setAiMessage(''); setError(''); setMessage('');
  }

  function openRecord(record: StoredRecord) {
    setPane('editor'); setSelected(record.name); setDiff(''); setKind(commitTypes.includes(record.content.kind) ? record.content.kind : 'feat');
    setScope(record.content.scope || ''); setSummary(record.content.summary || ''); setAiMessage(record.content.source === 'ai' || record.content.source === 'legacy' ? record.content.message : '');
    setError(''); setMessage('');
  }

  async function generateAi() {
    if (!diff.trim()) { setError('Paste a diff before asking the model.'); return; }
    setError(''); setMessage('');
    try {
      const response = await llm.run(`Write one Conventional Commit message for this diff. Type: ${kind}. Scope: ${scope || 'none'}. Return only the commit message.\n\n${diff.slice(0, 12000)}`);
      setAiMessage(validateGeneratedCommit(response)); setPane('editor');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Generation failed.'); }
  }

  async function store(recordName: string, content: CommitContent) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recordType: 'commit-draft', name: recordName, content }) });
    if (!response.ok) throw new Error(`Could not save commit draft (${response.status}).`);
    return response.json() as Promise<StoredRecord>;
  }

  async function saveDraft() {
    if (!currentMessage || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const recordName = selected || `draft-${crypto.randomUUID()}`;
      const saved = await store(recordName, { message: currentMessage, kind, scope: scope.trim(), summary: summary.trim(), source: aiMessage ? 'ai' : 'manual', savedAt: new Date().toISOString() });
      await refresh(); setSelected(saved.name);
      setMessage('Draft saved to this workspace. The pasted diff and model key were not saved.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Save failed.'); }
    finally { setSaving(false); }
  }

  async function importLegacy() {
    if (!importable.length || saving) return;
    // The old browser copy is never modified, and API keys are not imported.
    downloadJson('commitcraft-browser-history-backup.json', legacy);
    setSaving(true); setError(''); setMessage('');
    try {
      for (const item of importable) await store(`legacy-${crypto.randomUUID()}`, { message: item, kind: 'legacy', scope: '', summary: '', source: 'legacy', savedAt: new Date().toISOString() });
      await refresh(); setMessage(`Imported ${importable.length} messages. The browser copy remains unchanged.`);
    } catch (cause) { await refresh().catch(() => undefined); setError(cause instanceof Error ? cause.message : 'Import stopped. The browser copy remains unchanged.'); }
    finally { setSaving(false); }
  }

  async function copyMessage() {
    if (!currentMessage) return;
    try { await navigator.clipboard.writeText(currentMessage); setMessage('Commit message copied.'); setError(''); }
    catch { setError('Clipboard unavailable. Select and copy the message from the preview.'); }
  }

  return <section className="tool-card commit-workbench" data-pane={pane}>
    <aside className="extension-download"><div><strong>CommitCraft for your editor</strong><p>Local staged-change review and editable Conventional Commit drafts. VSIX development release; no automatic commits or model calls.</p></div><a className="button-primary" href="/downloads/commitcraft-0.1.0.vsix" download>Download VSIX 0.1.0</a></aside>
    <header className="commit-context"><div><span className="workbench-mode">COMMITCRAFT / MESSAGE WORKBENCH</span><h2>Draft a commit</h2><p>Manual drafting stays in your browser. Saving writes only the message to your workspace.</p></div><span className="commit-mode">{llm.busy ? 'AI request in progress' : 'Manual mode available'}</span></header>
    <nav className="commit-pane-nav" aria-label="CommitCraft work areas">{[['drafts', 'Saved drafts'], ['editor', 'Compose'], ['assistant', 'AI assistance']].map(([id, label]) => <button key={id} aria-pressed={pane === id} onClick={() => setPane(id)}>{label}</button>)}</nav>
    <div className="commit-panes"><aside className="commit-drafts" aria-label="Saved drafts"><h3>WORKSPACE DRAFTS</h3><p role="status">{historyLoading ? 'Loading saved messages...' : historyError ? 'History unavailable' : `${records.length} saved messages`}</p>{historyError && <p role="alert">{historyError}</p>}<button onClick={() => { resetDraft(); setPane('editor'); }}>+ New draft</button><div className="commit-draft-list">{historyLoading || historyError ? null : records.length ? records.map(record => <button key={record.id} aria-pressed={selected === record.name} onClick={() => openRecord(record)}><strong>{record.content.message.split('\n')[0]}</strong><small>{new Date(record.updatedAt).toLocaleDateString()} / {record.content.source}</small></button>) : <p>No saved drafts yet. Compose a message and save it to start your history.</p>}</div></aside><div className="commit-editor">
    <p>Compose a Conventional Commit and save message history to this workspace. Pasted diffs and model keys are not saved.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status">{message}</p>}
    {importable.length > 0 && <div className="activity"><span>{importable.length} messages found in the standalone CommitCraft browser history.</span><button disabled={saving} onClick={() => void importLegacy()}>Back up and import</button></div>}
    <div className="tool-row"><label>Saved drafts <select value={selected} onChange={event => { const record = records.find(item => item.name === event.target.value); if (record) openRecord(record); else resetDraft(); }}><option value="">New draft</option>{records.map(record => <option key={record.id} value={record.name}>{record.content.message.slice(0, 80)}</option>)}</select></label><button onClick={resetDraft}>New draft</button></div>
    <div className="tool-row"><label>Type <select value={kind} onChange={event => { setKind(event.target.value); setAiMessage(''); }}>{commitTypes.map(type => <option key={type}>{type}</option>)}</select></label><label>Scope (optional) <input value={scope} onChange={event => { setScope(event.target.value); setAiMessage(''); }} maxLength={40} placeholder="api" /></label></div>
    <label>Summary <input value={summary} onChange={event => { setSummary(event.target.value); setAiMessage(''); }} maxLength={120} placeholder="describe the change" /></label>
    <label>Git diff (optional for manual drafts) <textarea value={diff} onChange={event => { setDiff(event.target.value); setAiMessage(''); }} rows={10} placeholder="Paste a Git diff for AI assistance…" /></label>
    {validationError && <p role="alert" className="error">{validationError}</p>}
    <h3>Message preview</h3><pre aria-label="Commit message preview">{currentMessage || 'Enter a summary or generate a message.'}</pre>
    <button className="commit-save" disabled={saving || !currentMessage} onClick={() => void saveDraft()}>{saving ? 'Saving…' : 'Save draft'}</button><button disabled={!currentMessage} onClick={() => void copyMessage()}>Copy message</button><button disabled={!records.length} onClick={() => downloadJson('forgeos-commitcraft-history.json', records.map(record => ({ message: record.content.message, savedAt: record.content.savedAt })))}>Export history</button>
    </div><aside className="commit-assistant" aria-label="Optional AI assistance"><span className="workbench-mode">EXPLICIT EXTERNAL REQUEST</span><h3>Optional AI drafting</h3><p>AI sends up to 12,000 characters of the pasted diff to the selected provider. Check the diff for secrets first.</p>
    <div className="tool-row"><label>Provider <select value={llm.provider} onChange={event => { const provider = event.target.value as 'openai' | 'anthropic'; llm.setProvider(provider); llm.setModel(provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-latest'); }}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select></label><label>Model <input value={llm.model} onChange={event => llm.setModel(event.target.value)} /></label><label>API key <input type="password" value={llm.apiKey} onChange={event => llm.setApiKey(event.target.value)} autoComplete="off" /></label></div>
    <button disabled={!diff.trim() || !llm.apiKey || llm.busy} onClick={() => void generateAi()}>{llm.busy ? 'Generating…' : 'Generate with AI'}</button>
    {llm.error && <p role="alert" className="error">{llm.error}</p>}
    </aside></div>{records.length > 0 && <div className="commit-history"><h3>History</h3><div className="diff-lines">{records.slice(0, 30).map(record => <div key={record.id}><span>{new Date(record.updatedAt).toLocaleDateString()}</span><code>{record.content.message}</code><button onClick={() => openRecord(record)}>Open</button></div>)}</div></div>}
  </section>;
}
