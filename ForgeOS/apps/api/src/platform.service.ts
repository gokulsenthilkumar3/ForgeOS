import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, NotImplementedException, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import {
  generateAuthenticationOptions, generateRegistrationOptions,
  verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { modules, type ModuleId, type Role } from '@forgeos/contracts';
import { hashPassword, verifyPassword } from './password';
import { requireHardwarePolicy, verifyHardwareAttestation, webAuthnConfig } from './webauthn-policy';
import { AuthenticationThrottle } from './authentication-throttle';

export type AuthActor = { kind: 'bootstrap' } | { kind: 'user'; userId: string; email: string };
type MemberRole = Extract<Role, 'owner' | 'admin' | 'member' | 'auditor'>;
const manageableRoles: MemberRole[] = ['owner', 'admin', 'member', 'auditor'];
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const challengeMinutes = 2;
const allowedApprovalActions = new Set(['agent.register', 'agent.grant', 'policy.update', 'audit.export', 'webauthn.enroll']);
type ChallengePurpose = 'register' | 'authenticate' | 'step-up';
type ChallengeRow = {
  id: string;
  user_id: string;
  challenge: string;
  label: string | null;
  workspace_id: string | null;
  action: string | null;
};
type CredentialRow = {
  id: string;
  user_id: string;
  public_key: Buffer;
  counter: string | number;
  transports: string[];
  label: string;
};

function validEmail(email: string) { return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validPassword(password: string) { return password.length >= 12 && password.length <= 256; }
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

@Injectable()
export class PlatformService implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  private readonly authenticationThrottle = new AuthenticationThrottle();

  private authenticationKey(scope: string, identity: string) {
    return `${scope}:${createHash('sha256').update(identity).digest('hex')}`;
  }

  private assertAuthenticationAllowed(key: string) {
    const retryAfter = this.authenticationThrottle.check(key);
    if (retryAfter !== undefined) {
      throw new HttpException({ message: 'Too many authentication attempts. Try again later.', retryAfterSeconds: retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private recordAuthenticationAttempt(key: string) {
    const retryAfter = this.authenticationThrottle.record(key);
    if (retryAfter !== undefined) {
      throw new HttpException({ message: 'Too many authentication attempts. Try again later.', retryAfterSeconds: retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

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
      const recordsMigration = await client.query('SELECT 1 FROM forgeos_migrations WHERE version = 3');
      if (!recordsMigration.rowCount) {
        await client.query('BEGIN');
        try {
          await client.query(`CREATE TABLE IF NOT EXISTS module_records (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id uuid NOT NULL REFERENCES workspaces(id),
            module_id text NOT NULL,
            record_type text NOT NULL,
            name text NOT NULL,
            content jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (workspace_id, module_id, record_type, name)
          )`);
          await client.query('CREATE INDEX IF NOT EXISTS module_records_workspace_idx ON module_records(workspace_id, module_id, updated_at DESC)');
          await client.query('INSERT INTO forgeos_migrations(version) VALUES (3)');
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      const authMigration = await client.query('SELECT 1 FROM forgeos_migrations WHERE version = 4');
      if (!authMigration.rowCount) {
        await client.query('BEGIN');
        try {
          await client.query(`CREATE TABLE IF NOT EXISTS users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email text NOT NULL UNIQUE,
            password_hash text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          )`);
          await client.query('ALTER TABLE principals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id)');
          await client.query('CREATE UNIQUE INDEX IF NOT EXISTS principals_user_workspace_unique ON principals(user_id, workspace_id) WHERE user_id IS NOT NULL');
          await client.query(`CREATE TABLE IF NOT EXISTS workspace_invitations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id uuid NOT NULL REFERENCES workspaces(id),
            email text NOT NULL,
            role forgeos_role NOT NULL,
            token_hash text NOT NULL UNIQUE,
            expires_at timestamptz NOT NULL,
            used_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now()
          )`);
          await client.query('INSERT INTO forgeos_migrations(version) VALUES (4)');
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      const webauthnMigration = await client.query('SELECT 1 FROM forgeos_migrations WHERE version = 5');
      if (!webauthnMigration.rowCount) {
        await client.query('BEGIN');
        try {
          await client.query(`CREATE TABLE IF NOT EXISTS webauthn_credentials (
            id text PRIMARY KEY,
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            public_key bytea NOT NULL,
            counter bigint NOT NULL DEFAULT 0,
            transports text[] NOT NULL DEFAULT '{}',
            label text NOT NULL,
            aaguid uuid NOT NULL,
            attestation_format text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            last_used_at timestamptz
          )`);
          await client.query('CREATE INDEX IF NOT EXISTS webauthn_credentials_user_idx ON webauthn_credentials(user_id, created_at)');
          await client.query(`CREATE TABLE IF NOT EXISTS webauthn_challenges (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES users(id) ON DELETE CASCADE,
            purpose text NOT NULL CHECK (purpose IN ('register','authenticate','step-up')),
            challenge text NOT NULL UNIQUE,
            label text,
            workspace_id uuid REFERENCES workspaces(id),
            action text,
            expires_at timestamptz NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          )`);
          await client.query('CREATE INDEX IF NOT EXISTS webauthn_challenges_expiry_idx ON webauthn_challenges(expires_at)');
          await client.query(`CREATE TABLE IF NOT EXISTS webauthn_approvals (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            workspace_id uuid REFERENCES workspaces(id),
            action text NOT NULL,
            expires_at timestamptz NOT NULL,
            used_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now()
          )`);
          await client.query('CREATE INDEX IF NOT EXISTS webauthn_approvals_expiry_idx ON webauthn_approvals(expires_at)');
          await client.query('INSERT INTO forgeos_migrations(version) VALUES (5)');
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      const auditMigration = await client.query('SELECT 1 FROM forgeos_migrations WHERE version = 6');
      if (!auditMigration.rowCount) {
        await client.query('BEGIN');
        try {
          await client.query('ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS hash_version smallint NOT NULL DEFAULT 1');
          await client.query('INSERT INTO forgeos_migrations(version) VALUES (6)');
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      await client.query(`INSERT INTO workspaces (id, name, slug, deployment_mode) VALUES ('00000000-0000-4000-8000-000000000001', 'Personal workspace', 'personal', 'self-hosted') ON CONFLICT (id) DO NOTHING`);
    } finally { await client.query('SELECT pg_advisory_unlock(72644961)'); client.release(); }
  }
  async onModuleDestroy() { await this.pool.end(); }

  async ownerRequired(): Promise<boolean> {
    const result = await this.pool.query('SELECT NOT EXISTS(SELECT 1 FROM users) AS required');
    return result.rows[0].required;
  }

  private checkBootstrapPassword(bootstrapPassword: string): void {
    const configured = process.env.FORGEOS_ADMIN_PASSWORD;
    const secret = process.env.FORGEOS_SESSION_SECRET;
    if (!configured || !secret || secret.length < 32) throw new UnauthorizedException('Owner setup is not configured');
    const throttleKey = this.authenticationKey('owner-setup', 'bootstrap');
    this.assertAuthenticationAllowed(throttleKey);
    const actual = createHmac('sha256', secret).update(bootstrapPassword).digest();
    const expected = createHmac('sha256', secret).update(configured).digest();
    if (!timingSafeEqual(actual, expected)) {
      this.recordAuthenticationAttempt(throttleKey);
      throw new UnauthorizedException('Invalid bootstrap password');
    }
    this.authenticationThrottle.reset(throttleKey);
  }

  async verifyBootstrapPassword(bootstrapPassword: string) {
    if (!await this.ownerRequired()) throw new ForbiddenException('Owner setup has ended');
    this.checkBootstrapPassword(bootstrapPassword);
    return { ok: true };
  }

  async actorForUser(userId: string): Promise<AuthActor> {
    const result = await this.pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (!result.rows[0]) throw new UnauthorizedException('Authentication required');
    return { kind: 'user', userId: result.rows[0].id, email: result.rows[0].email };
  }

  async setupOwner(rawEmail: string, password: string, bootstrapPassword: string) {
    const email = normalizeEmail(rawEmail);
    if (!validEmail(email) || !validPassword(password)) throw new BadRequestException('Enter a valid email and a password of 12–256 characters');
    this.checkBootstrapPassword(bootstrapPassword);
    const passwordHash = await hashPassword(password);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(72644962)');
      const configuredOwner = await client.query('SELECT 1 FROM users LIMIT 1');
      if (configuredOwner.rowCount) throw new ConflictException('Owner account already exists');
      const user = await client.query('INSERT INTO users(email,password_hash) VALUES ($1,$2) RETURNING id,email', [email, passwordHash]);
      await client.query(`INSERT INTO principals(workspace_id,user_id,email,role,kind)
        SELECT id,$1,$2,'owner','user' FROM workspaces`, [user.rows[0].id, email]);
      await client.query('COMMIT');
      return { userId: user.rows[0].id, email };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async loginUser(rawEmail: string, password: string) {
    const email = normalizeEmail(rawEmail);
    const throttleKey = this.authenticationKey('password-login', email);
    const reservation = this.authenticationThrottle.reserve(throttleKey);
    if (!reservation) this.assertAuthenticationAllowed(throttleKey);
    let succeeded = false;
    try {
      const result = validEmail(email) ? await this.pool.query('SELECT id,email,password_hash FROM users WHERE email = $1', [email]) : { rows: [] };
      if (!result.rows[0]) {
        await hashPassword(password);
        throw new UnauthorizedException('Invalid credentials');
      }
      if (!await verifyPassword(password, result.rows[0].password_hash)) {
        throw new UnauthorizedException('Invalid credentials');
      }
      succeeded = true;
      return { userId: result.rows[0].id, email: result.rows[0].email };
    } finally {
      this.authenticationThrottle.complete(throttleKey, reservation!, succeeded);
    }
  }

  private requireUser(actor: AuthActor): Extract<AuthActor, { kind: 'user' }> {
    if (actor.kind !== 'user') throw new ForbiddenException('A user account is required');
    return actor;
  }

  private async issueWebAuthnChallenge(purpose: ChallengePurpose, challenge: string, userId: string, label?: string, workspaceId?: string, action?: string) {
    await this.pool.query('DELETE FROM webauthn_challenges WHERE expires_at <= now()');
    const result = await this.pool.query(
      `INSERT INTO webauthn_challenges(user_id,purpose,challenge,label,workspace_id,action,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,now() + interval '2 minutes') RETURNING id`,
      [userId, purpose, challenge, label || null, workspaceId || null, action || null],
    );
    return result.rows[0].id as string;
  }

  private async claimWebAuthnChallenge(id: string, purpose: ChallengePurpose, userId?: string): Promise<ChallengeRow> {
    if (!uuidPattern.test(id)) throw new UnauthorizedException('WebAuthn challenge is invalid or expired');
    const result = await this.pool.query(
      `DELETE FROM webauthn_challenges WHERE id = $1 AND purpose = $2
       AND expires_at > now() AND ($3::uuid IS NULL OR user_id = $3)
       RETURNING id,user_id,challenge,label,workspace_id,action`,
      [id, purpose, userId || null],
    );
    if (!result.rows[0]) throw new UnauthorizedException('WebAuthn challenge is invalid or expired');
    return result.rows[0] as ChallengeRow;
  }

  async listWebAuthnCredentials(actor: AuthActor) {
    const user = this.requireUser(actor);
    const result = await this.pool.query(
      `SELECT id,label,created_at AS "createdAt",last_used_at AS "lastUsedAt"
       FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at`,
      [user.userId],
    );
    return { credentials: result.rows, count: result.rowCount || 0 };
  }

  async webAuthnRegistrationOptions(actor: AuthActor, label: string, migrationPassword?: string) {
    const user = this.requireUser(actor);
    const config = webAuthnConfig();
    requireHardwarePolicy(config);
    const registered = await this.pool.query<CredentialRow>(
      'SELECT id,transports FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at',
      [user.userId],
    );
    if (!registered.rowCount) {
      const account = await this.pool.query('SELECT password_hash FROM users WHERE id = $1', [user.userId]);
      if (!account.rows[0] || !migrationPassword || !await verifyPassword(migrationPassword, account.rows[0].password_hash)) {
        throw new UnauthorizedException('Re-enter your account password to enroll the first key');
      }
    }
    const options = await generateRegistrationOptions({
      rpName: 'ForgeOS',
      rpID: config.rpID,
      userID: Buffer.from(user.userId.replace(/-/g, ''), 'hex'),
      userName: user.email,
      attestationType: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'cross-platform',
        residentKey: 'discouraged',
        userVerification: 'required',
      },
      excludeCredentials: registered.rows.map(item => ({ id: item.id, transports: item.transports })),
      timeout: challengeMinutes * 60_000,
    });
    const challengeId = await this.issueWebAuthnChallenge('register', options.challenge, user.userId, label);
    return { challengeId, options };
  }

  async verifyWebAuthnRegistration(actor: AuthActor, challengeId: string, response: RegistrationResponseJSON, approvalId?: string) {
    const user = this.requireUser(actor);
    const challenge = await this.claimWebAuthnChallenge(challengeId, 'register', user.userId);
    const config = webAuthnConfig();
    requireHardwarePolicy(config);
    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpID,
        requireUserPresence: true,
        requireUserVerification: true,
      });
    } catch { throw new BadRequestException('Security-key registration could not be verified'); }
    if (!verification.verified) throw new BadRequestException('Security-key registration could not be verified');
    if (response.authenticatorAttachment && response.authenticatorAttachment !== 'cross-platform') {
      throw new BadRequestException('Use a separate physical security key');
    }
    await verifyHardwareAttestation(verification.registrationInfo, config);
    const registered = verification.registrationInfo.credential;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user.userId]);
      const count = await client.query('SELECT count(*)::int AS count FROM webauthn_credentials WHERE user_id = $1', [user.userId]);
      if (count.rows[0].count > 0) {
        if (!approvalId) throw new ForbiddenException('A fresh security-key approval is required for another key');
        await this.consumeStepUpApprovalOn(client, approvalId, user, null, 'webauthn.enroll');
      }
      const result = await client.query(
        `INSERT INTO webauthn_credentials(id,user_id,public_key,counter,transports,label,aaguid,attestation_format)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING
         RETURNING id,label,created_at AS "createdAt"`,
        [
          registered.id, user.userId, Buffer.from(registered.publicKey), registered.counter,
          registered.transports || [], challenge.label || 'Security key',
          verification.registrationInfo.aaguid, verification.registrationInfo.fmt,
        ],
      );
      if (!result.rows[0]) throw new ConflictException('This security key is already registered');
      await client.query('COMMIT');
      return { credentialId: result.rows[0].id, label: result.rows[0].label, createdAt: result.rows[0].createdAt };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async webAuthnAuthenticationOptions(rawEmail: string) {
    const config = webAuthnConfig();
    const email = normalizeEmail(rawEmail);
    this.recordAuthenticationAttempt(this.authenticationKey('webauthn-options', email));
    const user = validEmail(email)
      ? await this.pool.query('SELECT id FROM users WHERE email = $1', [email])
      : { rows: [] };
    const userId: string | undefined = user.rows[0]?.id;
    const registered = userId
      ? await this.pool.query<CredentialRow>('SELECT id,transports FROM webauthn_credentials WHERE user_id = $1', [userId])
      : { rows: [] as CredentialRow[] };
    // Do not issue a usable challenge for an unknown or unenrolled account.
    const available = registered.rows.length > 0;
    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      allowCredentials: available
        ? registered.rows.map(item => ({ id: item.id, transports: item.transports }))
        : [{ id: randomBytes(32).toString('base64url') }],
      userVerification: 'required',
      timeout: challengeMinutes * 60_000,
    });
    const challengeId = available
      ? await this.issueWebAuthnChallenge('authenticate', options.challenge, userId!)
      : randomUUID();
    return { challengeId, options };
  }

  private async verifyWebAuthnAssertion(challenge: ChallengeRow, response: AuthenticationResponseJSON): Promise<AuthActor & { kind: 'user' }> {
    if (typeof response?.id !== 'string' || response.id.length > 1024) {
      throw new UnauthorizedException('Security-key assertion is invalid');
    }
    const config = webAuthnConfig();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<CredentialRow>(
        `SELECT id,user_id,public_key,counter,transports,label FROM webauthn_credentials
         WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [response.id, challenge.user_id],
      );
      const credential = result.rows[0];
      if (!credential) throw new UnauthorizedException('Security-key assertion is invalid');
      let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
      try {
        verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challenge.challenge,
          expectedOrigin: config.origin,
          expectedRPID: config.rpID,
          credential: {
            id: credential.id,
            publicKey: new Uint8Array(credential.public_key),
            counter: Number(credential.counter),
            transports: credential.transports,
          },
          requireUserVerification: true,
        });
      } catch { throw new UnauthorizedException('Security-key assertion is invalid'); }
      if (!verification.verified || !verification.authenticationInfo.userVerified ||
          verification.authenticationInfo.credentialDeviceType !== 'singleDevice' ||
          verification.authenticationInfo.credentialBackedUp) {
        throw new UnauthorizedException('Security-key assertion is invalid');
      }
      await client.query(
        'UPDATE webauthn_credentials SET counter = $2,last_used_at = now() WHERE id = $1',
        [credential.id, verification.authenticationInfo.newCounter],
      );
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    return this.requireUser(await this.actorForUser(challenge.user_id));
  }

  async verifyWebAuthnAuthentication(challengeId: string, response: AuthenticationResponseJSON) {
    const challenge = await this.claimWebAuthnChallenge(challengeId, 'authenticate');
    const user = await this.verifyWebAuthnAssertion(challenge, response);
    this.authenticationThrottle.reset(this.authenticationKey('webauthn-options', user.email));
    return { userId: user.userId, email: user.email, authenticatedAt: Date.now(), method: 'webauthn' as const };
  }

  async webAuthnStepUpOptions(actor: AuthActor, action: string, workspaceId?: string) {
    const user = this.requireUser(actor);
    if (!allowedApprovalActions.has(action)) throw new BadRequestException('Unsupported approval action');
    if (action === 'webauthn.enroll') {
      if (workspaceId) throw new BadRequestException('Key enrollment is account-scoped');
    } else {
      if (!workspaceId || !uuidPattern.test(workspaceId)) throw new BadRequestException('Workspace is required');
      await this.workspace(workspaceId, user);
    }
    const config = webAuthnConfig();
    const registered = await this.pool.query<CredentialRow>(
      'SELECT id,transports FROM webauthn_credentials WHERE user_id = $1',
      [user.userId],
    );
    if (!registered.rows.length) throw new ForbiddenException('Enroll a security key first');
    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      allowCredentials: registered.rows.map(item => ({ id: item.id, transports: item.transports })),
      userVerification: 'required',
      timeout: challengeMinutes * 60_000,
    });
    const challengeId = await this.issueWebAuthnChallenge('step-up', options.challenge, user.userId, undefined, workspaceId, action);
    return { challengeId, options };
  }

  async verifyWebAuthnStepUp(actor: AuthActor, challengeId: string, response: AuthenticationResponseJSON) {
    const user = this.requireUser(actor);
    const challenge = await this.claimWebAuthnChallenge(challengeId, 'step-up', user.userId);
    await this.verifyWebAuthnAssertion(challenge, response);
    const result = await this.pool.query(
      `INSERT INTO webauthn_approvals(user_id,workspace_id,action,expires_at)
       VALUES ($1,$2,$3,now() + interval '2 minutes')
       RETURNING id,workspace_id AS "workspaceId",action,expires_at AS "expiresAt"`,
      [user.userId, challenge.workspace_id, challenge.action],
    );
    return { approvalId: result.rows[0].id, workspaceId: result.rows[0].workspaceId, action: result.rows[0].action, expiresAt: result.rows[0].expiresAt };
  }

  private async consumeStepUpApprovalOn(client: PoolClient, approvalId: string, actor: AuthActor, workspaceId: string | null, action: string) {
    const user = this.requireUser(actor);
    if (!uuidPattern.test(approvalId)) throw new ForbiddenException('Fresh security-key approval is required');
    const result = await client.query(
      `UPDATE webauthn_approvals SET used_at = now()
       WHERE id = $1 AND user_id = $2 AND workspace_id IS NOT DISTINCT FROM $3::uuid
       AND action = $4 AND used_at IS NULL AND expires_at > now()
       RETURNING id`,
      [approvalId, user.userId, workspaceId, action],
    );
    if (!result.rowCount) throw new ForbiddenException('Fresh security-key approval is required');
  }

  async consumeStepUpApproval(approvalId: string, actor: AuthActor, workspaceId: string | null, action: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.consumeStepUpApprovalOn(client, approvalId, actor, workspaceId, action);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async authorizeWorkspaceRole(workspaceId: string, actor: AuthActor, roles: MemberRole[]) {
    return this.workspace(workspaceId, actor, roles);
  }

  async createInvitation(workspaceId: string, rawEmail: string, role: MemberRole, actor: AuthActor) {
    const workspace = await this.workspace(workspaceId, actor, ['owner', 'admin']);
    const email = normalizeEmail(rawEmail);
    if (!validEmail(email) || !['admin', 'member', 'auditor'].includes(role)) throw new BadRequestException('Invalid invitation');
    if (workspace.role === 'admin' && role === 'admin') throw new ForbiddenException('Only an owner can invite an administrator');
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const result = await this.pool.query(`INSERT INTO workspace_invitations(workspace_id,email,role,token_hash,expires_at)
      VALUES ($1,$2,$3,$4,now() + interval '7 days') RETURNING id, expires_at AS "expiresAt"`,
      [workspace.id, email, role, tokenHash]);
    await this.log(workspace.id, 'workspace.invitation.created', result.rows[0].id, actor);
    return { token, email, role, expiresAt: result.rows[0].expiresAt };
  }

  async acceptInvitation(token: string, password: string) {
    if (!/^[a-zA-Z0-9_-]{43}$/.test(token) || !validPassword(password)) throw new BadRequestException('Invalid invitation or password');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const invitation = await client.query(`SELECT id,workspace_id,email,role FROM workspace_invitations
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE`, [tokenHash]);
      if (!invitation.rows[0]) throw new NotFoundException('Invitation expired or already used');
      const invite = invitation.rows[0];
      let user = (await client.query('SELECT id,email,password_hash FROM users WHERE email = $1', [invite.email])).rows[0];
      if (user) {
        if (!await verifyPassword(password, user.password_hash)) throw new UnauthorizedException('Invalid credentials');
      } else {
        const passwordHash = await hashPassword(password);
        user = (await client.query('INSERT INTO users(email,password_hash) VALUES ($1,$2) RETURNING id,email', [invite.email, passwordHash])).rows[0];
      }
      const existing = await client.query('SELECT 1 FROM principals WHERE workspace_id = $1 AND user_id = $2', [invite.workspace_id, user.id]);
      if (existing.rowCount) throw new ConflictException('Already a workspace member');
      await client.query('INSERT INTO principals(workspace_id,user_id,email,role,kind) VALUES ($1,$2,$3,$4,\'user\')', [invite.workspace_id, user.id, user.email, invite.role]);
      await client.query('UPDATE workspace_invitations SET used_at = now() WHERE id = $1', [invite.id]);
      await client.query('COMMIT');
      await this.log(invite.workspace_id, 'workspace.invitation.accepted', user.id, { kind: 'user', userId: user.id, email: user.email });
      return { userId: user.id, email: user.email };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async listMembers(workspaceId: string, actor: AuthActor) {
    await this.workspace(workspaceId, actor);
    const result = await this.pool.query(`SELECT p.user_id AS "userId", p.email, p.role, p.created_at AS "createdAt"
      FROM principals p WHERE p.workspace_id = $1 AND p.user_id IS NOT NULL ORDER BY p.created_at`, [workspaceId]);
    return result.rows;
  }

  async updateMemberRole(workspaceId: string, userId: string, role: MemberRole, actor: AuthActor) {
    await this.workspace(workspaceId, actor, ['owner']);
    if (!manageableRoles.includes(role)) throw new BadRequestException('Invalid role');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(72644963)');
      const existing = await client.query('SELECT role FROM principals WHERE workspace_id = $1 AND user_id = $2 FOR UPDATE', [workspaceId, userId]);
      if (!existing.rows[0]) throw new NotFoundException('Member not found');
      if (existing.rows[0].role === 'owner' && role !== 'owner') {
        const owners = await client.query("SELECT count(*)::int AS count FROM principals WHERE workspace_id = $1 AND role = 'owner'", [workspaceId]);
        if (owners.rows[0].count <= 1) throw new ConflictException('Workspace must retain an owner');
      }
      const result = await client.query('UPDATE principals SET role = $3 WHERE workspace_id = $1 AND user_id = $2 RETURNING user_id AS "userId",email,role', [workspaceId, userId, role]);
      await client.query('COMMIT');
      await this.log(workspaceId, 'workspace.member.role.updated', userId, actor);
      return result.rows[0];
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async listWorkspaces(actor: AuthActor) {
    const result = actor.kind === 'bootstrap'
      ? await this.pool.query(`SELECT id,name,slug,deployment_mode AS plan,enabled_modules AS "moduleIds",
          created_at AS "createdAt",'owner' AS role FROM workspaces ORDER BY created_at`)
      : await this.pool.query(`SELECT w.id,w.name,w.slug,w.deployment_mode AS plan,w.enabled_modules AS "moduleIds",
          w.created_at AS "createdAt",p.role FROM workspaces w JOIN principals p ON p.workspace_id = w.id
          WHERE p.user_id = $1 ORDER BY w.created_at`, [actor.userId]);
    return result.rows;
  }
  async createWorkspace(name: string, actor: AuthActor) {
    if (actor.kind === 'bootstrap' && !await this.ownerRequired()) throw new UnauthorizedException('Bootstrap access has ended');
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${Date.now().toString(36)}`;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`INSERT INTO workspaces (name,slug,deployment_mode) VALUES ($1,$2,$3)
        RETURNING id,name,slug,deployment_mode AS plan,enabled_modules AS "moduleIds",created_at AS "createdAt"`,
      [name, slug, process.env.FORGEOS_MODE === 'cloud' ? 'cloud' : 'self-hosted']);
      if (actor.kind === 'user') await client.query(`INSERT INTO principals(workspace_id,user_id,email,role,kind)
        VALUES ($1,$2,$3,'owner','user')`, [result.rows[0].id, actor.userId, actor.email]);
      await client.query('COMMIT');
      return { ...result.rows[0], role: 'owner' };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  private async workspace(id: string | undefined, actor: AuthActor, allowed?: MemberRole[]) {
    if (actor.kind === 'bootstrap' && !await this.ownerRequired()) throw new UnauthorizedException('Bootstrap access has ended');
    const result = actor.kind === 'bootstrap'
      ? await this.pool.query(`SELECT id,name,slug,deployment_mode AS plan,enabled_modules AS "moduleIds",
          created_at AS "createdAt",'owner' AS role FROM workspaces WHERE id = COALESCE($1::uuid,
          (SELECT id FROM workspaces ORDER BY created_at LIMIT 1))`, [id || null])
      : await this.pool.query(`SELECT w.id,w.name,w.slug,w.deployment_mode AS plan,w.enabled_modules AS "moduleIds",
          w.created_at AS "createdAt",p.role FROM workspaces w JOIN principals p ON p.workspace_id = w.id
          WHERE p.user_id = $1 AND ($2::uuid IS NULL OR w.id = $2::uuid) ORDER BY w.created_at LIMIT 1`,
        [actor.userId, id || null]);
    if (!result.rows[0]) throw new NotFoundException('Workspace not found');
    if (allowed && !allowed.includes(result.rows[0].role)) throw new ForbiddenException('Insufficient workspace role');
    return result.rows[0];
  }
  async updateWorkspaceModules(workspaceId: string, moduleIds: ModuleId[], actor: AuthActor) {
    await this.workspace(workspaceId, actor, ['owner', 'admin']);
    const result = await this.pool.query('UPDATE workspaces SET enabled_modules = $2 WHERE id = $1 RETURNING id, name, slug, deployment_mode AS plan, enabled_modules AS "moduleIds", created_at AS "createdAt"', [workspaceId, moduleIds]);
    if (!result.rows[0]) throw new NotFoundException('Workspace not found');
    await this.log(workspaceId, 'workspace.modules.updated', moduleIds.join(','), actor);
    return { ...result.rows[0], role: actor.kind === 'bootstrap' ? 'owner' : (await this.workspace(workspaceId, actor)).role };
  }
  async overview(workspaceId: string | undefined, actor: AuthActor) {
    const workspace = await this.workspace(workspaceId, actor);
    const [projects, runs, audit] = await Promise.all([
      this.listProjects(workspace.id, actor),
      this.pool.query('SELECT r.id, r.project_id AS "projectId", r.module_id AS "moduleId", r.status, r.started_at AS "startedAt", r.finished_at AS "finishedAt" FROM runs r JOIN projects p ON p.id = r.project_id WHERE p.workspace_id = $1 ORDER BY r.id DESC LIMIT 20', [workspace.id]),
      this.pool.query('SELECT id::text, workspace_id AS "workspaceId", actor_id::text AS "actorId", action, target, created_at AS "createdAt", hash FROM audit_events WHERE workspace_id = $1 ORDER BY id DESC LIMIT 20', [workspace.id]),
    ]);
    return { workspace, modules, projects, runs: runs.rows, audit: audit.rows };
  }
  async listProjects(workspaceId: string | undefined, actor: AuthActor) {
    const workspace = await this.workspace(workspaceId, actor);
    const result = await this.pool.query('SELECT id, workspace_id AS "workspaceId", name, enabled_modules AS "moduleIds", created_at AS "createdAt" FROM projects WHERE workspace_id = $1 ORDER BY created_at DESC', [workspace.id]);
    return result.rows;
  }
  async createProject(name: string, moduleIds: ModuleId[], workspaceId: string | undefined, actor: AuthActor) {
    const workspace = await this.workspace(workspaceId, actor, ['owner', 'admin', 'member']);
    if (moduleIds.some(id => !workspace.moduleIds.includes(id))) throw new NotFoundException('A selected module is disabled for this workspace');
    const result = await this.pool.query('INSERT INTO projects(workspace_id,name,enabled_modules) VALUES ($1,$2,$3) RETURNING id, workspace_id AS "workspaceId", name, enabled_modules AS "moduleIds", created_at AS "createdAt"', [workspace.id, name, moduleIds]);
    await this.log(workspace.id, 'project.created', result.rows[0].id, actor);
    return result.rows[0];
  }
  async startRun(projectId: string, moduleId: ModuleId, workspaceId: string | undefined, actor: AuthActor) {
    const workspace = await this.workspace(workspaceId, actor, ['owner', 'admin', 'member']);
    const project = await this.pool.query('SELECT id, enabled_modules FROM projects WHERE id = $1 AND workspace_id = $2', [projectId, workspace.id]);
    if (!project.rows[0]) throw new NotFoundException('Project not found');
    if (!project.rows[0].enabled_modules.includes(moduleId)) throw new NotFoundException('Module is not enabled for this project');
    if (!workspace.moduleIds.includes(moduleId)) throw new NotFoundException('Module is disabled for this workspace');
    throw new NotImplementedException(`No background runner is configured for ${moduleId}`);
  }
  async completeRun(runId: string, passed: boolean, workspaceId: string | undefined, actor: AuthActor) {
    const workspace = await this.workspace(workspaceId, actor, ['owner', 'admin', 'member']);
    const result = await this.pool.query('UPDATE runs r SET status = $1, finished_at = now() FROM projects p WHERE r.project_id = p.id AND r.id = $2 AND p.workspace_id = $3 RETURNING r.id, r.project_id AS "projectId", r.module_id AS "moduleId", r.status, r.finished_at AS "finishedAt"', [passed ? 'passed' : 'failed', runId, workspace.id]);
    if (!result.rows[0]) throw new NotFoundException('Run not found');
    await this.log(workspace.id, 'run.completed', runId, actor);
    return result.rows[0];
  }
  async listModuleRecords(moduleId: ModuleId, workspaceId: string | undefined, actor: AuthActor) {
    const workspace = await this.workspace(workspaceId, actor);
    if (!workspace.moduleIds.includes(moduleId)) throw new NotFoundException('Module is disabled for this workspace');
    const result = await this.pool.query('SELECT id, workspace_id AS "workspaceId", module_id AS "moduleId", record_type AS "recordType", name, content, created_at AS "createdAt", updated_at AS "updatedAt" FROM module_records WHERE workspace_id = $1 AND module_id = $2 ORDER BY updated_at DESC', [workspace.id, moduleId]);
    return result.rows;
  }
  async saveModuleRecord(moduleId: ModuleId, recordType: string, name: string, content: Record<string, unknown>, workspaceId: string | undefined, actor: AuthActor) {
    const workspace = await this.workspace(workspaceId, actor, ['owner', 'admin', 'member']);
    if (!workspace.moduleIds.includes(moduleId)) throw new NotFoundException('Module is disabled for this workspace');
    const result = await this.pool.query('INSERT INTO module_records(workspace_id,module_id,record_type,name,content) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (workspace_id,module_id,record_type,name) DO UPDATE SET content = EXCLUDED.content, updated_at = now() RETURNING id, workspace_id AS "workspaceId", module_id AS "moduleId", record_type AS "recordType", name, content, created_at AS "createdAt", updated_at AS "updatedAt"', [workspace.id, moduleId, recordType, name, JSON.stringify(content)]);
    await this.log(workspace.id, 'module.record.saved', `${moduleId}:${result.rows[0].id}`, actor);
    return result.rows[0];
  }
  async appendAuditEvent(workspaceId: string, action: string, target: string, actor?: AuthActor, payload: Record<string, unknown> = {}) {
    if (!uuidPattern.test(workspaceId) || action.length > 100 || target.length > 300) throw new BadRequestException('Invalid audit event');
    const payloadJson = canonicalJson(payload);
    if (payloadJson.length > 16_384) throw new BadRequestException('Audit metadata is too large');
    const actorId = actor?.kind === 'user' ? actor.userId : null;
    const createdAt = new Date().toISOString();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // The advisory lock serializes the read of the prior hash and the insert
      // for a workspace, including when multiple API replicas write at once.
      await client.query('SELECT pg_advisory_xact_lock(72644963, hashtext($1))', [workspaceId]);
      const previous = await client.query('SELECT hash FROM audit_events WHERE workspace_id = $1 ORDER BY id DESC LIMIT 1', [workspaceId]);
      const previousHash = previous.rows[0]?.hash ?? 'GENESIS';
      const hash = createHash('sha256').update(canonicalJson({
        version: 2, previousHash, workspaceId, actorId, action, target, payload, createdAt,
      })).digest('hex');
      const inserted = await client.query(
        `INSERT INTO audit_events(workspace_id,actor_id,action,target,payload,previous_hash,hash,hash_version,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,2,$8) RETURNING id::text,hash`,
        [workspaceId, actorId, action, target, payloadJson, previousHash, hash, createdAt],
      );
      await client.query('COMMIT');
      return inserted.rows[0] as { id: string; hash: string };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  private async log(workspaceId: string, action: string, target: string, actor?: AuthActor) {
    await this.appendAuditEvent(workspaceId, action, target, actor);
  }
}
