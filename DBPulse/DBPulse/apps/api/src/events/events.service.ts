import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuditEvent } from '@dbpulse/shared';
import { computeDiff } from '@dbpulse/diff-engine';

export interface EventQueryFilters {
  connectionId?: string;
  tableName?: string;
  actor?: string;
  operation?: string;
  schemaName?: string;
  search?: string;       // full-text search on raw_query / table_name / actor
  since?: string;        // ISO timestamp
  until?: string;        // ISO timestamp
  limit?: number;
  offset?: number;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly supabase: SupabaseClient;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async saveEvent(event: AuditEvent): Promise<AuditEvent> {
    const diff = computeDiff(
      event.beforeState ?? null,
      event.afterState ?? null,
    );

    const { data, error } = await this.supabase
      .from('audit_events')
      .insert({
        connection_id: event.connectionId,
        database_name: event.databaseName,
        schema_name: event.schemaName,
        table_name: event.tableName,
        operation: event.operation,
        actor: event.actor,
        session_info: event.sessionInfo,
        before_state: event.beforeState,
        after_state: event.afterState,
        diff_columns: diff.changedColumns,
        raw_query: event.rawQuery,
        event_hash: event.eventHash,
      })
      .select().single();

    if (error) {
      this.logger.error(`Failed to save event: ${error.message}`);
      throw new Error(error.message);
    }

    return this.mapRow(data);
  }

  async queryEvents(filters: EventQueryFilters): Promise<{ data: AuditEvent[]; total: number }> {
    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = filters.offset ?? 0;

    let query = this.supabase
      .from('audit_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.connectionId) query = query.eq('connection_id', filters.connectionId);
    if (filters.tableName)    query = query.eq('table_name', filters.tableName);
    if (filters.actor)        query = query.eq('actor', filters.actor);
    if (filters.operation)    query = query.eq('operation', filters.operation);
    if (filters.schemaName)   query = query.eq('schema_name', filters.schemaName);
    if (filters.since)        query = query.gte('created_at', filters.since);
    if (filters.until)        query = query.lte('created_at', filters.until);
    if (filters.search) {
      query = query.or(
        `table_name.ilike.%${filters.search}%,actor.ilike.%${filters.search}%,raw_query.ilike.%${filters.search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: (data ?? []).map(this.mapRow), total: count ?? 0 };
  }

  async getEventById(id: string): Promise<AuditEvent | null> {
    const { data, error } = await this.supabase
      .from('audit_events').select('*').eq('id', id).single();
    if (error) return null;
    return this.mapRow(data);
  }

  async getEventStats(connectionId: string): Promise<Record<string, unknown>> {
    const [byOp, byTable, byActor] = await Promise.all([
      this.supabase.rpc('dbpulse_stats_by_operation', { p_connection_id: connectionId }),
      this.supabase.rpc('dbpulse_stats_by_table', { p_connection_id: connectionId }),
      this.supabase.rpc('dbpulse_stats_by_actor', { p_connection_id: connectionId }),
    ]);
    return {
      byOperation: byOp.data ?? [],
      byTable: byTable.data ?? [],
      byActor: byActor.data ?? [],
    };
  }

  private mapRow(row: any): AuditEvent {
    return {
      id: row.id,
      connectionId: row.connection_id,
      databaseName: row.database_name,
      schemaName: row.schema_name,
      tableName: row.table_name,
      operation: row.operation,
      actor: row.actor,
      sessionInfo: row.session_info,
      beforeState: row.before_state,
      afterState: row.after_state,
      diffColumns: row.diff_columns,
      rawQuery: row.raw_query,
      eventHash: row.event_hash,
      createdAt: row.created_at,
    };
  }
}
