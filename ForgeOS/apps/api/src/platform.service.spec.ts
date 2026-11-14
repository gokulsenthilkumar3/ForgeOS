import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlatformService } from './platform.service';

describe('PlatformService workspace boundaries', () => {
  let service: PlatformService;
  const workspace = { id: '00000000-0000-4000-8000-000000000001', moduleIds: ['commitcraft'] };
  const actor = { kind: 'user', userId: '11111111-1111-4111-8111-111111111111', email: 'qa@example.com' } as const;

  beforeEach(() => {
    service = new PlatformService();
    jest.spyOn(service as never, 'workspace' as never).mockResolvedValue(workspace as never);
  });

  afterEach(async () => { await service.onModuleDestroy(); });

  it('rejects a project containing a disabled module before writing', async () => {
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query');
    await expect(service.createProject('QA', ['snapdiff'], workspace.id, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).not.toHaveBeenCalled();
  });

  it('scopes a run lookup to its workspace and rejects a disabled module', async () => {
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query')
      .mockResolvedValue({ rows: [{ id: 'project-1', enabled_modules: ['snapdiff'] }] });
    await expect(service.startRun('project-1', 'snapdiff', workspace.id, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('workspace_id = $2'), ['project-1', workspace.id]);
  });

  it('rejects records for a disabled module before querying', async () => {
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query');
    await expect(service.listModuleRecords('snapdiff', workspace.id, actor)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.saveModuleRecord('snapdiff', 'baseline', 'main', {}, workspace.id, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).not.toHaveBeenCalled();
  });

  it('scopes record listing to workspace and module', async () => {
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query')
      .mockResolvedValue({ rows: [] });
    await service.listModuleRecords('commitcraft', workspace.id, actor);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('workspace_id = $1 AND module_id = $2'), [workspace.id, 'commitcraft']);
  });

  it('keeps auditors read-only for project, run, and module-record mutations', async () => {
    jest.spyOn(service as never, 'workspace' as never).mockRestore();
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query')
      .mockResolvedValue({ rows: [{ ...workspace, role: 'auditor' }] });

    await expect(service.createProject('QA', ['commitcraft'], workspace.id, actor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.startRun('project-1', 'commitcraft', workspace.id, actor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.saveModuleRecord('commitcraft', 'prompt', 'draft', {}, workspace.id, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).toHaveBeenCalledTimes(3);
  });
});

describe('AgentShield draft storage', () => {
  let service: PlatformService;
  const actor = { kind: 'user', userId: '11111111-1111-4111-8111-111111111111', email: 'qa@example.com' } as const;
  const workspace = { id: '00000000-0000-4000-8000-000000000001', moduleIds: ['agentshield'] };
  const policy = { mode: 'sandbox', allowedOrigins: [], allowedActions: ['projects:read'], tokenBudget: 1000, cacheTtlSeconds: 0 };
  beforeEach(() => { service = new PlatformService(); });
  afterEach(async () => { await service.onModuleDestroy(); });
  it('requires the administrator role boundary before saving', async () => {
    const boundary = jest.spyOn(service as never, 'workspace' as never).mockRejectedValue(new Error('Insufficient workspace role') as never);
    await expect(service.saveModuleRecord('agentshield', 'policy', 'Main', policy, workspace.id, actor)).rejects.toThrow('Insufficient workspace role');
    expect(boundary).toHaveBeenCalledWith(workspace.id, actor, ['owner', 'admin']);
  });
  it('rejects invalid drafts and record types before writing', async () => {
    jest.spyOn(service as never, 'workspace' as never).mockResolvedValue(workspace as never);
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query');
    await expect(service.saveModuleRecord('agentshield', 'policy', 'Main', { ...policy, allowedOrigins: ['https://example.com'] }, workspace.id, actor)).rejects.toThrow('Sandbox');
    await expect(service.saveModuleRecord('agentshield', 'grant', 'Main', policy, workspace.id, actor)).rejects.toThrow('policy drafts');
    expect(query).not.toHaveBeenCalled();
  });
});
