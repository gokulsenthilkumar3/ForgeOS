import { Pool, PoolClient } from 'pg';
import crypto from 'node:crypto';
import { IConnector, AuditEvent, ConnectionConfig } from '@dbpulse/shared';

type NotifyPayload = {
  schema?: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  actor?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  query?: string;
  txid?: string;
  at?: string;
};

const AUDIT_CHANNEL = 'dbpulse_audit';
const DEFAULT_PORT = 5432;

export class PostgresConnector implements IConnector {
  private pool: Pool | null = null;
  private listenerClient: PoolClient | null = null;
  private listening = false;
  private heartbeat: NodeJS.Timeout | null = null;

  constructor(private readonly config: ConnectionConfig) {}

  async connect(): Promise<void> {
    if (this.pool) return;

    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port ?? DEFAULT_PORT,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    await this.pool.query('SELECT 1');
  }

  async disconnect(): Promise<void> {
    await this.stopListening();
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async startListening(onEvent: (event: AuditEvent) => void): Promise<void> {
    if (!this.pool) {
      await this.connect();
    }
    if (!this.pool || this.listening) return;

    await this.ensureAuditInfrastructure();

    this.listenerClient = await this.pool.connect();
    this.listenerClient.on('notification', (msg) => {
      if (msg.channel !== AUDIT_CHANNEL || !msg.payload) return;
      try {
        const payload = JSON.parse(msg.payload) as NotifyPayload;
        const event = this.mapPayloadToAuditEvent(payload);
        onEvent(event);
      } catch (error) {
        console.error('[PostgresConnector] Failed to parse notification payload', error);
      }
    });

    this.listenerClient.on('error', (error) => {
      console.error('[PostgresConnector] Listener error', error);
    });

    await this.listenerClient.query(`LISTEN ${AUDIT_CHANNEL}`);
    this.listening = true;
    this.startHeartbeat();
  }

  async stopListening(): Promise<void> {
    this.stopHeartbeat();
    if (this.listenerClient) {
      try {
        await this.listenerClient.query(`UNLISTEN ${AUDIT_CHANNEL}`);
      } catch {}
      this.listenerClient.release();
      this.listenerClient = null;
    }
    this.listening = false;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.pool) await this.connect();
      await this.pool?.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async ensureAuditInfrastructure(): Promise<void> {
    if (!this.pool) return;

    await this.pool.query(`
      CREATE OR REPLACE FUNCTION public.dbpulse_notify_event() RETURNS trigger AS $$
      DECLARE
        payload jsonb;
      BEGIN
        payload := jsonb_build_object(
          'schema', TG_TABLE_SCHEMA,
          'table', TG_TABLE_NAME,
          'operation', TG_OP,
          'actor', current_user,
          'before', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
          'after', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
          'query', current_query(),
          'txid', txid_current()::text,
          'at', now()
        );
        PERFORM pg_notify('${AUDIT_CHANNEL}', payload::text);
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = setInterval(async () => {
      try {
        await this.listenerClient?.query('SELECT 1');
      } catch (error) {
        console.error('[PostgresConnector] Heartbeat failed', error);
      }
    }, 30_000);
  }

  private stopHeartbeat() {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private mapPayloadToAuditEvent(payload: NotifyPayload): AuditEvent {
    const tableName = payload.table;
    const createdAt = payload.at ? new Date(payload.at).toISOString() : new Date().toISOString();
    const hashSource = JSON.stringify({
      txid: payload.txid,
      table: payload.table,
      operation: payload.operation,
      before: payload.before,
      after: payload.after,
      at: createdAt,
    });

    return {
      id: crypto.randomUUID(),
      connectionId: this.config.id,
      databaseName: this.config.database,
      schemaName: payload.schema,
      tableName,
      operation: payload.operation,
      actor: payload.actor ?? 'unknown',
      sessionInfo: payload.txid ? { txid: payload.txid } : undefined,
      beforeState: payload.before ?? null,
      afterState: payload.after ?? null,
      diffColumns: [],
      rawQuery: payload.query,
      eventHash: crypto.createHash('sha256').update(hashSource).digest('hex'),
      createdAt,
    };
  }
}
