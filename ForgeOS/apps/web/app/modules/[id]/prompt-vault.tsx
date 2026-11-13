'use client';

import { useEffect, useState } from 'react';
import { useLlm } from './use-llm';
import { parsePromptImport } from './prompt-import.mjs';
import { AiProviderFields } from './ai-provider-fields';
import { promptVariableNames, missingPromptVariables, renderPromptVariables } from './prompt-variables.mjs';

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
  const [loading, setLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');
  const [search, setSearch] = useState('');
  const [pane, setPane] = useState('editor');
  const [notice, setNotice] = useState('');
  const [lastRun, setLastRun] = useState<{ provider: string; model: string; prompt: string } | null>(null);
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
    setLibraryError('');
    setRecords(rows.filter(row => row.recordType === 'prompt' && Array.isArray(row.content?.versions)).map(row => ({
      id: row.id, name: row.name, versions: row.content.versions || [], metadata: row.content.metadata || {},
    })));
    setCollections(rows.filter(row => row.recordType === 'collection').map(row => row.name));
  }

  useEffect(() => {
    setLoading(true);
    void refresh().catch(cause => setLibraryError(cause instanceof Error ? cause.message : 'Could not load prompts')).finally(() => setLoading(false));
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
      setNotice('Version saved to this workspace.');
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

  const variableNames = promptVariableNames(text);
  async function runPrompt() {
    const missing = missingPromptVariables(variableNames, variables);
    if (missing.length) { setError(`Fill in: ${missing.join(', ')}`); return; }
    const rendered = renderPromptVariables(text, variables);
    setError('');
    try { setOutput(await llm.run(rendered)); setLastRun({ provider: llm.provider, model: llm.model, prompt: rendered }); }
    catch { setOutput(''); setLastRun(null); }
  }

  const current = records.find(record => record.id === selected);
  const importCount = legacy.filter(prompt => !records.some(record => record.name === prompt.name)).length;
  const visible = records.filter(record => (record.name+' '+(record.metadata?.description||'')+' '+(record.metadata?.tags||[]).join(' ')+' '+(record.metadata?.collection||'')).toLowerCase().includes(search.toLowerCase()));
  const rendered = renderPromptVariables(text, variables);
  const locked = busy || llm.busy;
  function choose(record?:Prompt) {
    const dirty = text !== (current?.versions.at(-1)?.text||'') || name !== (current?.name||'') || description !== (current?.metadata?.description||'') || tags !== (current?.metadata?.tags?.join(', ')||'') || collection !== (current?.metadata?.collection||'');
    if(dirty && !window.confirm('Switch prompts and discard unsaved editor changes?'))return;
    setSelected(record?.id||'');setName(record?.name||'');setText(record?.versions.at(-1)?.text||'');setDescription(record?.metadata?.description||'');setTags(record?.metadata?.tags?.join(', ')||'');setCollection(record?.metadata?.collection||'');setVariables({});setOutput('');setLastRun(null);setNotice('');setError('');setPane('editor');
  }
  async function reloadLibrary(){setLoading(true);try{await refresh();}catch(cause){setLibraryError(cause instanceof Error?cause.message:'Could not load prompts.');}finally{setLoading(false);}}
  async function copyOutput(){try{await navigator.clipboard.writeText(output);setNotice('Model response copied.');}catch{setError('Clipboard is unavailable. Select and copy the response text.');}}
  return <section className="ai-workbench prompt-workbench" data-pane={pane}><header className="ai-header"><div><span className="workbench-mode">PROMPTVAULT / VERSIONED WORKSPACE</span><h2>Keep the prompt. Keep its context.</h2><p>Write, version and run prompts with the saved history close to your editor.</p></div><div className="prompt-header-actions"><span className="ai-mode-chip">{loading?'Loading library':libraryError?'Library unavailable':records.length+' saved prompts'}</span><button className="ai-primary" disabled={locked} onClick={()=>choose()}>+ New prompt</button></div></header>{error&&<p className="ai-error" role="alert">{error}</p>}{notice&&<p className="ai-notice" role="status">{notice}</p>}<nav className="ai-mobile-panes" aria-label="PromptVault work areas">{[['library','Library'],['editor','Editor & versions'],['runner','Run & response']].map(([id,label])=><button key={id} aria-pressed={pane===id} onClick={()=>setPane(id)}>{label}</button>)}</nav>
  <div className="prompt-studio-layout"><aside className="prompt-library"><div className="ai-pane-heading"><span>WORKSPACE LIBRARY</span><button disabled={loading||locked} onClick={()=>void reloadLibrary()} aria-label="Refresh prompt library">Refresh</button></div><label className="prompt-library-search"><span className="sr-only">Search prompts</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a prompt or tag"/></label><div className="prompt-library-list">{loading?<p className="ai-small-note" role="status">Loading workspace prompts...</p>:libraryError?<p className="ai-error" role="alert">{libraryError}</p>:visible.length?visible.map(record=><button key={record.id} disabled={locked} aria-pressed={selected===record.id} onClick={()=>choose(record)}><strong>{record.name}</strong><small>{record.metadata?.collection||'Uncollected'} / {record.versions.length} versions</small>{record.metadata?.tags?.length?<span className="prompt-tags">{record.metadata.tags.slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</span>:null}</button>):<div className="prompt-library-empty"><strong>{records.length?'No matches':'A library ready for your work.'}</strong><p>{records.length?'Try another name, collection or tag.':'Create a prompt and save a version to begin.'}</p></div>}</div><details className="prompt-import"><summary>Import existing prompts</summary><p>Preview a PromptVault JSON export before importing. Existing names are left unchanged.</p><label>JSON exports<input type="file" accept=".json,application/json" multiple disabled={locked} onChange={event=>void previewFiles(event.target.files)}/></label>{importCount>0&&<div><strong>{importCount} prompts ready</strong><p>{legacy.filter(item=>item.possibleDemo).length} match standalone demo titles. Review before importing.</p><ul>{legacy.slice(0,12).map(item=><li key={item.id}>{item.name}</li>)}</ul><button disabled={locked} onClick={()=>void importLegacy()}>Back up and import</button></div>}</details></aside>
  <div className="prompt-editor-pane"><div className="prompt-document-header"><div><span className="workbench-mode">{current?'SAVED PROMPT':'NEW DRAFT'}</span><h3>{current?.name||'Untitled prompt'}</h3></div>{current&&<button disabled={locked} onClick={()=>download('forgeos-prompt-'+current.name.replace(/[^a-z0-9-]/gi,'-')+'.json',current)}>Export JSON</button>}</div><label htmlFor="prompt-name">Prompt name<input id="prompt-name" disabled={locked} value={name} onChange={e=>{setName(e.target.value);setNotice('');}} maxLength={100} readOnly={Boolean(selected)} placeholder="Name this prompt"/></label><details className="prompt-metadata"><summary>Description, collection & tags</summary><label htmlFor="prompt-description">Description<input id="prompt-description" disabled={locked} value={description} maxLength={1000} onChange={e=>setDescription(e.target.value)}/></label><div className="prompt-meta-grid"><label htmlFor="prompt-tags">Tags, comma-separated<input id="prompt-tags" disabled={locked} value={tags} onChange={e=>setTags(e.target.value)}/></label><label htmlFor="prompt-collection">Collection<select id="prompt-collection" disabled={locked} value={collection} onChange={e=>setCollection(e.target.value)}><option value="">None</option>{collections.map(item=><option key={item}>{item}</option>)}</select></label></div></details><div className="ai-editor-caption"><label htmlFor="prompt-text">Prompt source</label><span>{text.length.toLocaleString()} characters / {variableNames.length} variables</span></div><textarea id="prompt-text" className="ai-code-editor" value={text} disabled={locked} onChange={e=>{setText(e.target.value);setNotice('');}} maxLength={20000} rows={18} spellCheck={false} placeholder="Write a prompt. Use double-brace variables for reusable inputs."/><div className="prompt-save-bar"><p>Saving appends a version. Loading older text changes only the editor until you save.</p><button className="ai-primary" disabled={locked||!name.trim()||!text.trim()} onClick={()=>void save()}>{busy?'Saving...':'Save version'}</button></div><section className="prompt-history"><div className="ai-section-heading"><h3>Version history</h3><span>{current?current.versions.length+' saved versions':'No saved versions'}</span></div>{current?.versions.length?<div>{current.versions.map((version,index)=>({version,index})).reverse().map(({version,index})=><article key={index}><span className="prompt-version-marker">v{index+1}</span><div><strong>{new Date(version.createdAt).toLocaleString()}</strong><small>{version.text.length.toLocaleString()} characters</small></div><button disabled={locked} onClick={()=>{if(text!==(current.versions.at(-1)?.text||'')&&!window.confirm('Replace unsaved editor text with this version?'))return;setText(version.text);setVariables({});setOutput('');setLastRun(null);setNotice('Version '+(index+1)+' loaded into the editor. Save to append a new version.');}}>Load text</button></article>)}</div>:<p className="ai-small-note">Save your first version to start a reviewable history.</p>}</section></div>
  <aside className="prompt-runner-pane"><span className="workbench-mode">EXPLICIT MODEL REQUEST</span><h3>Run this prompt</h3>{variableNames.length?<fieldset className="prompt-variables" disabled={locked}><legend>Variable values</legend>{variableNames.map((variable,index)=><label key={variable} htmlFor={'prompt-variable-'+index}>{variable}<input id={'prompt-variable-'+index} value={Object.prototype.hasOwnProperty.call(variables,variable)&&typeof variables[variable]==='string'?variables[variable]:''} onChange={e=>setVariables(current=>({...current,[variable]:e.target.value}))}/></label>)}</fieldset>:<p className="ai-small-note">Reusable variables appear here when you add double-brace placeholders to your prompt.</p>}<AiProviderFields llm={llm} prefix="prompt" disabled={locked}/><details className="prompt-request-preview"><summary>Inspect request text</summary><p className="ai-small-note">{rendered.length.toLocaleString()} / 20,000 characters</p><pre>{rendered||'Write a prompt to preview the request.'}</pre></details><button className="ai-primary" disabled={locked||!text.trim()||!llm.apiKey||!llm.model.trim()||rendered.length>20000||missingPromptVariables(variableNames,variables).length>0} onClick={()=>{setPane('runner');void runPrompt();}}>{llm.busy?'Waiting for model...':'Run with model'}</button>{llm.error&&<p className="ai-error" role="alert">{llm.error}</p>}<section className="prompt-model-output" aria-live="polite"><div className="ai-section-heading"><h4>Last model response</h4>{lastRun&&<button onClick={()=>void copyOutput()} disabled={locked}>Copy</button>}</div>{llm.busy?<p role="status" className="ai-small-note">The selected provider is processing your request.</p>:lastRun?<><p className="ai-small-note">{lastRun.provider} / {lastRun.model}</p><pre>{output||'(empty response)'}</pre><details><summary>Request used for this response</summary><pre>{lastRun.prompt}</pre></details></>:<p className="ai-small-note">No model response yet. Saving a prompt does not send it to a provider.</p>}</section></aside></div></section>;
}
