import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { AgentAccessService } from './agent-access.service';
import { PlatformService } from './platform.service';

describe('AgentAccessService', () => {
  const workspaceId = '11111111-1111-4111-8111-111111111111';
  const agentId = '22222222-2222-4222-8222-222222222222';
  const userId = '33333333-3333-4333-8333-333333333333';
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const spki = publicKey.export({ format: 'der', type: 'spki' });
  const platform = {
    consumeStepUpApproval: jest.fn(async () => undefined),
    appendAuditEvent: jest.fn(async () => undefined),
  };
  const service = new AgentAccessService(platform as unknown as PlatformService);
  const query = jest.fn();

  beforeEach(() => {
    query.mockReset();
    platform.consumeStepUpApproval.mockClear();
    platform.appendAuditEvent.mockClear();
    (service as any).schemaReady = Promise.resolve();
    (service as any).pool = { query, end: async () => undefined };
  });

  function signedRequest(signatureOverride?: string) {
    const timestamp = String(Date.now());
    const nonce = 'AAAAAAAAAAAAAAAAAAAAAA';
    const originalUrl = `/v1/agent-access/projects?workspaceId=${workspaceId}`;
    const bodyHash = createHash('sha256').update('').digest('hex');
    const canonical = `GET\n${originalUrl}\n${timestamp}\n${nonce}\n${bodyHash}`;
    const signature = signatureOverride || sign(null, Buffer.from(canonical), privateKey).toString('base64url');
    return {
      method: 'GET', originalUrl,
      headers: {
        'x-forgeos-agent-id': agentId,
        'x-forgeos-timestamp': timestamp,
        'x-forgeos-nonce': nonce,
        'x-forgeos-signature': signature,
      },
    };
  }

  it('accepts a signed, unreplayed request only with an active workspace grant', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM access_agents WHERE id')) return { rows: [{ id: agentId, kind: 'test', public_key_spki: spki }], rowCount: 1 };
      if (sql.includes('INSERT INTO access_agent_nonces')) return { rows: [{ nonce: 'ok' }], rowCount: 1 };
      if (sql.includes('FROM access_agent_grants WHERE agent_id')) return { rows: [{ id: 'grant-1' }], rowCount: 1 };
      if (sql.includes('FROM projects WHERE workspace_id')) return { rows: [{ id: 'project-1', name: 'Sample' }], rowCount: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    });
    const result = await service.signedProjects(workspaceId, signedRequest());
    expect(result.actor).toEqual({ class: 'approved_automation', agentId, declaredKind: 'test' });
    expect(result.projects).toHaveLength(1);
    expect(platform.appendAuditEvent).toHaveBeenCalledWith(workspaceId, 'agent.access.allowed', agentId, undefined, expect.any(Object));
  });

  it('rejects a forged signature, replay, and an absent grant', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM access_agents WHERE id')) return { rows: [{ id: agentId, kind: 'ai', public_key_spki: spki }], rowCount: 1 };
      if (sql.includes('INSERT INTO access_agent_nonces')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    await expect(service.signedProjects(workspaceId, signedRequest('A'.repeat(86)))).rejects.toThrow(UnauthorizedException);
    await expect(service.signedProjects(workspaceId, signedRequest())).rejects.toThrow('replayed');
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM access_agents WHERE id')) return { rows: [{ id: agentId, kind: 'ai', public_key_spki: spki }], rowCount: 1 };
      if (sql.includes('INSERT INTO access_agent_nonces')) return { rows: [{ nonce: 'ok' }], rowCount: 1 };
      if (sql.includes('FROM access_agent_grants WHERE agent_id')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    await expect(service.signedProjects(workspaceId, signedRequest())).rejects.toThrow(ForbiddenException);
  });

  it('requires a human admin and one-time physical-key approval to register an agent', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM principals WHERE')) return { rows: [{ role: 'owner' }], rowCount: 1 };
      if (sql.includes('INSERT INTO access_agents')) return { rows: [{ id: agentId, name: 'Test runner', kind: 'test' }], rowCount: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    });
    const pem = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    const actor = { kind: 'user' as const, userId, email: 'owner@example.test' };
    await expect(service.register(workspaceId, 'Test runner', 'test', pem, 'approval-1', { kind: 'bootstrap' })).rejects.toThrow(ForbiddenException);
    const result = await service.register(workspaceId, 'Test runner', 'test', pem, 'approval-1', actor);
    expect(result.id).toBe(agentId);
    expect(platform.consumeStepUpApproval).toHaveBeenCalledWith('approval-1', actor, workspaceId, 'agent.register');
  });
});
