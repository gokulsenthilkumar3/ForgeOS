import { Pool } from 'pg';
import { ConnectionConfig } from '@dbpulse/shared';

export interface TriggerStatus {
  schema: string;
  table: string;
  triggerExists: boolean;
  truncateTriggerExists: boolean;
  installed: boolean;
  skipped: boolean;
  error?: string;
}

/** Schemas that should never be audited */
const EXCLUDED_SCHEMAS = new Set(['pg_catalog', 'information_schema', 'pg_toast']);

/** Tables that should never be audited (system / supabase internals) */
const EXCLUDED_TABLES = new Set([
  'schema_migrations',
  'spatial_ref_sys',
  'audit_events',
  'db_connections',
]);

export async function installAuditTriggers(
  pool: Pool,
  config: ConnectionConfig,
  options: {
    schemas?: string[];       // default: ['public']
    dryRun?: boolean;         // if true, only reports — no DDL is run
    includeTruncate?: boolean; // default: true
  } = {},
): Promise<TriggerStatus[]> {
  const schemas = options.schemas ?? ['public'];
  const dryRun = options.dryRun ?? false;
  const includeTruncate = options.includeTruncate ?? true;

  // 1. Fetch all user tables in requested schemas
  const { rows: tables } = await pool.query<{ schema_name: string; table_name: string }>(`
    SELECT table_schema AS schema_name, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema = ANY($1::text[])
    ORDER BY table_schema, table_name;
  `, [schemas]);

  // 2. Fetch all existing dbpulse triggers in one shot
  const { rows: existingTriggers } = await pool.query<{
    event_object_schema: string;
    event_object_table: string;
    trigger_name: string;
  }>(`
    SELECT event_object_schema, event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'dbpulse_%'
    ORDER BY event_object_schema, event_object_table;
  `);

  const triggerSet = new Set(
    existingTriggers.map((r) => `${r.event_object_schema}.${r.event_object_table}.row`),
  );
  const truncateSet = new Set(
    existingTriggers.map((r) => `${r.event_object_schema}.${r.event_object_table}.truncate`),
  );

  const results: TriggerStatus[] = [];

  for (const { schema_name, table_name } of tables) {
    const rowKey = `${schema_name}.${table_name}.row`;
    const truncateKey = `${schema_name}.${table_name}.truncate`;
    const triggerExists = triggerSet.has(rowKey);
    const truncateTriggerExists = truncateSet.has(truncateKey);

    const status: TriggerStatus = {
      schema: schema_name,
      table: table_name,
      triggerExists,
      truncateTriggerExists,
      installed: false,
      skipped: false,
    };

    // Skip excluded schemas/tables
    if (EXCLUDED_SCHEMAS.has(schema_name) || EXCLUDED_TABLES.has(table_name)) {
      status.skipped = true;
      results.push(status);
      continue;
    }

    // Already fully installed
    if (triggerExists && (!includeTruncate || truncateTriggerExists)) {
      status.skipped = true;
      results.push(status);
      continue;
    }

    if (dryRun) {
      status.installed = true; // would-be install
      results.push(status);
      continue;
    }

    try {
      const rowTriggerName = `dbpulse_${table_name}_audit`;
      const truncateTriggerName = `dbpulse_${table_name}_truncate_audit`;

      if (!triggerExists) {
        await pool.query(`
          CREATE TRIGGER ${rowTriggerName}
          AFTER INSERT OR UPDATE OR DELETE
          ON ${schema_name}.${table_name}
          FOR EACH ROW EXECUTE FUNCTION public.dbpulse_notify_event();
        `);
      }

      if (includeTruncate && !truncateTriggerExists) {
        await pool.query(`
          CREATE TRIGGER ${truncateTriggerName}
          AFTER TRUNCATE
          ON ${schema_name}.${table_name}
          FOR EACH STATEMENT EXECUTE FUNCTION public.dbpulse_notify_event();
        `);
      }

      status.triggerExists = true;
      status.truncateTriggerExists = includeTruncate;
      status.installed = true;
    } catch (err: any) {
      status.error = err?.message ?? String(err);
    }

    results.push(status);
  }

  return results;
}

export async function removeAuditTriggers(
  pool: Pool,
  schemas: string[] = ['public'],
): Promise<{ schema: string; table: string; dropped: string[] }[]> {
  const { rows } = await pool.query<{
    event_object_schema: string;
    event_object_table: string;
    trigger_name: string;
  }>(`
    SELECT event_object_schema, event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'dbpulse_%'
      AND event_object_schema = ANY($1::text[])
    ORDER BY event_object_schema, event_object_table;
  `, [schemas]);

  const grouped = new Map<string, { schema: string; table: string; triggers: string[] }>();
  for (const row of rows) {
    const key = `${row.event_object_schema}.${row.event_object_table}`;
    if (!grouped.has(key)) {
      grouped.set(key, { schema: row.event_object_schema, table: row.event_object_table, triggers: [] });
    }
    grouped.get(key)!.triggers.push(row.trigger_name);
  }

  const results = [];
  for (const { schema, table, triggers } of grouped.values()) {
    const dropped: string[] = [];
    for (const triggerName of triggers) {
      await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON ${schema}.${table};`);
      dropped.push(triggerName);
    }
    results.push({ schema, table, dropped });
  }

  return results;
}

export async function listAuditTriggers(
  pool: Pool,
  schemas: string[] = ['public'],
): Promise<{ schema: string; table: string; triggers: string[] }[]> {
  const { rows } = await pool.query<{
    event_object_schema: string;
    event_object_table: string;
    trigger_name: string;
  }>(`
    SELECT event_object_schema, event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'dbpulse_%'
      AND event_object_schema = ANY($1::text[])
    ORDER BY event_object_schema, event_object_table, trigger_name;
  `, [schemas]);

  const grouped = new Map<string, { schema: string; table: string; triggers: string[] }>();
  for (const row of rows) {
    const key = `${row.event_object_schema}.${row.event_object_table}`;
    if (!grouped.has(key)) {
      grouped.set(key, { schema: row.event_object_schema, table: row.event_object_table, triggers: [] });
    }
    grouped.get(key)!.triggers.push(row.trigger_name);
  }

  return [...grouped.values()];
}
