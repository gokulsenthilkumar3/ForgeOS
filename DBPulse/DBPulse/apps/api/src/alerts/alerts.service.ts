import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuditEvent } from '@dbpulse/shared';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertConditionOp = 'eq' | 'neq' | 'contains' | 'in' | 'any';

export interface AlertCondition {
  field: 'operation' | 'tableName' | 'actor' | 'schemaName';
  op: AlertConditionOp;
  value: string | string[];
}

export interface AlertRule {
  id: string;
  connectionId: string;
  name: string;
  severity: AlertSeverity;
  conditions: AlertCondition[];   // all must match (AND)
  notifyChannels: string[];       // 'webhook' | 'log' — extend later
  webhookUrl?: string;
  enabled: boolean;
  createdAt: string;
}

export interface AlertFiring {
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  event: AuditEvent;
  firedAt: string;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly supabase: SupabaseClient;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async createRule(payload: Omit<AlertRule, 'id' | 'createdAt'>): Promise<AlertRule> {
    const { data, error } = await this.supabase
      .from('alert_rules')
      .insert({
        connection_id: payload.connectionId,
        name: payload.name,
        severity: payload.severity,
        conditions: payload.conditions,
        notify_channels: payload.notifyChannels,
        webhook_url: payload.webhookUrl,
        enabled: payload.enabled ?? true,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return this.mapRule(data);
  }

  async listRules(connectionId?: string): Promise<AlertRule[]> {
    let q = this.supabase.from('alert_rules').select('*').order('created_at', { ascending: false });
    if (connectionId) q = q.eq('connection_id', connectionId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapRule);
  }

  async updateRule(id: string, patch: Partial<Omit<AlertRule, 'id' | 'createdAt'>>): Promise<AlertRule> {
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.severity !== undefined) update.severity = patch.severity;
    if (patch.conditions !== undefined) update.conditions = patch.conditions;
    if (patch.notifyChannels !== undefined) update.notify_channels = patch.notifyChannels;
    if (patch.webhookUrl !== undefined) update.webhook_url = patch.webhookUrl;
    if (patch.enabled !== undefined) update.enabled = patch.enabled;

    const { data, error } = await this.supabase
      .from('alert_rules').update(update).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return this.mapRule(data);
  }

  async deleteRule(id: string): Promise<void> {
    const { error } = await this.supabase.from('alert_rules').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ── Evaluation ──────────────────────────────────────────────────────────────

  /** Evaluate all enabled rules against an incoming event; fire matches */
  async evaluate(event: AuditEvent): Promise<AlertFiring[]> {
    const rules = await this.listRules(event.connectionId);
    const enabled = rules.filter((r) => r.enabled);
    const fired: AlertFiring[] = [];

    for (const rule of enabled) {
      if (this.matchesAllConditions(event, rule.conditions)) {
        const firing: AlertFiring = {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          event,
          firedAt: new Date().toISOString(),
        };
        fired.push(firing);
        await this.dispatch(rule, firing);
      }
    }

    return fired;
  }

  private matchesAllConditions(event: AuditEvent, conditions: AlertCondition[]): boolean {
    return conditions.every((cond) => {
      const actual = (event as any)[cond.field] as string | undefined;
      switch (cond.op) {
        case 'eq':       return actual === cond.value;
        case 'neq':      return actual !== cond.value;
        case 'contains': return typeof actual === 'string' && actual.includes(cond.value as string);
        case 'in':       return Array.isArray(cond.value) && cond.value.includes(actual ?? '');
        case 'any':      return true;
        default:         return false;
      }
    });
  }

  private async dispatch(rule: AlertRule, firing: AlertFiring): Promise<void> {
    this.logger.warn(
      `[ALERT:${rule.severity.toUpperCase()}] "${rule.name}" fired — ` +
      `${firing.event.operation} on ${firing.event.tableName} by ${firing.event.actor}`,
    );

    // Persist firing to DB
    await this.supabase.from('alert_firings').insert({
      rule_id: firing.ruleId,
      connection_id: firing.event.connectionId,
      severity: firing.severity,
      event_id: firing.event.id,
      event_snapshot: firing.event,
      fired_at: firing.firedAt,
    });

    // Webhook delivery
    if (rule.webhookUrl && rule.notifyChannels.includes('webhook')) {
      try {
        await fetch(rule.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firing),
          signal: AbortSignal.timeout(5_000),
        });
      } catch (err) {
        this.logger.error(`Webhook delivery failed for rule ${rule.id}: ${err}`);
      }
    }
  }

  private mapRule(row: any): AlertRule {
    return {
      id: row.id,
      connectionId: row.connection_id,
      name: row.name,
      severity: row.severity,
      conditions: row.conditions,
      notifyChannels: row.notify_channels,
      webhookUrl: row.webhook_url,
      enabled: row.enabled,
      createdAt: row.created_at,
    };
  }
}
