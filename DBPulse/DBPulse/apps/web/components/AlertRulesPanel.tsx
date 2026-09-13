'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import clsx from 'clsx';

const SEVERITY_COLOR: Record<string, string> = {
  info:     'text-sky-400 bg-sky-950/40 border-sky-900',
  warning:  'text-amber-400 bg-amber-950/40 border-amber-900',
  critical: 'text-rose-400 bg-rose-950/40 border-rose-900',
};

export function AlertRulesPanel({ connectionId }: { connectionId: string | null }) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '', severity: 'warning', operation: 'DELETE',
    tableName: '', actor: '', webhookUrl: '',
  });

  const load = async () => {
    if (!connectionId) return;
    setLoading(true);
    api.listAlertRules(connectionId).then(setRules).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [connectionId]);

  const create = async () => {
    if (!connectionId || !form.name) return;
    const conditions: any[] = [];
    if (form.operation) conditions.push({ field: 'operation', op: 'eq', value: form.operation });
    if (form.tableName) conditions.push({ field: 'tableName', op: 'eq', value: form.tableName });
    if (form.actor)     conditions.push({ field: 'actor', op: 'eq', value: form.actor });

    await api.createAlertRule({
      connectionId, name: form.name, severity: form.severity,
      conditions, notifyChannels: form.webhookUrl ? ['log', 'webhook'] : ['log'],
      webhookUrl: form.webhookUrl || undefined, enabled: true,
    });
    setCreating(false);
    setForm({ name: '', severity: 'warning', operation: 'DELETE', tableName: '', actor: '', webhookUrl: '' });
    load();
  };

  const toggle = async (rule: any) => {
    await api.updateAlertRule(rule.id, { enabled: !rule.enabled });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this alert rule?')) return;
    await api.deleteAlertRule(id);
    load();
  };

  if (!connectionId) {
    return <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Select a connection to manage alerts</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-slate-400">Alert Rules</h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="px-3 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold"
        >
          {creating ? 'Cancel' : '+ New Rule'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
          <h3 className="text-xs text-slate-400 uppercase tracking-widest">New Rule</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rule name">
              <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Users deleted" />
            </Field>
            <Field label="Severity">
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-xs outline-none focus:border-brand"
              >
                {['info', 'warning', 'critical'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Operation (optional)">
              <select
                value={form.operation}
                onChange={(e) => setForm((f) => ({ ...f, operation: e.target.value }))}
                className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-xs outline-none focus:border-brand"
              >
                <option value="">Any</option>
                {['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].map((op) => <option key={op}>{op}</option>)}
              </select>
            </Field>
            <Field label="Table (optional)">
              <Input value={form.tableName} onChange={(v) => setForm((f) => ({ ...f, tableName: v }))} placeholder="e.g. users" />
            </Field>
            <Field label="Actor (optional)">
              <Input value={form.actor} onChange={(v) => setForm((f) => ({ ...f, actor: v }))} placeholder="e.g. admin" />
            </Field>
            <Field label="Webhook URL (optional)">
              <Input value={form.webhookUrl} onChange={(v) => setForm((f) => ({ ...f, webhookUrl: v }))} placeholder="https://hooks.slack.com/..." />
            </Field>
          </div>
          <button onClick={create} className="px-4 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold">
            Create Rule
          </button>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <p className="text-slate-600 text-xs">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-slate-600 text-xs">No alert rules yet.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx('text-xs px-2 py-0.5 rounded border font-semibold', SEVERITY_COLOR[rule.severity])}>
                    {rule.severity}
                  </span>
                  <span className="text-slate-100 text-sm truncate">{rule.name}</span>
                  {!rule.enabled && <span className="text-slate-600 text-xs">(disabled)</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {rule.conditions.map((c: any, i: number) => (
                    <span key={i} className="text-xs text-slate-500 bg-surface rounded px-2 py-0.5 border border-surface-border">
                      {c.field} {c.op} <span className="text-slate-300">{JSON.stringify(c.value)}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggle(rule)}
                  className={clsx(
                    'w-8 h-4 rounded-full transition-colors relative',
                    rule.enabled ? 'bg-brand' : 'bg-slate-700',
                  )}
                  title={rule.enabled ? 'Disable' : 'Enable'}
                >
                  <span className={clsx(
                    'absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform',
                    rule.enabled ? 'translate-x-4' : 'translate-x-0.5',
                  )} />
                </button>
                <button
                  onClick={() => remove(rule.id)}
                  className="text-slate-600 hover:text-rose-400 transition-colors text-xs"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-xs outline-none focus:border-brand"
    />
  );
}
