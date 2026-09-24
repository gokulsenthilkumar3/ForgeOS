'use client';

import { useEffect, useState } from 'react';
import { useLlm } from './use-llm';
import { parsePromptImport } from './prompt-import.mjs';

type Version = { text: string; createdAt: string };
type PromptMetadata = { description?: string; tags?: string[]; model?: string; collection?: string; favorite?: boolean; pinned?: boolean; rating?: number };
type Prompt = { id: string; name: string; versions: Version[]; metadata?: PromptMetadata; possibleDemo?: boolean };
type StoredRecord = { id: string; name: string; recordType: string; content: { versions?: Version[]; metadata?: PromptMetadata } };

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
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [collection, setCollection] = useState('');
  const [collections, setCollections] = useState<string[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState<Prompt[]>([]);
  const [importCollections, setImportCollections] = useState<Array<{ name: string; description: string }>>([]);
  const [backup, setBackup] = useState<unknown>(null);
  const llm = useLlm();
  const workspaceId = typeof window === 'undefined' ? '' : localStorage.getItem('forgeos-workspace-id') || '';
  const endpoint = `/api/v1/modules/promptvault/records?workspaceId=${encodeURIComponent(workspaceId)}`;

  async function refresh() {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load prompts (${response.status})`);
    const rows = await response.json() as StoredRecord[];
    setRecords(rows.filter(row => row.recordType === 'prompt' && Array.isArray(row.content?.versions)).map(row => ({
      id: row.id, name: row.name, versions: row.content.versions || [], metadata: row.content.metadata || {},
    })));
    setCollections(rows.filter(row => row.recordType === 'collection').map(row => row.name));
  }

  useEffect(() => {
    void refresh().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not load prompts'));
    const key = `forgeos-prompts-v1:${workspaceId || 'default'}`;
    try {
      const oldForge = JSON.parse(localStorage.getItem(key) || '[]') as unknown;
      const standalone = JSON.parse(localStorage.getItem('promptvault-prompts') || '{}') as unknown;
      const standaloneCollections = JSON.parse(localStorage.getItem('promptvault-collections') || '{}') as unknown;
      const first = parsePromptImport(oldForge);
      const second = parsePromptImport(standalone, standaloneCollections);
      setLegacy([...first.prompts, ...second.prompts].map(item => ({ ...item, id: crypto.randomUUID() })));
      setImportCollections(second.collections);
      setBackup({ oldForge, standalone, standaloneCollections });
    } catch { setLegacy([]); setImportCollections([]); }
  }, [workspaceId]);

  async function store(promptName: string, versions: Version[], metadata: PromptMetadata = {}) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recordType: 'prompt', name: promptName, content: { versions, metadata } }),
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
      const metadata = { ...(current?.metadata || {}), description, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), collection };
      const saved = await store(promptName, [...(current?.versions || []), { text, createdAt: new Date().toISOString() }], metadata);
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
    download('forgeos-promptvault-browser-backup.json', backup || legacy);
    setBusy(true); setError('');
    try {
      for (const item of importCollections.filter(item => !collections.includes(item.name))) {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recordType: 'collection', name: item.name, content: { description: item.description } }) });
        if (!response.ok) throw new Error(`Could not import collection ${item.name}`);
      }
      for (const prompt of newPrompts) await store(prompt.name, prompt.versions, prompt.metadata);
      await refresh();
      setLegacy([]);
    } catch (cause) {
      await refresh().catch(() => undefined);
      setError(cause instanceof Error ? cause.message : 'Import stopped. The browser copy remains unchanged.');
    } finally { setBusy(false); }
  }

  async function previewFiles(files: FileList | null) {
    if (!files?.length) return;
    if ([...files].some(file => file.size > 5_000_000)) { setError('Each import file must be under 5 MB.'); return; }
    try {
      const parsed = await Promise.all([...files].map(async file => JSON.parse(await file.text()) as unknown));
      const source = parsed.find(item => Array.isArray(item) || (item && typeof item === 'object' && ('prompts' in item || 'state' in item))) || parsed[0];
      const collectionSource = parsed.find(item => item && typeof item === 'object' && 'collections' in item) || parsed.find(item => item && typeof item === 'object' && 'state' in item && 'collections' in (item.state as object));
      const imported = parsePromptImport(source, collectionSource);
      if (!imported.prompts.length) throw new Error('No valid prompts found in the selected export.');
      setLegacy(imported.prompts.map(item => ({ ...item, id: crypto.randomUUID() })));
      setImportCollections(imported.collections);
      setBackup(parsed);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read import files'); }
  }

  const variableNames = [...new Set([...text.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1].trim()))].filter(Boolean);
  async function runPrompt() {
    const missing = variableNames.filter(variable => !variables[variable]?.trim());
    if (missing.length) { setError(`Fill in: ${missing.join(', ')}`); return; }
    const rendered = text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => variables[key.trim()] || '');
    setError('');
    try { setOutput(await llm.run(rendered)); }
    catch { setOutput(''); }
  }

  const current = records.find(record => record.id === selected);
  const importCount = legacy.filter(prompt => !records.some(record => record.name === prompt.name)).length;
  return <section className="tool-card">
    <h2>Prompt library</h2>
    <p>Prompts and versions are saved to the selected ForgeOS workspace.</p>
    {error && <div role="alert">{error}</div>}
    <label>Import PromptVault JSON export (prompts and optional collections)<input type="file" accept=".json,application/json" multiple onChange={event => void previewFiles(event.target.files)} /></label>
    {importCount > 0 && <div className="activity"><span>{importCount} prompt{importCount === 1 ? '' : 's'} ready to import; {legacy.filter(item => item.possibleDemo).length} match standalone demo titles. Review names before importing. Existing workspace prompts with the same name will be left unchanged.<br />{legacy.slice(0, 12).map(item => item.name).join(', ')}{legacy.length > 12 ? '…' : ''}</span><button disabled={busy} onClick={() => void importLegacy()}>Back up and import</button></div>}
    <label>Saved prompts<select value={selected} onChange={event => {
      const record = records.find(item => item.id === event.target.value);
      setSelected(record?.id || '');
      setName(record?.name || '');
      setText(record?.versions.at(-1)?.text || '');
      setDescription(record?.metadata?.description || '');
      setTags(record?.metadata?.tags?.join(', ') || '');
      setCollection(record?.metadata?.collection || '');
      setVariables({});
      setOutput('');
    }}><option value="">New prompt</option>{records.map(record => <option key={record.id} value={record.id}>{record.name}</option>)}</select></label>
    <label>Prompt name<input value={name} onChange={event => setName(event.target.value)} maxLength={100} readOnly={Boolean(selected)} /></label>
    <label>Description<input value={description} onChange={event => setDescription(event.target.value)} maxLength={1000} /></label>
    <label>Tags (comma-separated)<input value={tags} onChange={event => setTags(event.target.value)} /></label>
    <label>Collection<select value={collection} onChange={event => setCollection(event.target.value)}><option value="">None</option>{collections.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <label>Prompt text<textarea value={text} onChange={event => setText(event.target.value)} rows={10} /></label>
    <button disabled={busy || !name.trim() || !text.trim()} onClick={() => void save()}>{busy ? 'Saving…' : 'Save version'}</button>
    {current && <><h3>Version history</h3>{current.versions.map((version, index) => <div className="activity" key={index}><b>Version {index + 1}</b><span>{new Date(version.createdAt).toLocaleString()}</span><button onClick={() => setText(version.text)}>Load into editor</button></div>)}<button onClick={() => download(`forgeos-prompt-${current.name.replace(/[^a-z0-9-]/gi, '-')}.json`, current)}>Export prompt</button></>}
    <h3>Run prompt</h3>
    {variableNames.map(variable => <label key={variable}>{variable}<input value={variables[variable] || ''} onChange={event => setVariables(current => ({ ...current, [variable]: event.target.value }))} /></label>)}
    <div className="tool-row"><select value={llm.provider} onChange={event => {
      const provider = event.target.value as 'openai' | 'anthropic';
      llm.setProvider(provider);
      llm.setModel(provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-latest');
    }}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select><input value={llm.model} onChange={event => llm.setModel(event.target.value)} placeholder="Model" /><input type="password" value={llm.apiKey} onChange={event => llm.setApiKey(event.target.value)} placeholder="Provider API key" /></div>
    <button disabled={!text.trim() || !llm.apiKey || llm.busy} onClick={() => void runPrompt()}>{llm.busy ? 'Running…' : 'Run with model'}</button>
    {llm.error && <div role="alert">{llm.error}</div>}
    {output && <pre>{output}</pre>}
  </section>;
}
