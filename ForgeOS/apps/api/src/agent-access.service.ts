import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { Pool } from 'pg';
import { PlatformService, type AuthActor } from './platform.service';

export type AgentKind = 'ai' | 'rpa' | 'test' | 'service';
type SignedRequest = { method: string; originalUrl: string; headers: Record<string, string | undefined> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emptyBodyHash = createHash('sha256').update('').digest('hex');

@Injectable()
export class AgentAccessService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  private schemaReady?: Promise<void>;

  constructor(private readonly platform: PlatformService) {}
  async onModuleDestroy() { await this.pool.end(); }

  private async ready() {
    this.schemaReady ??= (async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(72644966)');
        await client.query(`CREATE TABLE IF NOT EXISTS access_agents (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id uuid NOT NULL REFERENCES workspaces(id),
          name text NOT NULL,
          kind text NOT NULL CHECK (kind IN ('ai','rpa','test','service')),
          public_key_spki bytea NOT NULL,
          fingerprint text NOT NULL,
          enabled boolean NOT NULL DEFAULT true,
          created_by uuid NOT NULL REFERENCES users(id),
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(workspace_id,name), UNIQUE(workspace_id,fingerprint)
        )`);
        await client.query(`CREATE TABLE IF NOT EXISTS access_agent_grants (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id uuid NOT NULL REFERENCES workspaces(id),
          agent_id uuid NOT NULL REFERENCES access_agents(id),
          scope text NOT NULL CHECK (scope IN ('projects:read')),
          expires_at timestamptz NOT NULL,
          revoked_at timestamptz,
          approved_by uuid NOT NULL REFERENCES users(id),
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
        await client.query(`CREATE TABLE IF NOT EXISTS access_agent_nonces (
          agent_id uuid NOT NULL REFERENCES access_agents(id),
          nonce text NOT NULL,
          seen_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY(agent_id,nonce)
        )`);
        await client.query('CREATE INDEX IF NOT EXISTS access_agent_grants_active_idx ON access_agent_grants(agent_id,workspace_id,scope,expires_at) WHERE revoked_at IS NULL');
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    })();
    try { await this.schemaReady; } catch (error) { this.schemaReady = undefined; throw error; }
  }

  private async requireAdmin(workspaceId: string, actor: AuthActor) {
    if (!uuid.test(workspaceId) || actor.kind !== 'user') throw new ForbiddenException('Human workspace administrator required');
    const member = await this.pool.query(
      "SELECT role FROM principals WHERE workspace_id = $1 AND user_id = $2 AND role IN ('owner','admin')",
      [workspaceId, actor.userId],
    );
    if (!member.rowCount) throw new ForbiddenException('Human workspace administrator required');
    return actor;
  }

  async listAgents(workspaceId: string, actor: AuthActor) {
    await this.ready(); await this.requireAdmin(workspaceId, actor);
    const result = await this.pool.query(
      'SELECT id,name,kind,fingerprint,enabled,created_at AS "createdAt" FROM access_agents WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId],
    );
    return result.rows;
  }

  async register(workspaceId: string, name: string, kind: AgentKind, publicKeyPem: string, approvalId: string, actor: AuthActor) {
    await this.ready(); await this.requireAdmin(workspaceId, actor);
    if (!name?.trim() || name.length > 80 || !['ai', 'rpa', 'test', 'service'].includes(kind) || !publicKeyPem || publicKeyPem.length > 4096) {
      throw new BadRequestException('Valid agent name, kind and public key are required');
    }
    let der: Buffer;
    try {
      const key = createPublicKey(publicKeyPem);
      if (key.asymmetricKeyType !== 'ed25519') throw new Error('Wrong key type');
      der = key.export({ format: 'der', type: 'spki' }) as Buffer;
    } catch { throw new BadRequestException('An Ed25519 public key is required'); }
    await this.platform.consumeStepUpApproval(approvalId, actor, workspaceId, 'agent.register');
    const fingerprint = createHash('sha256').update(der).digest('hex');
    const result = await this.pool.query(
      `INSERT INTO access_agents(workspace_id,name,kind,public_key_spki,fingerprint,created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id,name,kind,fingerprint,enabled,created_at AS "createdAt"`,
      [workspaceId, name.trim(), kind, der, fingerprint, actor.kind === 'user' ? actor.userId : null],
    );
    await this.platform.appendAuditEvent(workspaceId, 'agent.registered', result.rows[0].id, actor, { kind });
    return result.rows[0];
  }

  async grant(workspaceId: string, agentId: string, expiresAt: string, approvalId: string, actor: AuthActor) {
    await this.ready(); await this.requireAdmin(workspaceId, actor);
    if (!uuid.test(agentId)) throw new BadRequestException('Invalid agent');
    const expiry = new Date(expiresAt);
    if (!Number.isFinite(expiry.getTime()) || expiry.getTime() < Date.now() + 60_000 || expiry.getTime() > Date.now() + 3_600_000) {
      throw new BadRequestException('Agent grant must last between one minute and one hour');
    }
    const agent = await this.pool.query('SELECT id FROM access_agents WHERE id = $1 AND workspace_id = $2 AND enabled = true', [agentId, workspaceId]);
    if (!agent.rowCount) throw new NotFoundException('Agent not found');
    await this.platform.consumeStepUpApproval(approvalId, actor, workspaceId, 'agent.grant');
    const result = await this.pool.query(
      `INSERT INTO access_agent_grants(workspace_id,agent_id,scope,expires_at,approved_by)
       VALUES ($1,$2,'projects:read',$3,$4)
       RETURNING id,agent_id AS "agentId",scope,expires_at AS "expiresAt",created_at AS "createdAt"`,
      [workspaceId, agentId, expiry, actor.kind === 'user' ? actor.userId : null],
    );
    await this.platform.appendAuditEvent(workspaceId, 'agent.granted', result.rows[0].id, actor, { agentId, scope: 'projects:read', expiresAt });
    return result.rows[0];
  }

  async revoke(workspaceId: string, grantId: string, actor: AuthActor) {
    await this.ready(); await this.requireAdmin(workspaceId, actor);
    if (!uuid.test(grantId)) throw new BadRequestException('Invalid grant');
    const result = await this.pool.query(
      'UPDATE access_agent_grants SET revoked_at = now() WHERE id = $1 AND workspace_id = $2 AND revoked_at IS NULL RETURNING id',
      [grantId, workspaceId],
    );
    if (!result.rowCount) throw new NotFoundException('Grant not found');
    await this.platform.appendAuditEvent(workspaceId, 'agent.grant.revoked', grantId, actor);
    return { revoked: true };
  }

  async listGrants(workspaceId: string, actor: AuthActor) {
    await this.ready(); await this.requireAdmin(workspaceId, actor);
    const result = await this.pool.query(
      `SELECT g.id,g.agent_id AS "agentId",a.name AS "agentName",g.scope,g.expires_at AS "expiresAt",
       g.revoked_at AS "revokedAt",g.created_at AS "createdAt"
       FROM access_agent_grants g JOIN access_agents a ON a.id = g.agent_id
       WHERE g.workspace_id = $1 ORDER BY g.created_at DESC LIMIT 100`,
      [workspaceId],
    );
    return result.rows;
  }

  async signedProjects(workspaceId: string, request: SignedRequest) {
    await this.ready();
    if (!uuid.test(workspaceId) || request.method !== 'GET') throw new UnauthorizedException('Invalid agent request');
    const agentId = request.headers['x-forgeos-agent-id'];
    const timestamp = request.headers['x-forgeos-timestamp'];
    const nonce = request.headers['x-forgeos-nonce'];
    const signature = request.headers['x-forgeos-signature'];
    if (!agentId || !uuid.test(agentId) || !timestamp || !/^\d{13}$/.test(timestamp) ||
      Math.abs(Date.now() - Number(timestamp)) > 60_000 || !nonce || !/^[a-zA-Z0-9_-]{22,64}$/.test(nonce) ||
      !signature || !/^[a-zA-Z0-9_-]{80,100}$/.test(signature)) throw new UnauthorizedException('Invalid agent proof');
    const found = await this.pool.query(
      'SELECT id,kind,public_key_spki FROM access_agents WHERE id = $1 AND workspace_id = $2 AND enabled = true',
      [agentId, workspaceId],
    );
    if (!found.rowCount) throw new UnauthorizedException('Unknown agent');
    const canonical = `GET\n${request.originalUrl}\n${timestamp}\n${nonce}\n${emptyBodyHash}`;
    const valid = verify(null, Buffer.from(canonical), createPublicKey({ key: found.rows[0].public_key_spki, format: 'der', type: 'spki' }), Buffer.from(signature, 'base64url'));
    if (!valid) throw new UnauthorizedException('Invalid agent signature');
    const replay = await this.pool.query(
      'INSERT INTO access_agent_nonces(agent_id,nonce) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING nonce',
      [agentId, nonce],
    );
    if (!replay.rowCount) throw new UnauthorizedException('Agent request replayed');
    const grant = await this.pool.query(
      `SELECT id FROM access_agent_grants WHERE agent_id = $1 AND workspace_id = $2
       AND scope = 'projects:read' AND revoked_at IS NULL AND expires_at > now() ORDER BY expires_at DESC LIMIT 1`,
      [agentId, workspaceId],
    );
    if (!grant.rowCount) {
      await this.platform.appendAuditEvent(workspaceId, 'agent.access.denied', agentId, undefined, { scope: 'projects:read' });
      throw new ForbiddenException('No active agent grant');
    }
    const projects = await this.pool.query(
      'SELECT id,name,enabled_modules AS "moduleIds",created_at AS "createdAt" FROM projects WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId],
    );
    await this.platform.appendAuditEvent(workspaceId, 'agent.access.allowed', agentId, undefined, { scope: 'projects:read', grantId: grant.rows[0].id });
    return {
      actor: { class: 'approved_automation', agentId, declaredKind: found.rows[0].kind },
      scope: 'projects:read',
      projects: projects.rows,
    };
  }
}
