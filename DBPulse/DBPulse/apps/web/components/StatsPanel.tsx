'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface StatRow { operation?: string; table_name?: string; actor?: string; count: number; }
interface Stats {
  byOperation: StatRow[];
  byTable: StatRow[];
  byActor: StatRow[];
}

const OP_COLOR: Record<string, string> = {
  INSERT: 'bg-emerald-500',
  UPDATE: 'bg-amber-500',
  DELETE: 'bg-rose-500',
  TRUNCATE: 'bg-purple-500',
};

export function StatsPanel({ connectionId }: { connectionId: string | null }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connectionId) return;
    setLoading(true);
    api.getEventStats(connectionId)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [connectionId]);

  if (!connectionId) {
    return <Empty msg="Select a connection to view stats" />;
  }
  if (loading) return <Empty msg="Loading stats…" />;
  if (!stats) return <Empty msg="No stats available" />;

  const maxTable = Math.max(...stats.byTable.map((r) => r.count), 1);
  const maxActor = Math.max(...stats.byActor.map((r) => r.count), 1);

  return (
    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6 content-start">

      {/* By Operation */}
      <Card title="By Operation">
        <div className="space-y-3">
          {stats.byOperation.map((r) => (
            <div key={r.operation} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${OP_COLOR[r.operation!] ?? 'bg-slate-500'}`} />
              <span className="flex-1 text-slate-300 text-xs">{r.operation}</span>
              <span className="text-slate-100 font-bold text-xs tabular-nums">{r.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* By Table */}
      <Card title="Top Tables">
        <div className="space-y-2">
          {stats.byTable.map((r) => (
            <div key={r.table_name}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-300 truncate max-w-[140px]">{r.table_name}</span>
                <span className="text-slate-500 tabular-nums">{r.count.toLocaleString()}</span>
              </div>
              <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${(r.count / maxTable) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* By Actor */}
      <Card title="Top Actors">
        <div className="space-y-2">
          {stats.byActor.map((r) => (
            <div key={r.actor}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-300 truncate max-w-[140px]">{r.actor}</span>
                <span className="text-slate-500 tabular-nums">{r.count.toLocaleString()}</span>
              </div>
              <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(r.count / maxActor) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">{msg}</div>
  );
}
