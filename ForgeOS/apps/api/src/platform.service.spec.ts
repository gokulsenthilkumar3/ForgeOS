import { NotFoundException } from '@nestjs/common';
import { PlatformService } from './platform.service';

describe('PlatformService workspace boundaries', () => {
  let service: PlatformService;
  const workspace = { id: '00000000-0000-4000-8000-000000000001', moduleIds: ['commitcraft'] };

  beforeEach(() => {
    service = new PlatformService();
    jest.spyOn(service as never, 'workspace' as never).mockResolvedValue(workspace as never);
  });

  afterEach(async () => { await service.onModuleDestroy(); });

  it('rejects a project containing a disabled module before writing', async () => {
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query');
    await expect(service.createProject('QA', ['snapdiff'], workspace.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).not.toHaveBeenCalled();
  });

  it('scopes a run lookup to its workspace and rejects a disabled module', async () => {
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query')
      .mockResolvedValue({ rows: [{ id: 'project-1', enabled_modules: ['snapdiff'] }] });
    await expect(service.startRun('project-1', 'snapdiff', workspace.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('workspace_id = $2'), ['project-1', workspace.id]);
  });

  it('rejects records for a disabled module before querying', async () => {
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query');
    await expect(service.listModuleRecords('snapdiff', workspace.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.saveModuleRecord('snapdiff', 'baseline', 'main', {}, workspace.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).not.toHaveBeenCalled();
  });

  it('scopes record listing to workspace and module', async () => {
    const query = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query')
      .mockResolvedValue({ rows: [] });
    await service.listModuleRecords('commitcraft', workspace.id);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('workspace_id = $1 AND module_id = $2'), [workspace.id, 'commitcraft']);
  });
});
