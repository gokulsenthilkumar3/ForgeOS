'use client';
import { useEffect, useState } from 'react';
import type { ModuleId, Workspace } from '@forgeos/contracts';
import { Workbench } from './workbench';

export function ModuleGate({ id }: { id: ModuleId }) {
  const [state, setState] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading');
  useEffect(() => {
    const workspaceId = localStorage.getItem('forgeos-workspace-id');
    const url = workspaceId ? `/api/v1/overview?workspaceId=${encodeURIComponent(workspaceId)}` : '/api/v1/overview';
    void fetch(url, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Workspace unavailable');
      const result = await response.json() as { workspace: Workspace };
      setState(result.workspace.moduleIds.includes(id) ? 'enabled' : 'disabled');
    }).catch(() => setState('error'));
  }, [id]);
  if (state === 'loading') return <div className="tool-card">Checking workspace settings…</div>;
  if (state === 'error') return <div className="tool-card" role="alert">Could not load workspace settings. Return to the overview and try again.</div>;
  if (state === 'disabled') return <div className="tool-card"><h2>Module disabled</h2><p>This tool is turned off for the selected workspace. Enable it under Customize modules on the overview.</p></div>;
  return <Workbench id={id} />;
}
