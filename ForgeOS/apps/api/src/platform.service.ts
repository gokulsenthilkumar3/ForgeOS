import { Injectable, NotFoundException, NotImplementedException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { modules, type ModuleId } from '@forgeos/contracts';

@Injectable()
export class PlatformService implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async onModuleInit() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for ForgeOS API');
    for (let attempt = 0; attempt < 20; attempt++) {
      try { await this.pool.query('SELECT 1'); break; }
      catch (error) { if (attempt === 19) throw error; await new Promise(done => setTimeout(done, 1000)); }
    }
    const client = await this.pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock(72644961)');
      await client.query('CREATE TABLE IF NOT EXISTS forgeos_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
      const migrated = await client.query('SELECT 1 FROM forgeos_migrations WHERE version = 1');
      if (!migrated.rowCount) {
        const schema = readFileSync(resolve(__dirname, '../../../packages/database/schema.sql'), 'utf8');
        await client.query('BEGIN');
        try { await client.query(schema); await client.query('INSERT INTO forgeos_migrations(version) VALUES (1)'); await client.query('COMMIT'); }
        catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      const settingsMigration = await client.query('SELECT 1 FROM forgeos_migrations WHERE version = 2');
      if (!settingsMigration.rowCount) {
        await client.query('BEGIN');
        try {
          await client.query("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS enabled_modules text[] NOT NULL DEFAULT ARRAY['commitcraft','stackforge','snapdiff','comparer','regexforge','loadlab','promptvault','probeai','pulsewatch','dbpulse','glbviewer','craftcv','vaultiq','mathshield']::text[]");
          await client.query('INSERT INTO forgeos_migrations(version) VALUES (2)');
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      await client.query(`INSERT INTO workspaces (id, name, slug, deployment_mode) VALUES ('00000000-0000-4000-8000-000000000001', 'Personal workspace', 'personal', 'self-hosted') ON CONFLICT (id) DO NOTHING`);
    } finally { await client.query('SELECT pg_advisory_unlock(72644961)'); client.release(); }
  }
  async onModuleDestroy() { await this.pool.end(); }

  async listWorkspaces() {
    const result = await this.pool.query('SELECT id, name, slug, deployment_mode AS plan, enabled_modules AS "moduleIds", created_at AS "createdAt" FROM workspaces ORDER BY created_at');
    return result.rows;
  }
  async createWorkspace(name: string) {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${Date.now().toString(36)}`;
    const result = await this.pool.query('INSERT INTO workspaces (name, slug, deployment_mode) VALUES ($1, $2, $3) RETURNING id, name, slug, deployment_mode AS plan, enabled_modules AS "moduleIds", created_at AS "createdAt"', [name, slug, process.env.FORGEOS_MODE === 'cloud' ? 'cloud' : 'self-hosted']);
    return result.rows[0];
  }
  private async workspace(id?: string) {
    const result = await this.pool.query('SELECT id, name, slug, deployment_mode AS plan, enabled_modules AS "moduleIds", created_at AS "createdAt" FROM workspaces WHERE id = COALESCE($1::uuid, (SELECT id FROM workspaces ORDER BY created_at LIMIT 1))', [id || null]);
    if (!result.rows[0]) throw new NotFoundException('Workspace not found');
    return result.rows[0];
  }
  async updateWorkspaceModules(workspaceId: string, moduleIds: ModuleId[]) {
    const result = await this.pool.query('UPDATE workspaces SET enabled_modules = $2 WHERE id = $1 RETURNING id, name, slug, deployment_mode AS plan, enabled_modules AS "moduleIds", created_at AS "createdAt"', [workspaceId, moduleIds]);
    if (!result.rows[0]) throw new NotFoundException('Workspace not found');
    await this.log(workspaceId, 'workspace.modules.updated', moduleIds.join(','));
    return result.rows[0];
  }
  async overview(workspaceId?: string) {
    const workspace = await this.workspace(workspaceId);
    const [projects, runs, audit] = await Promise.all([
      this.listProjects(workspace.id),
      this.pool.query('SELECT r.id, r.project_id AS "projectId", r.module_id AS "moduleId", r.status, r.started_at AS "startedAt", r.finished_at AS "finishedAt" FROM runs r JOIN projects p ON p.id = r.project_id WHERE p.workspace_id = $1 ORDER BY r.id DESC LIMIT 20', [workspace.id]),
      this.pool.query('SELECT id::text, workspace_id AS "workspaceId", actor_id::text AS "actorId", action, target, created_at AS "createdAt", hash FROM audit_events WHERE workspace_id = $1 ORDER BY id DESC LIMIT 20', [workspace.id]),
    ]);
    return { workspace, modules, projects, runs: runs.rows, audit: audit.rows };
  }
  async listProjects(workspaceId?: string) {
    const workspace = await this.workspace(workspaceId);
    const result = await this.pool.query('SELECT id, workspace_id AS "workspaceId", name, enabled_modules AS "moduleIds", created_at AS "createdAt" FROM projects WHERE workspace_id = $1 ORDER BY created_at DESC', [workspace.id]);
    return result.rows;
  }
  async createProject(name: string, moduleIds: ModuleId[], workspaceId?: string) {
    const workspace = await this.workspace(workspaceId);
    if (moduleIds.some(id => !workspace.moduleIds.includes(id))) throw new NotFoundException('A selected module is disabled for this workspace');
    const result = await this.pool.query('INSERT INTO projects(workspace_id,name,enabled_modules) VALUES ($1,$2,$3) RETURNING id, workspace_id AS "workspaceId", name, enabled_modules AS "moduleIds", created_at AS "createdAt"', [workspace.id, name, moduleIds]);
    await this.log(workspace.id, 'project.created', result.rows[0].id);
    return result.rows[0];
  }
  async startRun(projectId: string, moduleId: ModuleId, workspaceId?: string) {
    const workspace = await this.workspace(workspaceId);
    const project = await this.pool.query('SELECT id, enabled_modules FROM projects WHERE id = $1 AND workspace_id = $2', [projectId, workspace.id]);
    if (!project.rows[0]) throw new NotFoundException('Project not found');
    if (!project.rows[0].enabled_modules.includes(moduleId)) throw new NotFoundException('Module is not enabled for this project');
    if (!workspace.moduleIds.includes(moduleId)) throw new NotFoundException('Module is disabled for this workspace');
    throw new NotImplementedException(`No background runner is configured for ${moduleId}`);
  }
  async completeRun(runId: string, passed: boolean, workspaceId?: string) {
    const workspace = await this.workspace(workspaceId);
    const result = await this.pool.query('UPDATE runs r SET status = $1, finished_at = now() FROM projects p WHERE r.project_id = p.id AND r.id = $2 AND p.workspace_id = $3 RETURNING r.id, r.project_id AS "projectId", r.module_id AS "moduleId", r.status, r.finished_at AS "finishedAt"', [passed ? 'passed' : 'failed', runId, workspace.id]);
    if (!result.rows[0]) throw new NotFoundException('Run not found');
    await this.log(workspace.id, 'run.completed', runId);
    return result.rows[0];
  }
  private async log(workspaceId: string, action: string, target: string) {
    const previous = await this.pool.query('SELECT hash FROM audit_events WHERE workspace_id = $1 ORDER BY id DESC LIMIT 1', [workspaceId]);
    const previousHash = previous.rows[0]?.hash ?? 'GENESIS';
    const createdAt = new Date().toISOString();
    const hash = createHash('sha256').update(`${previousHash}:${workspaceId}:${action}:${target}:${createdAt}`).digest('hex');
    await this.pool.query('INSERT INTO audit_events(workspace_id,action,target,previous_hash,hash,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [workspaceId, action, target, previousHash, hash, createdAt]);
  }
}
