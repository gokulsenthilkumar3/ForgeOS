'use client';

import clsx from 'clsx';
import type { AuditEvent } from '@dbpulse/shared';
import { computeDiff } from '@dbpulse/diff-engine';

interface Props {
  event: AuditEvent | null;
}

export function DiffViewer({ event }: Props) {
  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
        Select an event to inspect
      </div>
    );
  }

  const diff = computeDiff(
    (event.beforeState as Record<string, any>) ?? null,
    (event.afterState as Record<string, any>) ?? null,
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Meta */}
      <section className="space-y-1">
        <MetaRow label="ID" value={event.id} mono />
        <MetaRow label="Table" value={`${event.schemaName ? event.schemaName + '.' : ''}${event.tableName}`} />
        <MetaRow label="Op" value={event.operation} />
        <MetaRow label="Actor" value={event.actor} />
        <MetaRow label="Time" value={new Date(event.createdAt).toLocaleString()} />
        {event.rawQuery && <MetaRow label="Query" value={event.rawQuery} mono />}
      </section>

      <hr className="border-surface-border" />

      {/* Diff Table */}
      {diff.hasChanges ? (
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Changed Columns</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left pb-1 w-1/3">Column</th>
                <th className="text-left pb-1 w-1/3 text-rose-400">Before</th>
                <th className="text-left pb-1 w-1/3 text-emerald-400">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {diff.diffs.map((d) => (
                <tr key={d.column}>
                  <td className="py-1 pr-2 text-slate-300 font-bold">{d.column}</td>
                  <td className="py-1 pr-2 text-rose-300 break-all">
                    {d.before === null ? <span className="text-slate-600">null</span> : String(d.before)}
                  </td>
                  <td className="py-1 text-emerald-300 break-all">
                    {d.after === null ? <span className="text-slate-600">null</span> : String(d.after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Full Snapshot</p>
          <pre className="text-xs text-slate-300 bg-surface-card rounded p-3 overflow-x-auto">
            {JSON.stringify(event.afterState ?? event.beforeState, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-slate-500 w-14 shrink-0">{label}</span>
      <span className={clsx('text-slate-200 break-all', mono && 'font-mono')}>{value}</span>
    </div>
  );
}
