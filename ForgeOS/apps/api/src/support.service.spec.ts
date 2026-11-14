import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlatformService } from './platform.service';
describe('Help desk workspace and role boundaries', () => {
  let service: PlatformService;
  const workspace = { id: '00000000-0000-4000-8000-000000000001', role: 'member' };
  const actor = { kind: 'user', userId: '11111111-1111-4111-8111-111111111111', email: 'member@example.com' } as const;
  const pool = () => (service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool;
  beforeEach(() => { service = new PlatformService(); });
  afterEach(async () => { await service.onModuleDestroy(); });
  it('limits members to their own tickets inside the selected workspace', async () => {
    jest.spyOn(service as never, 'workspace' as never).mockResolvedValue(workspace as never);
    const query = jest.spyOn(pool(), 'query').mockResolvedValue({ rows: [] });
    await service.listSupportTickets(workspace.id, actor);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('workspace_id = $1 AND ($2::uuid IS NULL OR created_by = $2)'), [workspace.id, actor.userId]);
  });
  it('lets administrators list workspace tickets without removing the workspace filter', async () => {
    jest.spyOn(service as never, 'workspace' as never).mockResolvedValue({ ...workspace, role: 'admin' } as never);
    const query = jest.spyOn(pool(), 'query').mockResolvedValue({ rows: [] });
    await service.listSupportTickets(workspace.id, actor);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('workspace_id = $1'), [workspace.id, null]);
  });
  it('rejects status writes outside the administrator role boundary', async () => {
    const boundary = jest.spyOn(service as never, 'workspace' as never).mockRejectedValue(new ForbiddenException() as never);
    const query = jest.spyOn(pool(), 'query');
    await expect(service.updateSupportTicket('22222222-2222-4222-8222-222222222222', 'resolved', workspace.id, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(boundary).toHaveBeenCalledWith(workspace.id, actor, ['owner','admin']);
    expect(query).not.toHaveBeenCalled();
  });
  it('does not update a ticket belonging to another workspace', async () => {
    jest.spyOn(service as never, 'workspace' as never).mockResolvedValue({ ...workspace, role: 'owner' } as never);
    const query = jest.spyOn(pool(), 'query').mockResolvedValue({ rows: [] });
    await expect(service.updateSupportTicket('22222222-2222-4222-8222-222222222222','resolved',workspace.id,actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1 AND workspace_id = $2'), ['22222222-2222-4222-8222-222222222222',workspace.id,'resolved']);
  });
  it('rejects empty ticket text before writing and rejects bootstrap callers', async () => {
    jest.spyOn(service as never, 'workspace' as never).mockResolvedValue(workspace as never);
    const query = jest.spyOn(pool(), 'query');
    await expect(service.createSupportTicket('   ','Details','question',workspace.id,actor)).rejects.toThrow('subject');
    await expect(service.listSupportTickets(workspace.id,{kind:'bootstrap'})).rejects.toThrow('user account');
    expect(query).not.toHaveBeenCalled();
  });
});
