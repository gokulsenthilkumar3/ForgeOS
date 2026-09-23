'use client';

import { useEffect, useState } from 'react';
import { useLlm } from './use-llm';

type Version = { text: string; createdAt: string };
type Prompt = { id: string; name: string; versions: Version[] };
type StoredRecord = { id: string; name: string; content: { versions?: Version[] } };

function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PromptTool() {
  const [records, setRecords] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState<Prompt[]>([]);
  const llm = useLlm();
  const workspaceId = typeof window === 'undefined' ? '' : localStorage.getItem('forgeos-workspace-id') || '';
  const endpoint = `/api/v1/modules/promptvault/records?workspaceId=${encodeURIComponent(workspaceId)}`;

  async function refresh() {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load prompts (${response.status})`);
    const rows = await response.json() as StoredRecord[];
    setRecords(rows.filter(row => Array.isArray(row.content?.versions)).map(row => ({
      id: row.id, name: row.name, versions: row.content.versions || [],
    })));
  }

  useEffect(() => {
    void refresh().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not load prompts'));
    const key = `forgeos-prompts-v1:${workspaceId || 'default'}`;
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) setLegacy(parsed.filter((item): item is Prompt =>
        typeof item?.name === 'string' && Array.isArray(item?.versions) &&
        item.versions.every((version: Version) => typeof version?.text === 'string' && typeof version?.createdAt === 'string')));
    } catch { setLegacy([]); }
  }, [workspaceId]);

  async function store(promptName: string, versions: Version[]) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recordType: 'prompt', name: promptName, content: { versions } }),
    });
    if (!response.ok) throw new Error(`Could not save prompt (${response.status})`);
    return response.json() as Promise<StoredRecord>;
  }

  async function save() {
    const promptName = name.trim();
    if (!promptName || !text.trim()) return;
    const collision = records.find(record => record.name === promptName && record.id !== selected);
    if (collision) { setError('A different prompt already has this name. Choose another name.'); return; }
    setBusy(true); setError('');
    try {
      const current = records.find(record => record.id === selected);
      const saved = await store(promptName, [...(current?.versions || []), { text, createdAt: new Date().toISOString() }]);
      await refresh();
      setSelected(saved.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  async function importLegacy() {
    const seen = new Set(records.map(record => record.name));
    const newPrompts = legacy.filter(prompt => {
      if (seen.has(prompt.name)) return false;
      seen.add(prompt.name);
      return true;
    });
    if (!newPrompts.length) return;
    download('forgeos-promptvault-browser-backup.json', legacy);
    setBusy(true); setError('');
    try {
      for (const prompt of newPrompts) await store(prompt.name, prompt.versions);
      await refresh();
      setLegacy([]);
    } catch (cause) {
      await refresh().catch(() => undefined);
      setError(cause instanceof Error ? cause.message : 'Import stopped. The browser copy remains unchanged.');
    } finally { setBusy(false); }
  }

  const current = records.find(record => record.id === selected);
  const importCount = legacy.filter(prompt => !records.some(record => record.name === prompt.name)).length;
  return <section className="tool-card">
    <h2>Prompt library</h2>
    <p>Prompts and versions are saved to the selected ForgeOS workspace.</p>
    {error && <div role="alert">{error}</div>}
    {importCount > 0 && <div className="activity"><span>{importCount} prompt{importCount === 1 ? '' : 's'} found in this browser. Existing workspace prompts with the same name will be left unchanged.</span><button disabled={busy} onClick={() => void importLegacy()}>Back up and import</button></div>}
    <label>Saved prompts<select value={selected} onChange={event => {
      const record = records.find(item => item.id === event.target.value);
      setSelected(record?.id || '');
      setName(record?.name || '');
      setText(record?.versions.at(-1)?.text || '');
      setOutput('');
    }}><option value="">New prompt</option>{records.map(record => <option key={record.id} value={record.id}>{record.name}</option>)}</select></label>
    <label>Prompt name<input value={name} onChange={event => setName(event.target.value)} maxLength={100} readOnly={Boolean(selected)} /></label>
    <label>Prompt text<textarea value={text} onChange={event => setText(event.target.value)} rows={10} /></label>
    <button disabled={busy || !name.trim() || !text.trim()} onClick={() => void save()}>{busy ? 'Saving…' : 'Save version'}</button>
    {current && <><h3>Version history</h3>{current.versions.map((version, index) => <div className="activity" key={index}><b>Version {index + 1}</b><span>{new Date(version.createdAt).toLocaleString()}</span><button onClick={() => setText(version.text)}>Load into editor</button></div>)}<button onClick={() => download(`forgeos-prompt-${current.name.replace(/[^a-z0-9-]/gi, '-')}.json`, current)}>Export prompt</button></>}
    <h3>Run prompt</h3>
    <div className="tool-row"><select value={llm.provider} onChange={event => {
      const provider = event.target.value as 'openai' | 'anthropic';
      llm.setProvider(provider);
      llm.setModel(provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-latest');
    }}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select><input value={llm.model} onChange={event => llm.setModel(event.target.value)} placeholder="Model" /><input type="password" value={llm.apiKey} onChange={event => llm.setApiKey(event.target.value)} placeholder="Provider API key" /></div>
    <button disabled={!text.trim() || !llm.apiKey || llm.busy} onClick={() => void llm.run(text).then(setOutput).catch(() => undefined)}>{llm.busy ? 'Running…' : 'Run with model'}</button>
    {llm.error && <div role="alert">{llm.error}</div>}
    {output && <pre>{output}</pre>}
  </section>;
}
