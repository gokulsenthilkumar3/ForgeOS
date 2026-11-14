'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { modules, type AuditEvent, type ModuleId, type Project, type Run, type Workspace } from '@forgeos/contracts';
import { ModuleGate } from './modules/[id]/module-gate';
import { AgentAccessPanel } from './agent-access';
import dynamic from 'next/dynamic';
import { CdnPanel } from './security-products';
import type { HelpTab } from './help-center';
const HelpCenter = dynamic(() => import('./help-center').then(m => m.HelpCenter), { loading: () => <p role="status">Loading help...</p> });
const AccountPanel = dynamic(() => import('./account-panels').then(m => m.AccountPanel), { loading: () => <p role="status">Loading account...</p> });
const ToolDashboards = dynamic(() => import('./tool-dashboards').then(m => m.ToolDashboards), { loading: () => <p role="status">Loading tool dashboards...</p> });
const ActivityPanel = dynamic(() => import('./account-panels').then(m => m.ActivityPanel), { loading: () => <p role="status">Loading activity...</p> });

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

export function ConsoleShell({ moduleId, section, helpTab, dashboardId }: { moduleId?: ModuleId; section?: 'agents'|'help'|'profile'|'sessions'|'activity'|'cdn'|'dashboards'; helpTab?: HelpTab; dashboardId?: ModuleId }) {
  const data = useOverview();
  const { overview, setOverview, workspaces, setWorkspaces, workspaceId, loading, error, setError, refresh } = data;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [palette, setPalette] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([]);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDetailsElement>(null);
  const sectionName = section ? { agents: 'Automation access', help: 'Help center', profile: 'Profile', sessions: 'Current session', activity: 'Activity log', cdn: 'Managed CDN', dashboards: 'Dashboards' }[section] : 'Overview';
  const currentModule = modules.find(item => item.id === moduleId);
  const dashboardModule = modules.find(item => item.id === dashboardId);
  const pageLabel = section === 'dashboards' && dashboardModule ? dashboardModule.name + ' dashboard' : currentModule?.name ?? sectionName;
  const enabledIds = overview?.workspace.moduleIds ?? [];
  const enabledModules = modules.filter(item => enabledIds.includes(item.id));
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return [
      ...[{label:'Tool dashboards',meta:'Dashboard hub',href:'/dashboards'},{label:'Managed CDN',meta:'Separate project / planning',href:'/cdn'},{label:'Help center',meta:'Guides',href:'/help'},{label:'Getting started tutorial',meta:'Learn',href:'/tutorial'},{label:'Help desk',meta:'Support tickets',href:'/help/desk'},{label:'Competitors and UI links',meta:'Research',href:'/help/competitors'},{label:'Profile',meta:'Account',href:'/settings/profile'},{label:'Current session',meta:'Account',href:'/settings/sessions'},{label:'Activity log',meta:'Audit',href:'/activity'}].filter(item=>`${item.label} ${item.meta}`.toLowerCase().includes(term)),
      ...enabledModules.filter(item => `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(term)).map(item => ({ label: item.name, meta: item.category, href: `/modules/${item.id}` })),
      ...(overview?.projects ?? []).filter(item => item.name.toLowerCase().includes(term)).map(item => ({ label: item.name, meta: 'Project', href: '/#projects' })),
      ...(overview?.audit ?? []).filter(item => `${item.action} ${item.target}`.toLowerCase().includes(term)).slice(0, 5).map(item => ({ label: item.action, meta: item.target, href: '/#activity' })),
    ].slice(0, 12);
  }, [query, enabledModules, overview]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette(value => !value); }
      if (event.key === 'Escape') { setPalette(false); setDialog(null); setNavigationOpen(false); if (accountRef.current?.open) { accountRef.current.open = false; accountRef.current.querySelector('summary')?.focus(); } if (document.activeElement?.closest('#workspace-navigation')) menuRef.current?.focus(); }
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

  return <div className="console-shell console-redesign navigation-redesign" data-navigation-open={navigationOpen}>
    <a className="navigation-skip" href="#workspace-content">Skip to content</a>
    <aside id="workspace-navigation" className="console-sidebar" aria-label="Main navigation">
      <a className="console-brand" href="/"><span className="brand-mark">F</span><span>ForgeOS<small>ENGINEERING WORKBENCH</small></span></a>
      <div className="workspace-switcher"><span className="workspace-avatar" aria-hidden="true">{overview?.workspace.name.slice(0, 1).toUpperCase() ?? 'W'}</span><div><label htmlFor="workspace-select">WORKSPACE</label><select id="workspace-select" value={workspaceId} disabled={loading || !workspaces.length} onChange={event => void refresh(event.target.value)}>{!workspaces.length && <option value="">{loading ? 'Loading...' : 'Unavailable'}</option>}{workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><button className="workspace-create" aria-label="Create workspace" title="Create workspace" onClick={() => openDialog('workspace')}>+</button></div>
      <button className="sidebar-search" onClick={() => setPalette(true)}><NavIcon kind="search"/><span>Quick search</span><kbd>Ctrl K</kbd></button>
      <div className="navigation-scroll"><div className="nav-section-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Workspace pages">{[{href:'/',label:'Overview',icon:'overview',active:!moduleId && !section},{href:'/dashboards',label:'Dashboards',icon:'overview',active:section==='dashboards'},{href:'/#projects',label:'Projects',icon:'projects',active:false},{href:'/activity',label:'Activity log',icon:'activity',active:section==='activity'},{href:'/settings/agents',label:'Automation access',icon:'shield',active:section==='agents'}].map(item => <a key={item.href} className={item.active ? 'current' : ''} aria-current={item.active ? 'page' : undefined} href={item.href}><NavIcon kind={item.icon}/><span>{item.label}</span>{item.active && <span className="nav-active-mark" aria-hidden="true"/>}</a>)}</nav>
        <div className="sidebar-divider">WORKBENCHES <span>{loading && !overview ? '...' : overview ? enabledModules.length : '-'}</span><button onClick={() => openDialog('modules')} disabled={!overview} aria-label="Manage workbenches" title="Manage workbenches"><NavIcon kind="settings"/></button></div>
        <nav className="module-nav" aria-label="Enabled tools">{loading && !overview ? <p className="nav-message" role="status">Loading workspace tools...</p> : error && !overview ? <p className="nav-message" role="alert">Tools unavailable. Retry the workspace connection.</p> : !enabledModules.length ? <p className="nav-message">No tools enabled. Use Manage workbenches to turn them on.</p> : groups.map(group => { const items = enabledModules.filter(item => item.category === group); return items.length ? <details className="nav-tool-group" key={group} open><summary>{group}<span>{items.length}</span></summary>{items.map(item => <a key={item.id} className={moduleId === item.id ? 'current' : ''} aria-current={moduleId === item.id ? 'page' : undefined} href={'/modules/'+item.id}><span className="nav-tool-symbol" aria-hidden="true">{item.name.slice(0,2)}</span><span>{item.name}</span>{moduleId === item.id && <span className="nav-active-mark" aria-hidden="true"/>}</a>)}</details> : null; })}</nav>
      </div>
      <div className="navigation-support"><a href="/cdn" aria-current={section==='cdn'?'page':undefined} className={section==='cdn'?'current':''}><NavIcon kind="projects"/><span>Managed CDN <small className="cdn-planning-label">PLANNING</small></span></a><a className={section === 'help' ? 'current' : ''} aria-current={section === 'help' ? 'page' : undefined} href="/help"><NavIcon kind="help"/><span>Help &amp; tutorial</span></a><a href="/help/desk"><NavIcon kind="support"/><span>Help desk</span></a></div>
      <div className="sidebar-footer"><a href="/settings/profile"><span className="sidebar-account-avatar" aria-hidden="true"><NavIcon kind="profile"/></span><span>Workspace account<small>{(overview?.workspace as Workspace & { role?: string } | undefined)?.role ?? (loading ? 'Loading access...' : 'Access unavailable')}</small></span><span aria-hidden="true">&#8250;</span></a></div>
    </aside>
    <div className="console-main"><header className="console-topbar"><div className="topbar-location"><button ref={menuRef} className="navigation-toggle" aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'} aria-controls="workspace-navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen(value => !value)}><NavIcon kind={navigationOpen ? 'close' : 'menu'}/></button><nav className="breadcrumb" aria-label="Breadcrumb"><a href="/"><NavIcon kind="overview"/><span>Workspace</span></a><span aria-hidden="true">/</span><strong aria-current="page">{pageLabel}</strong></nav>{currentModule && <span className="topbar-category">{currentModule.category}</span>}</div><div className="topbar-actions"><button className="search-trigger" aria-label="Search workspace" onClick={() => setPalette(true)} aria-keyshortcuts="Control+K Meta+K"><NavIcon kind="search"/><span>Search your workspace</span><kbd>Ctrl K</kbd></button><button className="topbar-icon-button" aria-label="Refresh workspace" title="Refresh workspace" onClick={() => void refresh(workspaceId)} disabled={loading}><NavIcon kind="refresh"/></button><details ref={accountRef} className="topbar-account"><summary aria-label="Account menu"><NavIcon kind="profile"/><span>Account</span><span aria-hidden="true">&#8250;</span></summary><nav aria-label="Account actions"><a href="/settings/profile"><NavIcon kind="profile"/>Profile &amp; access</a><a href="/settings/sessions"><NavIcon kind="shield"/>Current session</a><a href="/help"><NavIcon kind="help"/>Help center</a><button onClick={() => void fetch('/api/session', { method: 'DELETE' }).then(() => window.location.assign('/login'))}><NavIcon kind="logout"/>Sign out</button></nav></details></div></header>
      <main id="workspace-content" tabIndex={-1} className="console-content">{error && <div className="inline-error" role="alert">{error}<button onClick={() => void refresh(workspaceId)}>Retry</button></div>}
        {section === 'dashboards' ? <ToolDashboards key={workspaceId+':'+(dashboardId||'hub')} workspace={overview?.workspace} projects={overview?.projects||[]} runs={overview?.runs||[]} loading={loading} moduleId={dashboardId} onManage={()=>openDialog('modules')} onRefresh={()=>void refresh(workspaceId)}/> : section === 'cdn' ? <CdnPanel/> : section === 'help' ? <HelpCenter key={workspaceId} workspaceId={workspaceId} role={(overview?.workspace as Workspace & { role?: string } | undefined)?.role} tab={helpTab} /> : section === 'profile' || section === 'sessions' ? <AccountPanel key={workspaceId} section={section} workspace={overview?.workspace} /> : section === 'activity' ? <ActivityPanel items={overview?.audit ?? []} loading={loading} /> : section === 'agents' ? <AgentAccessPanel workspaceId={workspaceId} role={(overview?.workspace as Workspace & { role?: string } | undefined)?.role} /> : currentModule ? <><div className="page-heading"><div><p className="eyebrow">{currentModule.category} / TOOL</p><h1>{currentModule.name}</h1><p className="page-subtitle">{currentModule.description}</p></div><div className="help-links"><a className="quiet-link" href={'/dashboards/'+currentModule.id}>Dashboard</a><a className="quiet-link" href={`/help#guide-${currentModule.id}`}>How to use this tool</a><a className="quiet-link" href="/">All tools</a></div></div><div className="workbench-panel"><ModuleGate key={workspaceId} id={currentModule.id} /></div></> : <Dashboard key={workspaceId} overview={overview} loading={loading} enabledModules={enabledModules} onCreateProject={() => openDialog('project')} onManage={() => openDialog('modules')} onSearch={() => setPalette(true)} />}
      </main>
    </div>
    {palette && <div className="overlay" onMouseDown={() => setPalette(false)}><div className="command-dialog" role="dialog" aria-modal="true" aria-label="Search ForgeOS" onMouseDown={event => event.stopPropagation()}><div className="command-input"><span>⌕</span><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tools, projects, and activity" aria-label="Search ForgeOS" /><kbd>Esc</kbd></div><div className="command-results">{!query.trim() ? <p>Search this workspace. Press Ctrl+K to open from anywhere.</p> : results.length ? results.map((item, index) => <a key={`${item.href}-${index}`} href={item.href}><span>{item.label}</span><small>{item.meta}</small></a>) : <p>No matching items in this workspace.</p>}</div></div></div>}
    {dialog && <div className="overlay" onMouseDown={() => setDialog(null)}><div className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={event => event.stopPropagation()}><div className="dialog-heading"><h2 id="dialog-title">{dialog === 'workspace' ? 'Create workspace' : dialog === 'project' ? 'New project' : 'Manage modules'}</h2><button aria-label="Close dialog" onClick={() => setDialog(null)}>×</button></div>{error && <div className="inline-error" role="alert">{error}</div>}{dialog === 'modules' ? <><p>Choose which tools are available in {overview?.workspace.name}. Changes apply immediately.</p><div className="module-toggles">{modules.map(item => <label key={item.id}><span><strong>{item.name}</strong><small>{item.category}</small></span><input type="checkbox" checked={enabledIds.includes(item.id)} disabled={busy} onChange={() => void toggleModule(item.id)} /></label>)}</div><div className="dialog-actions"><button className="button-primary" onClick={() => setDialog(null)}>Done</button></div></> : <form onSubmit={event => void (dialog === 'workspace' ? createWorkspace(event) : createProject(event))}><label className="field-label" htmlFor="entity-name">{dialog === 'workspace' ? 'Workspace name' : 'Project name'}</label><input id="entity-name" autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder={dialog === 'workspace' ? 'Engineering team' : 'My project'} />{dialog === 'project' && <fieldset><legend>Tools for this project</legend><div className="module-choices">{enabledModules.map(item => <label key={item.id}><input type="checkbox" checked={selectedModules.includes(item.id)} onChange={event => setSelectedModules(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />{item.name}</label>)}</div></fieldset>}<div className="dialog-actions"><button type="button" onClick={() => setDialog(null)}>Cancel</button><button className="button-primary" disabled={busy || !name.trim()} type="submit">{busy ? 'Saving…' : 'Create'}</button></div></form>}</div></div>}
  </div>;
}

function Dashboard({ overview, loading, enabledModules, onCreateProject, onManage, onSearch }: { overview: Overview | null; loading: boolean; enabledModules: typeof modules; onCreateProject: () => void; onManage: () => void; onSearch: () => void }) {
  const [category, setCategory] = useState('All');
  const [toolQuery, setToolQuery] = useState('');
  const projects = overview?.projects ?? [], runs = overview?.runs ?? [], audit = overview?.audit ?? [];
  const visible = enabledModules.filter(item => (category === 'All' || item.category === category) && `${item.name} ${item.description}`.toLowerCase().includes(toolQuery.toLowerCase()));
  const role = (overview?.workspace as Workspace & { role?: string } | undefined)?.role;
  const metric = (value: number) => loading ? '...' : overview ? value : '\u2014';
  const shortcuts = [
    { id: 'commitcraft', code: '01', title: 'Review your next change', detail: 'Draft a commit or take CommitCraft into your editor.' },
    { id: 'stackforge', code: '02', title: 'Start with working source', detail: 'Inspect a starter recipe and download the files.' },
    { id: 'snapdiff', code: '03', title: 'Make changes visible', detail: 'Compare screenshots with explicit visual evidence.' },
  ];
  return <div className="workspace-dashboard">
    <section className="dashboard-hero"><div className="hero-copy"><p className="eyebrow">YOUR ENGINEERING WORKSPACE</p><h1>{overview?.workspace.name ?? (loading ? 'Opening your workspace' : 'Workspace unavailable')}</h1><p>Draft, inspect, and compare.<br /><strong>Keep the evidence close.</strong></p><div className="hero-actions"><button className="button-primary" onClick={onCreateProject} disabled={!overview}>+ New project</button><button className="hero-secondary" onClick={onSearch}>Find a tool <kbd>Ctrl K</kbd></button></div></div><div className="hero-workspace" aria-label="Workspace context"><div className="hero-window-bar"><i/><i/><i/><span>workspace / overview</span></div><div className="workspace-code"><span className="code-comment">// Your current context</span><div><span>workspace</span><b>{overview?.workspace.name ?? 'Connecting...'}</b></div><div><span>deployment</span><b>{overview?.workspace.plan ?? 'Not available'}</b></div><div><span>role</span><b>{role ?? 'Not available'}</b></div><div><span>tools.enabled</span><b>{metric(enabledModules.length)}</b></div><a href="/settings/profile">Inspect account &amp; access <span aria-hidden="true">↗</span></a></div></div></section>
    <div className="dashboard-stat-grid" aria-label="Workspace summary"><div><span className="stat-index">01 / ORGANIZE</span><strong>{metric(projects.length)}</strong><span>Projects in this workspace</span></div><div><span className="stat-index">02 / BUILD</span><strong>{metric(enabledModules.length)}</strong><span>Enabled workbenches</span></div><div><span className="stat-index">03 / EXECUTE</span><strong>{metric(runs.length)}</strong><span>Runs in the latest 20 records</span></div><div><span className="stat-index">04 / REVIEW</span><strong>{metric(runs.filter(run => run.status === 'failed').length)}</strong><span>Failed runs in that recent set</span></div></div>
    <section className="dashboard-section"><div className="dashboard-section-title"><div><p className="eyebrow">PICK UP A WORKFLOW</p><h2>Start a workflow</h2></div><a href="/tutorial" className="quiet-link">New here? Take the tutorial ↗</a></div><div className="workflow-grid">{shortcuts.map(item => { const enabled = enabledModules.some(module => module.id === item.id); return <a className={`workflow-card ${enabled ? '' : 'workflow-disabled'}`} key={item.id} href={enabled ? `/modules/${item.id}` : '/help'}><span className="workflow-number">{item.code}<span aria-hidden="true">↗</span></span><strong>{item.title}</strong><p>{item.detail}</p><small>{enabled ? modules.find(module => module.id === item.id)?.name : loading ? 'Checking workspace tools...' : 'Enable the tool in Manage modules'}</small></a>; })}</div></section>
    <div className="dashboard-columns"><div className="dashboard-main-column"><section className="dashboard-section" id="tools"><div className="dashboard-section-title"><div><p className="eyebrow">YOUR TOOLKIT</p><h2>Your workbenches</h2></div><button className="text-button" onClick={onManage} disabled={!overview}>Manage modules</button></div><div className="tool-discovery"><label><span className="sr-only">Filter enabled tools</span><input type="search" value={toolQuery} onChange={event => setToolQuery(event.target.value)} placeholder="Find a tool by name or purpose..." /></label><nav aria-label="Tool categories">{['All', ...groups.filter(group => enabledModules.some(item => item.category === group))].map(group => <button key={group} aria-pressed={category === group} onClick={() => setCategory(group)}>{group}</button>)}</nav></div>
      {loading && !overview ? <div className="dashboard-empty" role="status">Loading workspace tools...</div> : !overview ? <div className="dashboard-empty"><strong>The workspace could not be loaded.</strong><p>Use Refresh or Retry above to reconnect. Your tools and records have not been replaced with sample data.</p></div> : visible.length ? <div className="dashboard-tool-grid">{visible.map(item => <a className="dashboard-tool-card" href={`/modules/${item.id}`} key={item.id}><div><span className="tool-monogram">{item.name.slice(0, 2).toUpperCase()}</span><small>{item.category}</small><span className="tool-arrow" aria-hidden="true">↗</span></div><h3>{item.name}</h3><p>{item.description}</p><span className="tool-open">Open workbench <b aria-hidden="true">→</b></span></a>)}</div> : <div className="dashboard-empty"><strong>{enabledModules.length ? 'No matching tools.' : 'Choose the tools for this workspace.'}</strong><p>{enabledModules.length ? 'Try another name or category.' : 'Owners and administrators can enable tools under Manage modules.'}</p></div>}</section>
      <section className="dashboard-section" id="projects"><div className="dashboard-section-title"><div><p className="eyebrow">KEEP WORK TOGETHER</p><h2>Projects</h2></div><button className="text-button" onClick={onCreateProject} disabled={!overview}>+ New project</button></div>{loading ? <p className="dashboard-empty" role="status">Loading projects...</p> : !overview ? <p className="dashboard-empty">Reconnect to view projects.</p> : projects.length ? <div className="project-table">{projects.map(project => <article key={project.id}><span className="project-avatar">{project.name.slice(0, 1).toUpperCase()}</span><div><strong>{project.name}</strong><small>{project.moduleIds.length} tools assigned / created {new Date(project.createdAt).toLocaleDateString()}</small><div className="project-tool-links">{project.moduleIds.filter(id => enabledModules.some(m => m.id === id)).slice(0, 4).map(id => <a key={id} href={`/modules/${id}`}>{modules.find(m => m.id === id)?.name}</a>)}</div></div></article>)}</div> : <div className="dashboard-empty project-empty"><span className="empty-symbol" aria-hidden="true">+</span><strong>A place for your next project.</strong><p>Give your work a name and choose the tools it needs.</p><button className="button-primary" onClick={onCreateProject}>Create your first project</button></div>}</section></div>
      <aside className="dashboard-inspector"><section className="inspector-panel" id="activity"><div className="inspector-title"><span className="eyebrow">WORKSPACE ACTIVITY</span><a href="/activity">View log ↗</a></div><h2>Recent activity</h2>{loading && !overview ? <p className="inspector-empty">Loading recorded events...</p> : audit.length ? <div className="dashboard-timeline">{audit.slice(0, 6).map(event => <article key={event.id}><span className="timeline-dot"/><div><strong>{event.action.replaceAll('.', ' ')}</strong><p>{event.target}</p><time>{new Date(event.createdAt).toLocaleString()}</time></div></article>)}</div> : <p className="inspector-empty">{overview ? 'Recorded workspace actions will appear here.' : 'Reconnect to load activity.'}</p>}<small className="inspector-footnote">Recent recorded actions, not a history of every click or sign-in.</small></section>
      <section className="inspector-panel"><div className="inspector-title"><span className="eyebrow">EXECUTION</span><a href="/help">Run help ↗</a></div><h2>Recent runs</h2>{runs.length ? runs.slice(0, 5).map(run => <div className="inspector-run" key={run.id}><span>{modules.find(item => item.id === run.moduleId)?.name ?? run.moduleId}</span><strong className={`run-status ${run.status}`}>{run.status}</strong></div>) : <p className="inspector-empty">{loading ? 'Loading runs...' : 'No runs recorded. Some workbenches generate local files rather than execute jobs.'}</p>}</section>
      <section className="inspector-help"><span className="eyebrow">A LITTLE GUIDANCE</span><h2>Know your tools.</h2><p>Examples, storage details and current limits for every workbench.</p><a href="/help">Explore the guides <span aria-hidden="true">→</span></a><a href="/help/desk">Ask your workspace admins <span aria-hidden="true">→</span></a></section></aside></div>
  </div>;
}

function NavIcon({ kind }: { kind: string }) {
  const paths: Record<string,string> = { overview:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', projects:'M3 7V5a1 1 0 0 1 1-1h6l2 3h8a1 1 0 0 1 1 1v11H3z', activity:'M3 12h4l3-7 4 14 3-7h4', shield:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z M8 12l3 3 5-6', search:'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15 M16 16l5 5', settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6', help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4 M12 17v.1 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', support:'M4 14v-3a8 8 0 0 1 16 0v6a3 3 0 0 1-3 3h-3 M4 11H2v6h4v-6z M20 11h2v6h-4v-6z', profile:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2', refresh:'M20 7a9 9 0 1 0 1 9 M20 3v5h-5', logout:'M10 4H4v16h6 M9 12h12 M17 8l4 4-4 4', menu:'M4 6h16 M4 12h16 M4 18h16', close:'m6 6 12 12 M18 6 6 18' };
  return <svg className="navigation-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind] ?? paths.overview}/></svg>;
}
