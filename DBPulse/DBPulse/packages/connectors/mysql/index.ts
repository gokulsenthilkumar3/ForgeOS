import crypto from 'node:crypto';
import mysql2 from 'mysql2/promise';
import ZongJi from 'zongji';
import { IConnector, AuditEvent, ConnectionConfig, DmlOperation } from '@dbpulse/shared';

type RowsEvent = {
  getEventName(): string;
  tableMap: Record<number, { parentSchema: string; tableName: string; columns: { name: string }[] }>;
  rows: Record<string, unknown>[];
};

const BINLOG_EVENT_MAP: Record<string, DmlOperation> = {
  writerows: 'INSERT',
  updaterows: 'UPDATE',
  deleterows: 'DELETE',
};

export class MySQLConnector implements IConnector {
  private pool: mysql2.Pool | null = null;
  private zongji: any | null = null;
  private listening = false;
  private heartbeat: NodeJS.Timeout | null = null;

  constructor(private readonly config: ConnectionConfig) {}

  async connect(): Promise<void> {
    if (this.pool) return;
    this.pool = mysql2.createPool({
      host: this.config.host,
      port: this.config.port ?? 3306,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 10_000,
    });
    // Verify connection
    const conn = await this.pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
  }

  async disconnect(): Promise<void> {
    await this.stopListening();
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async startListening(onEvent: (event: AuditEvent) => void): Promise<void> {
    if (!this.pool) await this.connect();
    if (this.listening) return;

    await this.ensureBinlogPrerequisites();

    this.zongji = new ZongJi({
      host: this.config.host,
      port: this.config.port ?? 3306,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
    });

    this.zongji.on('binlog', (evt: RowsEvent) => {
      const eventName = evt.getEventName().toLowerCase();
      const operation = BINLOG_EVENT_MAP[eventName];
      if (!operation) return;

      const tableId = Object.keys(evt.tableMap)[0];
      const tableInfo = evt.tableMap[Number(tableId)];
      if (!tableInfo) return;

      // Filter to only the configured database
      if (tableInfo.parentSchema !== this.config.database) return;

      const columns = tableInfo.columns.map((c) => c.name);

      for (const row of evt.rows) {
        let beforeState: Record<string, unknown> | null = null;
        let afterState: Record<string, unknown> | null = null;

        if (operation === 'UPDATE') {
          const pair = row as { before: Record<string, unknown>; after: Record<string, unknown> };
          beforeState = this.zipColumns(columns, Object.values(pair.before));
          afterState = this.zipColumns(columns, Object.values(pair.after));
        } else if (operation === 'INSERT') {
          afterState = this.zipColumns(columns, Object.values(row));
        } else if (operation === 'DELETE') {
          beforeState = this.zipColumns(columns, Object.values(row));
        }

        const event = this.buildAuditEvent({
          tableName: tableInfo.tableName,
          schemaName: tableInfo.parentSchema,
          operation,
          beforeState,
          afterState,
        });

        onEvent(event);
      }
    });

    this.zongji.on('error', (err: Error) => {
      console.error('[MySQLConnector] ZongJi error', err);
    });

    this.zongji.start({
      includeEvents: ['tablemap', 'writerows', 'updaterows', 'deleterows'],
      includeSchema: { [this.config.database]: true },
      startAtEnd: true,
    });

    this.listening = true;
    this.startHeartbeat();
  }

  async stopListening(): Promise<void> {
    this.stopHeartbeat();
    if (this.zongji) {
      this.zongji.stop();
      this.zongji = null;
    }
    this.listening = false;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.pool) await this.connect();
      const conn = await this.pool!.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureBinlogPrerequisites(): Promise<void> {
    if (!this.pool) return;
    const conn = await this.pool.getConnection();
    try {
      // Check binlog_format is ROW (required for ZongJi)
      const [rows] = await conn.query<any[]>(
        "SHOW VARIABLES LIKE 'binlog_format';"
      );
      const format = rows?.[0]?.Value?.toUpperCase();
      if (format && format !== 'ROW') {
        console.warn(
          `[MySQLConnector] binlog_format is '${format}'; ROW format is required for full row capture. ` +
          `Set binlog_format=ROW in your MySQL config.`
        );
      }

      // Check binlog_row_image (FULL is needed for before/after state)
      const [imgRows] = await conn.query<any[]>(
        "SHOW VARIABLES LIKE 'binlog_row_image';"
      );
      const image = imgRows?.[0]?.Value?.toUpperCase();
      if (image && image !== 'FULL') {
        console.warn(
          `[MySQLConnector] binlog_row_image is '${image}'; FULL image is recommended for complete before/after state.`
        );
      }
    } finally {
      conn.release();
    }
  }

  private zipColumns(
    columns: string[],
    values: unknown[],
  ): Record<string, unknown> {
    return Object.fromEntries(columns.map((col, i) => [col, values[i] ?? null]));
  }

  private buildAuditEvent(params: {
    tableName: string;
    schemaName: string;
    operation: DmlOperation;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
  }): AuditEvent {
    const createdAt = new Date().toISOString();
    const hashSource = JSON.stringify({
      table: params.tableName,
      operation: params.operation,
      before: params.beforeState,
      after: params.afterState,
      at: createdAt,
    });

    return {
      id: crypto.randomUUID(),
      connectionId: this.config.id,
      databaseName: this.config.database,
      schemaName: params.schemaName,
      tableName: params.tableName,
      operation: params.operation,
      actor: this.config.username,  // binlog doesn't expose per-statement actor
      sessionInfo: undefined,
      beforeState: params.beforeState,
      afterState: params.afterState,
      diffColumns: [],
      rawQuery: undefined,           // binlog doesn't expose raw SQL in ROW format
      eventHash: crypto.createHash('sha256').update(hashSource).digest('hex'),
      createdAt,
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = setInterval(async () => {
      try {
        const conn = await this.pool!.getConnection();
        await conn.query('SELECT 1');
        conn.release();
      } catch (err) {
        console.error('[MySQLConnector] Heartbeat failed', err);
      }
    }, 30_000);
  }

  private stopHeartbeat() {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }
}
