'use client';

import { useState } from 'react';
import clsx from 'clsx';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface TriggerStatus {
  schema: string;
  table: string;
  triggerExists: boolean;
  truncateTriggerExists: boolean;
  installed: boolean;
  skipped: boolean;
  error?: string;
}

interface Props {
  connectionId: string;
}

export function TriggerManager({ connectionId }: Props) {
  const [schemas, setSchemas] = useState('public');
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TriggerStatus[] | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  const install = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(
        `${API_URL}/api/connections/${connectionId}/postgres/install-triggers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schemas: schemas.split(',').map((s) => s.trim()),
            dryRun,
            includeTruncate: true,
          }),
        },
      );
      const data = await res.json();
      setResults(data.details);
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!confirm('Remove all DBPulse triggers from the selected schemas?')) return;
    setLoading(true);
    try {
      await fetch(
        `${API_URL}/api/connections/${connectionId}/postgres/triggers?schemas=${schemas}`,
        { method: 'DELETE' },
      );
      setResults(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xs uppercase tracking-widest text-slate-400">Trigger Manager</h2>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          value={schemas}
          onChange={(e) => setSchemas(e.target.value)}
          placeholder="public,app,..."
          className="flex-1 bg-surface-card border border-surface-border rounded px-3 py-1.5 text-xs outline-none focus:border-brand"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="accent-brand"
          />
          Dry run
        </label>
        <button
          onClick={install}
          disabled={loading}
          className="px-3 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold disabled:opacity-50"
        >
          {loading ? 'Working…' : dryRun ? 'Preview' : 'Install'}
        </button>
        <button
          onClick={remove}
          disabled={loading}
          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 rounded text-xs font-semibold disabled:opacity-50"
        >
          Remove All
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="flex gap-4 text-xs">
          {Object.entries(summary).map(([k, v]) => (
            <span key={k} className="text-slate-400">
              <span className="text-slate-100 font-bold">{String(v)}</span> {k}
            </span>
          ))}
        </div>
      )}

      {/* Results Table */}
      {results && (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-surface-border">
              <th className="text-left py-1 pr-3">Schema.Table</th>
              <th className="text-left py-1 pr-3">Row Trigger</th>
              <th className="text-left py-1 pr-3">Truncate</th>
              <th className="text-left py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr
                key={`${r.schema}.${r.table}`}
                className="border-b border-surface-border/50"
              >
                <td className="py-1 pr-3 text-slate-300">{r.schema}.{r.table}</td>
                <td className="py-1 pr-3">
                  <Dot active={r.triggerExists} />
                </td>
                <td className="py-1 pr-3">
                  <Dot active={r.truncateTriggerExists} />
                </td>
                <td className="py-1">
                  {r.error ? (
                    <span className="text-rose-400">Error: {r.error}</span>
                  ) : r.skipped ? (
                    <span className="text-slate-500">skipped</span>
                  ) : r.installed ? (
                    <span className="text-emerald-400">installed</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={clsx(
        'inline-block w-2 h-2 rounded-full',
        active ? 'bg-emerald-400' : 'bg-slate-600',
      )}
    />
  );
}
