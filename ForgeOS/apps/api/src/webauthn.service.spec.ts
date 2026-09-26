import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlatformService } from './platform.service';

const user = { kind: 'user', userId: '11111111-1111-4111-8111-111111111111', email: 'qa@example.com' } as const;
const workspaceId = '22222222-2222-4222-8222-222222222222';
const approvalId = '33333333-3333-4333-8333-333333333333';

describe('WebAuthn action approvals and audit serialization', () => {
  let service: PlatformService;
  let query: jest.Mock;
  let release: jest.Mock;

  beforeEach(() => {
    service = new PlatformService();
    query = jest.fn(async (sql: string) => {
      if (sql.includes('UPDATE webauthn_approvals')) return { rowCount: 1, rows: [{ id: approvalId }] };
      if (sql.includes('SELECT hash FROM audit_events')) return { rows: [] };
      if (sql.includes('INSERT INTO audit_events')) return { rows: [{ id: '1', hash: 'h' }] };
      return { rowCount: 0, rows: [] };
    });
    release = jest.fn();
    jest.spyOn((service as unknown as { pool: { connect: () => Promise<unknown> } }).pool, 'connect')
      .mockResolvedValue({ query, release });
  });

  afterEach(async () => {
    jest.useRealTimers();
    await service.onModuleDestroy();
  });

  it('consumes an approval using user, workspace, action and unspent TTL checks', async () => {
    await service.consumeStepUpApproval(approvalId, user, workspaceId, 'agent.grant');
    const update = query.mock.calls.find(([sql]) => sql.includes('UPDATE webauthn_approvals'));
    expect(update[0]).toContain('used_at IS NULL AND expires_at > now()');
    expect(update[0]).toContain('workspace_id IS NOT DISTINCT FROM $3::uuid');
    expect(update[1]).toEqual([approvalId, user.userId, workspaceId, 'agent.grant']);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']));
    expect(release).toHaveBeenCalled();
  });

  it('rejects a spent approval and rolls back', async () => {
    query.mockImplementation(async (sql: string) => sql.includes('UPDATE webauthn_approvals')
      ? { rowCount: 0, rows: [] }
      : { rowCount: 0, rows: [] });
    await expect(service.consumeStepUpApproval(approvalId, user, workspaceId, 'agent.grant')).rejects.toThrow(ForbiddenException);
    expect(query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK');
  });

  it('claims a short-lived challenge with an atomic delete so it cannot replay', async () => {
    const challenge = {
      id: approvalId, user_id: user.userId, challenge: 'challenge',
      label: null, workspace_id: null, action: null,
    };
    const poolQuery = jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query')
      .mockResolvedValueOnce({ rows: [challenge] })
      .mockResolvedValueOnce({ rows: [] });
    const claim = (service as unknown as { claimWebAuthnChallenge: (id: string, purpose: string, userId: string) => Promise<unknown> }).claimWebAuthnChallenge.bind(service);
    await expect(claim(approvalId, 'register', user.userId)).resolves.toEqual(challenge);
    await expect(claim(approvalId, 'register', user.userId)).rejects.toThrow();
    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM webauthn_challenges'),
      [approvalId, 'register', user.userId],
    );
  });

  it('accepts agent registration as an approval action but rejects invented actions', async () => {
    const workspace = jest.spyOn(service as never, 'workspace' as never).mockResolvedValue({ id: workspaceId } as never);
    jest.spyOn((service as unknown as { pool: { query: (...args: unknown[]) => Promise<unknown> } }).pool, 'query')
      .mockResolvedValue({ rows: [] });
    await expect(service.webAuthnStepUpOptions(user, 'agent.register', workspaceId)).rejects.toThrow(ForbiddenException);
    expect(workspace).toHaveBeenCalledWith(workspaceId, user);
    await expect(service.webAuthnStepUpOptions(user, 'agent.promote', workspaceId)).rejects.toThrow(BadRequestException);
  });

  it('serializes audit appends and hashes payload in canonical key order', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-24T00:00:00.000Z'));
    await service.appendAuditEvent(workspaceId, 'agent.grant.created', approvalId, user, { z: 1, a: 2 });
    const first = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO audit_events'))[1][6];
    expect(query.mock.calls.findIndex(([sql]) => sql.includes('pg_advisory_xact_lock')))
      .toBeLessThan(query.mock.calls.findIndex(([sql]) => sql.includes('SELECT hash FROM audit_events')));
    query.mockClear();
    await service.appendAuditEvent(workspaceId, 'agent.grant.created', approvalId, user, { a: 2, z: 1 });
    const second = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO audit_events'))[1][6];
    expect(second).toBe(first);
  });
});
