import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { modules, type AuditEvent, type ModuleId, type Project, type Run, type Workspace } from '@forgeos/contracts';

@Injectable()
export class PlatformService {
  private readonly workspace: Workspace = { id: 'ws_demo', name: 'Acme Engineering', slug: 'acme-engineering', plan: 'self-hosted', createdAt: new Date().toISOString() };
  private readonly projects: Project[] = [{ id: 'prj_demo', workspaceId: 'ws_demo', name: 'Storefront', moduleIds: ['snapdiff', 'pulsewatch', 'loadlab'], createdAt: new Date().toISOString() }];
  private readonly runs: Run[] = [];
  private readonly audit: AuditEvent[] = [];
  overview() { return { workspace: this.workspace, modules, projects: this.projects, runs: this.runs.slice(-20), audit: this.audit.slice(-20) }; }
  listProjects() { return this.projects; }
  createProject(name: string, moduleIds: ModuleId[]) { const project = { id: randomUUID(), workspaceId: this.workspace.id, name, moduleIds, createdAt: new Date().toISOString() }; this.projects.push(project); this.log('project.created', project.id); return project; }
  startRun(projectId: string, moduleId: ModuleId) { if (!this.projects.some(p => p.id === projectId)) throw new NotFoundException('Project not found'); const run: Run = { id: randomUUID(), projectId, moduleId, status: 'queued' }; this.runs.push(run); this.log('run.queued', run.id); return run; }
  completeRun(runId: string, passed: boolean) { const run = this.runs.find(item => item.id === runId); if (!run) throw new NotFoundException('Run not found'); run.status = passed ? 'passed' : 'failed'; run.finishedAt = new Date().toISOString(); this.log('run.completed', run.id); return run; }
  private log(action: string, target: string) { const createdAt = new Date().toISOString(); this.audit.push({ id: randomUUID(), workspaceId: this.workspace.id, actorId: 'system', action, target, createdAt, hash: createHash('sha256').update(`${action}:${target}:${createdAt}`).digest('hex') }); }
}
