// ─── Connection Config ───────────────────────────────────────────────────────

export type DbEngine = 'postgres' | 'mysql';

export interface ConnectionConfig {
  id: string;
  name: string;
  engine: DbEngine;
  host: string;
  port: number;
  database: string;
  username: string;
  /** Decrypted at runtime; never log or persist in plaintext */
  password: string;
  ssl?: boolean;
}

// ─── Audit Event ─────────────────────────────────────────────────────────────

export type DmlOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';

export interface AuditEvent {
  id: string;
  connectionId: string;
  databaseName: string;
  schemaName?: string;
  tableName: string;
  operation: DmlOperation;
  actor: string;
  sessionInfo?: Record<string, unknown>;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  diffColumns?: string[];
  rawQuery?: string;
  eventHash?: string;
  createdAt: string;
}

// ─── Connector Interface ─────────────────────────────────────────────────────

export interface IConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startListening(onEvent: (event: AuditEvent) => void): Promise<void>;
  stopListening(): Promise<void>;
  ping(): Promise<boolean>;
}

// ─── Re-export crypto utils ──────────────────────────────────────────────────

export { encrypt, decrypt, tryDecrypt } from './crypto';
