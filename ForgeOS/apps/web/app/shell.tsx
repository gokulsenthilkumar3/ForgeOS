'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { modules, type AuditEvent, type ModuleId, type Project, type Run, type Workspace } from '@forgeos/contracts';
import { ModuleGate } from './modules/[id]/module-gate';

type Overview = { workspace: Workspace; projects: Project[]; runs: Run[]; audit: AuditEvent[] };
type Dialog = 'workspace' | 'project' | 'modules' | null;
const groups = ['Delivery', 'Quality', 'AI', 'Operations', 'Assets', 'Security'];

function useOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async (id?: string) => {
    setLoading(true);
    setError('');
    setOverview(previous => previous?.workspace.id === id ? previous : null);
    try {
      const response = await fetch(`/api/v1/overview${id ? `?workspaceId=${encodeURIComponent(id)}` : ''}`, { cache: 'no-store' });
      if (!response.ok) {
        if (id && response.status === 404) { localStorage.removeItem('forgeos-workspace-id'); await refresh(); return; }
        throw new Error(`Workspace request failed (${response.status})`);
      }
      const data = await response.json() as Overview;
      setOverview(data); setWorkspaceId(data.workspace.id); setError('');
      localStorage.setItem('forgeos-workspace-id', data.workspace.id);
    } catch (cause) { setOverview(null); setError(cause instanceof Error ? cause.message : 'Workspace unavailable'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const stored = localStorage.getItem('forgeos-workspace-id') || undefined;
    void refresh(stored);
    void fetch('/api/v1/workspaces').then(response => {
      if (!response.ok) throw new Error(`Workspace list request failed (${response.status})`);
      return response.json();
    }).then((items: Workspace[]) => setWorkspaces(items)).catch(() => setError('Workspace list unavailable'));
  }, [refresh]);
  return { overview, setOverview, workspaces, setWorkspaces, workspaceId, loading, error, setError, refresh };
}

export function ConsoleShell({ moduleId }: { moduleId?: ModuleId }) {
  const data = useOverview();
  const { overview, setOverview, workspaces, setWorkspaces, workspaceId, loading, error, setError, refresh } = data;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([]);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentModule = modules.find(item => item.id === moduleId);
  const enabledIds = overview?.workspace.moduleIds ?? [];
  const enabledModules = modules.filter(item => enabledIds.includes(item.id));
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return [
      ...enabledModules.filter(item => `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(term)).map(item => ({ label: item.name, meta: item.category, href: `/modules/${item.id}` })),
      ...(overview?.projects ?? []).filter(item => item.name.toLowerCase().includes(term)).map(item => ({ label: item.name, meta: 'Project', href: '/#projects' })),
      ...(overview?.audit ?? []).filter(item => `${item.action} ${item.target}`.toLowerCase().includes(term)).slice(0, 5).map(item => ({ label: item.action, meta: item.target, href: '/#activity' })),
    ].slice(0, 12);
  }, [query, enabledModules, overview]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette(value => !value); }
      if (event.key === 'Escape') { setPalette(false); setDialog(null); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (palette) searchRef.current?.focus(); }, [palette]);

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault(); if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch('/api/v1/workspaces', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
      if (!response.ok) throw new Error(`Workspace creation failed (${response.status})`);
      const workspace = await response.json() as Workspace;
      setWorkspaces(items => [...items, workspace]); setDialog(null); setName(''); await refresh(workspace.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create workspace'); }
    finally { setBusy(false); }
  }
  async function createProject(event: React.FormEvent) {
    event.preventDefault(); if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/projects?workspaceId=${encodeURIComponent(workspaceId)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.trim(), moduleIds: selectedModules }) });
      if (!response.ok) throw new Error(`Project creation failed (${response.status})`);
      setDialog(null); setName(''); setSelectedModules([]); await refresh(workspaceId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create project'); }
    finally { setBusy(false); }
  }
  async function toggleModule(id: ModuleId) {
    if (!overview || busy) return;
    const moduleIds = enabledIds.includes(id) ? enabledIds.filter(item => item !== id) : modules.map(item => item.id).filter(item => enabledIds.includes(item) || item === id);
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/workspaces/${workspaceId}/modules`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ moduleIds }) });
      if (!response.ok) throw new Error(`Module settings failed (${response.status})`);
      const workspace = await response.json() as Workspace;
      setOverview(previous => previous ? { ...previous, workspace } : previous);
      setWorkspaces(items => items.map(item => item.id === workspace.id ? workspace : item)); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save module settings'); }
    finally { setBusy(false); }
  }
  function openDialog(value: Dialog) { setName(''); setSelectedModules([]); setError(''); setDialog(value); }

  return <div className="console-shell">
    <aside className="console-sidebar" aria-label="Main navigation">
      <a className="console-brand" href="/"><span className="brand-mark">F</span><span>ForgeOS<small>ENGINEERING CONSOLE</small></span></a>
      <div className="workspace-switcher"><label htmlFor="workspace-select">WORKSPACE</label><select id="workspace-select" value={workspaceId} onChange={event => void refresh(event.target.value)}>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button onClick={() => openDialog('workspace')}>+ Create workspace</button></div>
      <nav className="primary-nav"><a className={!moduleId ? 'current' : ''} href="/">Overview</a><a href="/#projects">Projects</a><a href="/#activity">Activity</a></nav>
      <div className="sidebar-divider">TOOLS <span>{loading && !overview ? '…' : enabledModules.length}</span></div>
      <nav className="module-nav" aria-label="Enabled tools">{loading && !overview ? <p className="nav-message" role="status">Loading workspace tools…</p> : error && !overview ? <p className="nav-message" role="alert">Tools unavailable. Check the workspace connection and retry.</p> : !enabledModules.length ? <p className="nav-message">No tools enabled in this workspace. Use Manage modules to turn them on.</p> : groups.map(group => { const items = enabledModules.filter(item => item.category === group); return items.length ? <div className="nav-group" key={group}><p>{group}</p>{items.map(item => <a key={item.id} className={moduleId === item.id ? 'current' : ''} href={`/modules/${item.id}`}>{item.name}</a>)}</div> : null; })}</nav>
      <div className="sidebar-footer"><button onClick={() => openDialog('modules')}>Manage modules</button><span>{overview?.workspace.plan ?? 'Connecting'}</span></div>
    </aside>
    <div className="console-main"><div className="console-topbar"><div className="breadcrumb"><a href="/">ForgeOS</a><span>/</span><span>{currentModule?.name ?? 'Overview'}</span></div><div className="topbar-actions"><button className="search-trigger" onClick={() => setPalette(true)} aria-keyshortcuts="Control+K Meta+K"><span>Search tools, projects, activity</span><kbd>Ctrl K</kbd></button><button className="text-button" onClick={() => void refresh(workspaceId)} disabled={loading}>Refresh</button><button className="text-button" onClick={() => void fetch('/api/session', { method: 'DELETE' }).then(() => window.location.assign('/login'))}>Sign out</button></div></div>
      <main className="console-content">{error && <div className="inline-error" role="alert">{error}<button onClick={() => void refresh(workspaceId)}>Retry</button></div>}
        {currentModule ? <><div className="page-heading"><div><p className="eyebrow">{currentModule.category} / TOOL</p><h1>{currentModule.name}</h1><p className="page-subtitle">{currentModule.description}</p></div><a className="quiet-link" href="/">All tools</a></div><div className="workbench-panel"><ModuleGate key={workspaceId} id={currentModule.id} /></div></> : <Dashboard overview={overview} loading={loading} enabledModules={enabledModules} onCreateProject={() => openDialog('project')} onManage={() => openDialog('modules')} onSearch={() => setPalette(true)} />}
      </main>
    </div>
    {palette && <div className="overlay" onMouseDown={() => setPalette(false)}><div className="command-dialog" role="dialog" aria-modal="true" aria-label="Search ForgeOS" onMouseDown={event => event.stopPropagation()}><div className="command-input"><span>⌕</span><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tools, projects, and activity" aria-label="Search ForgeOS" /><kbd>Esc</kbd></div><div className="command-results">{!query.trim() ? <p>Search this workspace. Press Ctrl+K to open from anywhere.</p> : results.length ? results.map((item, index) => <a key={`${item.href}-${index}`} href={item.href}><span>{item.label}</span><small>{item.meta}</small></a>) : <p>No matching items in this workspace.</p>}</div></div></div>}
    {dialog && <div className="overlay" onMouseDown={() => setDialog(null)}><div className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={event => event.stopPropagation()}><div className="dialog-heading"><h2 id="dialog-title">{dialog === 'workspace' ? 'Create workspace' : dialog === 'project' ? 'New project' : 'Manage modules'}</h2><button aria-label="Close dialog" onClick={() => setDialog(null)}>×</button></div>{error && <div className="inline-error" role="alert">{error}</div>}{dialog === 'modules' ? <><p>Choose which tools are available in {overview?.workspace.name}. Changes apply immediately.</p><div className="module-toggles">{modules.map(item => <label key={item.id}><span><strong>{item.name}</strong><small>{item.category}</small></span><input type="checkbox" checked={enabledIds.includes(item.id)} disabled={busy} onChange={() => void toggleModule(item.id)} /></label>)}</div><div className="dialog-actions"><button className="button-primary" onClick={() => setDialog(null)}>Done</button></div></> : <form onSubmit={event => void (dialog === 'workspace' ? createWorkspace(event) : createProject(event))}><label className="field-label" htmlFor="entity-name">{dialog === 'workspace' ? 'Workspace name' : 'Project name'}</label><input id="entity-name" autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder={dialog === 'workspace' ? 'Engineering team' : 'My project'} />{dialog === 'project' && <fieldset><legend>Tools for this project</legend><div className="module-choices">{enabledModules.map(item => <label key={item.id}><input type="checkbox" checked={selectedModules.includes(item.id)} onChange={event => setSelectedModules(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />{item.name}</label>)}</div></fieldset>}<div className="dialog-actions"><button type="button" onClick={() => setDialog(null)}>Cancel</button><button className="button-primary" disabled={busy || !name.trim()} type="submit">{busy ? 'Saving…' : 'Create'}</button></div></form>}</div></div>}
  </div>;
}

function Dashboard({ overview, loading, enabledModules, onCreateProject, onManage, onSearch }: { overview: Overview | null; loading: boolean; enabledModules: typeof modules; onCreateProject: () => void; onManage: () => void; onSearch: () => void }) {
  const projects = overview?.projects ?? [];
  const runs = overview?.runs ?? [];
  const audit = overview?.audit ?? [];
  return <><div className="page-heading overview-heading"><div><p className="eyebrow">WORKSPACE OVERVIEW</p><h1>{overview?.workspace.name ?? 'ForgeOS'}</h1><p className="page-subtitle">Your projects, tools, and recent work in one place.</p></div><button className="button-primary" onClick={onCreateProject}>+ New project</button></div>
    <div className="summary-strip" aria-label="Workspace summary"><div><span>Projects</span><strong>{loading ? '…' : projects.length}</strong></div><div><span>Enabled tools</span><strong>{loading ? '…' : enabledModules.length}</strong></div><div><span>Runs</span><strong>{loading ? '…' : runs.length}</strong></div><div><span>Needs attention</span><strong>{loading ? '…' : runs.filter(item => item.status === 'failed').length}</strong></div></div>
    <div className="dashboard-layout"><section className="dashboard-primary"><div className="section-heading" id="projects"><div><p className="eyebrow">WORK</p><h2>Projects</h2></div><button onClick={onCreateProject}>New project</button></div>{loading ? <p className="empty-state">Loading projects…</p> : projects.length ? <div className="data-list">{projects.map(project => <div className="data-row" key={project.id}><span className="row-symbol">{project.name.slice(0, 1).toUpperCase()}</span><div><strong>{project.name}</strong><small>{project.moduleIds.length} tools enabled</small></div><span className="row-time">{new Date(project.createdAt).toLocaleDateString()}</span></div>)}</div> : <div className="empty-state"><strong>No projects yet</strong><p>Create a project to organize tools and runs.</p><button onClick={onCreateProject}>Create your first project</button></div>}
      <div className="section-heading tools-heading"><div><p className="eyebrow">WORKBENCH</p><h2>Tools</h2></div><button onClick={onManage}>Manage tools</button></div><div className="tool-list">{enabledModules.map(item => <a href={`/modules/${item.id}`} key={item.id}><span className="tool-initial">{item.name.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.description}</small></span><em>{item.category}</em><b aria-hidden="true">→</b></a>)}</div>{!enabledModules.length && <div className="empty-state">All tools are disabled. <button onClick={onManage}>Manage tools</button></div>}</section>
      <aside className="dashboard-secondary"><div className="section-heading" id="activity"><div><p className="eyebrow">LATEST</p><h2>Activity</h2></div><button onClick={onSearch}>Search</button></div>{audit.length ? <div className="timeline">{audit.slice(0, 8).map(event => <div key={event.id}><strong>{event.action.replaceAll('.', ' ')}</strong><small>{event.target}</small><time>{new Date(event.createdAt).toLocaleString()}</time></div>)}</div> : <p className="empty-state">No workspace activity yet.</p>}<div className="section-heading runs-heading"><div><p className="eyebrow">EXECUTION</p><h2>Recent runs</h2></div></div>{runs.length ? <div className="run-list">{runs.slice(0, 6).map(run => <div key={run.id}><span>{modules.find(item => item.id === run.moduleId)?.name ?? run.moduleId}</span><strong className={`run-status ${run.status}`}>{run.status}</strong></div>)}</div> : <p className="empty-state">No runs recorded yet.</p>}</aside></div>
  </>;
}
