import { BadRequestException, ForbiddenException, HttpException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { connect as connectSocket } from 'node:net';
import { Client } from 'pg';
import { createConnection } from 'mysql2/promise';
import { resolveDbHost } from './dbpulse-network';
import { compareDbSnapshots, typeFamily, type DbColumn, type DbMapping, type DbSnapshot } from './dbpulse-engine';

export type DbConnectionInput = { engine: 'postgres' | 'mysql'; host: string; port: number; database: string; username: string; password: string; tls: boolean; ca?: string };
type Table = { schema: string; name: string };
type Driver = { query(sql: string, values?: unknown[]): Promise<Record<string, string | null>[]>; close(): Promise<void> };
type Saved = { scope: string; input: DbConnectionInput; expires: number; timer: ReturnType<typeof setTimeout> };
export type DbSource = { connectionId: string; schema: string; table: string };

@Injectable()
export class DbPulseService implements OnModuleDestroy {
  private readonly connections = new Map<string, Saved>();
  private active = 0;
  onModuleDestroy() { for (const value of this.connections.values()) clearTimeout(value.timer); this.connections.clear(); }
  private validate(input: DbConnectionInput) {
    if (!input || !['postgres', 'mysql'].includes(input.engine) || !Number.isInteger(input.port) || input.port < 1 || input.port > 65535 || typeof input.tls !== 'boolean') throw new BadRequestException('Choose a supported engine, valid port and TLS setting.');
    for (const key of ['host', 'database', 'username', 'password'] as const) if (typeof input[key] !== 'string' || !input[key].length || input[key].length > (key === 'password' ? 4096 : 253) || input[key].includes('\0')) throw new BadRequestException('Host, database, username and password are required and must fit the connection limits.');
    if (input.ca !== undefined && (typeof input.ca !== 'string' || input.ca.length > 20000 || (input.ca && !input.ca.includes('BEGIN CERTIFICATE')))) throw new BadRequestException('Provide a PEM CA certificate, at most 20 KB.');
  }
  private saved(id: string, scope: string) {
    const value = this.connections.get(id);
    if (!value || value.scope !== scope || value.expires <= Date.now()) throw new ForbiddenException('Connection expired or not available to this user and workspace. Reconnect.');
    return value.input;
  }
  disconnect(id: string, scope: string) {
    const value = this.connections.get(id);
    if (value?.scope === scope) { clearTimeout(value.timer); this.connections.delete(id); }
    return { disconnected: true };
  }
  private async withDb<T>(input: DbConnectionInput, run: (driver: Driver) => Promise<T>): Promise<T> {
    if (this.active >= 2) throw new HttpException('Database connector is busy. Try again after current work finishes.', 429);
    this.active++;
    let driver: Driver | undefined, stop: (() => void) | undefined, expired = false;
    let timeout: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([
        (async () => {
          const resolved = await resolveDbHost(input.host);
          if (expired) throw new Error('deadline');
          if (!input.tls && !resolved.private) throw new ForbiddenException('TLS with certificate verification is required for public database hosts.');
          if (input.engine === 'postgres') {
            const client = new Client({ host: resolved.address, port: input.port, database: input.database, user: input.username, password: input.password,
              ssl: input.tls ? { rejectUnauthorized: true, servername: input.host, ...(input.ca ? { ca: input.ca } : {}) } : false,
              application_name: 'dbpulse-readonly', connectionTimeoutMillis: 8000, query_timeout: 6000, statement_timeout: 5000,
              types: { getTypeParser: () => (value: string) => value },
            });
            client.on('error', () => { /* avoid logging connection errors or credentials */ });
            stop = () => { void client.end().catch(() => undefined); };
            driver = { query: async (sql, values) => (await client.query(sql, values)).rows, close: () => client.end() };
            await client.connect();
            await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
            await client.query("SET LOCAL idle_in_transaction_session_timeout = '10000ms'");
          } else {
            const socket = connectSocket({ host: resolved.address, port: input.port });
            socket.setTimeout(8000, () => socket.destroy());
            stop = () => socket.destroy();
            const connection = await createConnection({ host: input.host, port: input.port, database: input.database, user: input.username, password: input.password,
              stream: socket, connectTimeout: 8000, multipleStatements: false, supportBigNumbers: true, bigNumberStrings: true, dateStrings: true,
              ssl: input.tls ? { rejectUnauthorized: true, verifyIdentity: true, ...(input.ca ? { ca: input.ca } : {}) } : undefined,
              flags: ['-LOCAL_FILES'], typeCast: field => field.string(),
            });
            stop = () => connection.destroy();
            driver = { query: async (sql, values = []) => { const [rows] = await connection.query({ sql, timeout: 6000 }, values); return rows as Record<string, string | null>[]; }, close: async () => { connection.destroy(); } };
            const version = String((await driver.query('SELECT VERSION() AS version'))[0].version);
            await driver.query(version.includes('MariaDB') ? 'SET SESSION max_statement_time = 5' : 'SET SESSION max_execution_time = 5000');
            await driver.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            await driver.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
          }
          if (expired) throw new Error('deadline');
          return run(driver);
        })(),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => { expired = true; stop?.(); reject(new BadRequestException('Database operation exceeded its 15-second deadline.')); }, 15000); }),
      ]);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const code = String((error as { code?: string })?.code || '');
      const stage = ['28P01', '28000', 'ER_ACCESS_DENIED_ERROR'].includes(code) ? 'authentication' : ['42501', 'ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR'].includes(code) ? 'read permission' : /CERT|TLS|SSL|SELF_SIGNED/.test(code) ? 'TLS certificate' : 'network, permissions or query';
      throw new BadRequestException('Database ' + stage + ' check failed. Verify endpoint, CA, read-only user and table permissions. Credentials and provider error details are not returned.');
    } finally {
      clearTimeout(timeout!);
      if (driver) await driver.close().catch(() => undefined);
      else stop?.();
      this.active--;
    }
  }
  private async tables(driver: Driver, engine: string): Promise<Table[]> {
    const rows = engine === 'postgres'
      ? await driver.query("SELECT table_schema AS schema, table_name AS name FROM information_schema.tables WHERE table_catalog=current_database() AND table_type='BASE TABLE' AND table_schema NOT IN ('information_schema','pg_catalog') AND table_schema NOT LIKE 'pg_%' ORDER BY table_schema,table_name LIMIT 201")
      : await driver.query("SELECT table_schema AS `schema`, table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_schema,table_name LIMIT 201");
    return rows.map(row => ({ schema: String(row.schema), name: String(row.name) }));
  }
  async connect(scope: string, input: DbConnectionInput) {
    this.validate(input);
    if ([...this.connections.values()].filter(value => value.scope === scope).length >= 4) throw new BadRequestException('Disconnect an existing source before opening another. Four temporary connections per user/workspace are allowed.');
    const started = Date.now();
    const tables = await this.withDb(input, driver => this.tables(driver, input.engine));
    const id = randomUUID(), expires = Date.now() + 10 * 60 * 1000;
    const timer = setTimeout(() => this.connections.delete(id), 10 * 60 * 1000); timer.unref();
    this.connections.set(id, { scope, input: { ...input }, expires, timer });
    return { connectionId: id, engine: input.engine, expiresAt: new Date(expires).toISOString(), elapsedMs: Date.now() - started, tables: tables.slice(0, 200), tablesTruncated: tables.length > 200, readOnly: true };
  }
  private async columns(driver: Driver, engine: string, source: DbSource): Promise<DbColumn[]> {
    if (typeof source.schema !== 'string' || typeof source.table !== 'string' || !source.schema || !source.table || source.schema.length > 128 || source.table.length > 128 || /\0/.test(source.schema + source.table)) throw new BadRequestException('Choose a discovered schema and table.');
    const pg = engine === 'postgres', p = pg ? ['$1', '$2'] : ['?', '?'];
    const exists = await driver.query('SELECT table_name FROM information_schema.tables WHERE table_schema=' + p[0] + ' AND table_name=' + p[1] + " AND table_type='BASE TABLE'" + (pg ? ' AND table_catalog=current_database()' : ' AND table_schema=DATABASE()'), [source.schema, source.table]);
    if (!exists.length) throw new BadRequestException('Selected base table is not accessible. Views and foreign tables are not read by this adapter.');
    const rows = pg ? await driver.query("SELECT c.column_name AS name,c.data_type AS type,c.is_nullable AS nullable,CASE WHEN EXISTS(SELECT 1 FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class t ON t.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=ANY(i.indkey) WHERE i.indisprimary AND n.nspname=c.table_schema AND t.relname=c.table_name AND a.attname=c.column_name) THEN 'yes' ELSE 'no' END AS pk FROM information_schema.columns c WHERE c.table_catalog=current_database() AND c.table_schema=$1 AND c.table_name=$2 ORDER BY c.ordinal_position LIMIT 257", [source.schema, source.table])
      : await driver.query('SELECT column_name AS name,data_type AS type,is_nullable AS nullable,column_key AS pk FROM information_schema.columns WHERE table_schema=DATABASE() AND table_schema=? AND table_name=? ORDER BY ordinal_position LIMIT 257', [source.schema, source.table]);
    if (rows.length > 256) throw new BadRequestException('Tables with more than 256 columns are not supported by this adapter.');
    return rows.map(row => ({ name: String(row.name), type: String(row.type), nullable: row.nullable === 'YES', primary: row.pk === 'yes' || row.pk === 'PRI' }));
  }
  async discover(scope: string, source: DbSource) {
    const input = this.saved(source.connectionId, scope);
    return this.withDb(input, async driver => ({ columns: (await this.columns(driver, input.engine, source)).map(column => ({ ...column, supported: typeFamily(column.type) !== 'unsupported' })) }));
  }
  private async snapshot(scope: string, source: DbSource, names: string[], keys: string[], limit: number): Promise<DbSnapshot> {
    const input = this.saved(source.connectionId, scope);
    return this.withDb(input, async driver => {
      const columns = await this.columns(driver, input.engine, source);
      for (const name of names) if (!columns.some(c => c.name === name && typeFamily(c.type) !== 'unsupported')) throw new BadRequestException('A mapped column is missing or has an unsupported type.');
      const quote = (value: string) => input.engine === 'postgres' ? '"' + value.replaceAll('"', '""') + '"' : '`' + value.replaceAll('`', '``') + '`';
      const projections = names.map((name, index) => 'LEFT(CAST(' + quote(name) + (input.engine === 'postgres' ? ' AS text)' : ' AS CHAR CHARACTER SET utf8mb4)') + ',2049) AS ' + quote('c' + index));
      const sql = 'SELECT ' + projections.join(',') + ' FROM ' + quote(source.schema) + '.' + quote(source.table) + ' ORDER BY ' + keys.map(quote).join(',') + ' LIMIT ' + (limit + 1);
      const records = await driver.query(sql);
      const rows = records.slice(0, limit).map(row => names.map((_, index) => row['c' + index]));
      if (rows.some(row => row.some(value => typeof value === 'string' && value.length > 2048))) throw new BadRequestException('A selected cell exceeds the 2,048-character comparison limit. Exclude large-content columns. No equality conclusion was made.');
      if (Buffer.byteLength(JSON.stringify(rows)) > 1024 * 1024) throw new BadRequestException('Source data exceeded the 1 MiB read-window budget. Reduce columns or row limit.');
      return { columns: names.map(name => columns.find(c => c.name === name)!), rows, truncated: records.length > limit, capturedAt: new Date().toISOString() };
    });
  }
  async compare(scope: string, left: DbSource, right: DbSource, mappings: DbMapping[], limit: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Array.isArray(mappings) || !mappings.length || mappings.length > 12 || !mappings.some(m => m?.key === true)) throw new BadRequestException('Choose 1–200 rows per side, 1–12 mappings and at least one key column.');
    for (const m of mappings) if (!m || typeof m.left !== 'string' || typeof m.right !== 'string' || typeof m.key !== 'boolean' || !['strict', 'text', 'numeric', 'boolean'].includes(m.mode)) throw new BadRequestException('Invalid column mapping.');
    const start = Date.now();
    const settled = await Promise.allSettled([
      this.snapshot(scope, left, mappings.map(m => m.left), mappings.filter(m => m.key).map(m => m.left), limit),
      this.snapshot(scope, right, mappings.map(m => m.right), mappings.filter(m => m.key).map(m => m.right), limit),
    ]);
    for (const result of settled) if (result.status === 'rejected') throw result.reason;
    try {
      const result = compareDbSnapshots((settled[0] as PromiseFulfilledResult<DbSnapshot>).value, (settled[1] as PromiseFulfilledResult<DbSnapshot>).value, mappings);
      if (Buffer.byteLength(JSON.stringify(result)) > 3 * 1024 * 1024) throw new Error('Result exceeded 3 MiB. Reduce the read window.');
      return { ...result, elapsedMs: Date.now() - start, rowLimit: limit };
    } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Comparison failed.'); }
  }
}
