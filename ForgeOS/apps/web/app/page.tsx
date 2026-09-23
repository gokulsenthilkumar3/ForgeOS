'use client';

import { useEffect, useMemo, useState } from 'react';
import { modules, type AuditEvent, type ModuleId, type Project, type Run, type Workspace } from '@forgeos/contracts';

type Overview = { workspace: Workspace; projects: Project[]; runs: Run[]; audit: AuditEvent[] };

export default function Home() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [name, setName] = useState('');
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([]);
  const enabledIds = overview?.workspace.moduleIds ?? modules.map(module => module.id);
  const enabledModules = modules.filter(module => enabledIds.includes(module.id));
  const filtered = useMemo(() => enabledModules.filter(module => `${module.name} ${module.category} ${module.description}`.toLowerCase().includes(query.toLowerCase())), [query, overview]);

  async function refresh(id = workspaceId) {
    try {
      const response = await fetch(`/api/v1/overview${id ? `?workspaceId=${encodeURIComponent(id)}` : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      setOverview(await response.json());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load workspace');
    }
  }

  useEffect(() => {
    void fetch('/api/v1/workspaces').then(response => response.ok ? response.json() : []).then(setWorkspaces);
    const stored = localStorage.getItem('forgeos-workspace-id') || '';
    setWorkspaceId(stored);
    void refresh(stored);
  }, []);
  async function createWorkspace() {
    const value = window.prompt('Workspace name');
    if (!value?.trim()) return;
    const response = await fetch('/api/v1/workspaces', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: value.trim() }) });
    if (!response.ok) { setError(`Workspace creation failed (${response.status})`); return; }
    const created = await response.json() as Workspace;
    setWorkspaces(current => [...current, created]); setWorkspaceId(created.id); localStorage.setItem('forgeos-workspace-id', created.id); await refresh(created.id);
  }
  async function toggleModule(moduleId: ModuleId) {
    if (!overview) return;
    const current = overview.workspace.moduleIds;
    const moduleIds = current.includes(moduleId) ? current.filter(id => id !== moduleId) : modules.map(module => module.id).filter(id => current.includes(id) || id === moduleId);
    const response = await fetch(`/api/v1/workspaces/${overview.workspace.id}/modules`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ moduleIds }),
    });
    if (!response.ok) { setError(`Module settings could not be saved (${response.status})`); return; }
    const workspace = await response.json() as Workspace;
    setOverview(previous => previous ? { ...previous, workspace } : previous);
    setWorkspaces(previous => previous.map(item => item.id === workspace.id ? workspace : item));
    setSelectedModules(previous => previous.filter(id => moduleIds.includes(id)));
    setError('');
  }
  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/v1/projects${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), moduleIds: selectedModules }),
    });
    if (!response.ok) { setError(`Project creation failed (${response.status})`); return; }
    setCreating(false); setName(''); setSelectedModules([]); await refresh();
  }

  const runs = overview?.runs ?? [];
  const passed = runs.filter(run => run.status === 'passed').length;
  const open = runs.filter(run => run.status === 'queued' || run.status === 'running').length;
  return <main className="shell">
    <aside>
      <a href="/" className="brand"><span>F</span> ForgeOS</a>
      <div className="workspace"><select aria-label="Workspace" value={workspaceId || overview?.workspace.id || ''} onChange={event => { setWorkspaceId(event.target.value); localStorage.setItem('forgeos-workspace-id', event.target.value); void refresh(event.target.value); }}><option value="" disabled>Workspace</option>{workspaces.map(workspace => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select><small>{overview?.workspace.plan ?? 'Connecting…'}</small><button onClick={() => void createWorkspace()}>+ Add workspace</button></div>
      <nav><a className="active" href="/">Overview</a><a href="#projects">Projects</a><a href="#activity">Activity</a></nav>
      <div className="nav-label">MODULES</div>
      {['Delivery', 'Quality', 'AI', 'Operations', 'Assets', 'Security'].map(group => <section key={group}>
        <div className="group">{group}</div>
        {enabledModules.filter(module => module.category === group).map(module => <a key={module.id} href={`/modules/${module.id}`}>{module.name}</a>)}
      </section>)}
    </aside>
    <section className="content">
      <header><div><p>WORKSPACE / OVERVIEW</p><h1>{overview?.workspace.name ?? 'ForgeOS'}</h1><span>One address for your projects, tools, and operations.</span></div>
        <div className="actions"><button onClick={() => document.getElementById('module-search')?.focus()}>⌕ Search</button><button onClick={() => setConfiguring(true)}>Customize modules</button><button className="primary" onClick={() => setCreating(true)}>+ New project</button><button onClick={() => void fetch('/api/session', { method: 'DELETE' }).then(() => window.location.assign('/login'))}>Sign out</button></div>
      </header>
      {error && <div className="notice error" role="alert">Could not connect to the ForgeOS API: {error}. Start the API service and refresh.</div>}
      <div className="metrics">
        <Metric label="Projects" value={overview ? String(overview.projects.length) : '—'} />
        <Metric label="Runs" value={overview ? String(runs.length) : '—'} />
        <Metric label="Passed" value={overview ? String(passed) : '—'} />
        <Metric label="In progress" value={overview ? String(open) : '—'} />
      </div>
      <div className="grid"><article className="modules"><div className="title"><div><p>WORKBENCH</p><h2>All modules</h2></div><input id="module-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a module…" /></div>
        <div className="module-grid">{filtered.map(module => <a className="module" href={`/modules/${module.id}`} key={module.id}><b>{module.name.slice(0, 2).toUpperCase()}</b><span><strong>{module.name}</strong><small>{module.description}</small></span><em>Open →</em></a>)}</div></article>
        <article className="selected-card" id="projects"><p>WORKSPACE PROJECTS</p><h2>Projects</h2>
          {overview?.projects.length ? overview.projects.map(project => <div className="activity" key={project.id}><b>{project.name}</b><span>{project.moduleIds.length} modules</span></div>) : <div className="empty">No projects yet. Create one to organize runs and artifacts.</div>}
        </article></div>
      <div className="grid bottom-grid"><article id="activity"><div className="title"><div><p>LIVE</p><h2>Activity</h2></div><button onClick={() => void refresh()}>Refresh</button></div>
        {overview?.audit.length ? [...overview.audit].reverse().map(event => <div className="activity" key={event.id}><b>{event.action}</b><span>{event.target}</span><time>{new Date(event.createdAt).toLocaleString()}</time></div>) : <div className="empty">No activity recorded yet.</div>}</article>
        <article><div className="title"><div><p>RECENT</p><h2>Runs</h2></div></div>
          {runs.length ? [...runs].reverse().slice(0, 6).map(run => <div className="activity" key={run.id}><b>{modules.find(module => module.id === run.moduleId)?.name}</b><span>{run.status}</span></div>) : <div className="empty">No module runs yet.</div>}</article></div>
    </section>
    {creating && <div className="modal" onClick={() => setCreating(false)}><form onClick={event => event.stopPropagation()} onSubmit={event => void createProject(event)}><h2>New project</h2><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Project name" required />
      <div className="checks">{enabledModules.map(module => <label key={module.id}><input type="checkbox" checked={selectedModules.includes(module.id)} onChange={event => setSelectedModules(current => event.target.checked ? [...current, module.id] : current.filter(id => id !== module.id))} /> {module.name}</label>)}</div>
      <button className="primary" type="submit">Create project</button><button type="button" onClick={() => setCreating(false)}>Cancel</button></form></div>}
    {configuring && <div className="modal" onClick={() => setConfiguring(false)}><div className="module-settings" onClick={event => event.stopPropagation()}><h2>Customize modules</h2><p>Choose which tools are available in {overview?.workspace.name}. Changes are saved for this workspace.</p>
      <div className="checks">{modules.map(module => <label key={module.id}><input type="checkbox" checked={enabledIds.includes(module.id)} onChange={() => void toggleModule(module.id)} /> {module.name}</label>)}</div>
      <button onClick={() => setConfiguring(false)}>Done</button></div></div>}
  </main>;
}
function Metric({ label, value }: { label: string; value: string }) { return <article className="metric"><p>{label}</p><strong>{value}</strong></article>; }
