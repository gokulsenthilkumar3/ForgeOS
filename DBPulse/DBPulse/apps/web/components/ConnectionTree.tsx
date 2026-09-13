'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useConnections } from '@/hooks/useConnections';
import clsx from 'clsx';

const ENGINE_ICON: Record<string, string> = { postgres: '🐘', mysql: '🐬' };

interface Props {
  onSelectConnection: (id: string) => void;
  activeId: string | null;
}

export function ConnectionTree({ onSelectConnection, activeId }: Props) {
  const { connections, loading, refresh, toggle } = useConnections();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: '', engine: 'postgres', host: 'localhost',
    port: '5432', database: '', username: '', password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.createConnection({ ...form, port: parseInt(form.port) });
      setAdding(false);
      setForm({ name: '', engine: 'postgres', host: 'localhost', port: '5432', database: '', username: '', password: '' });
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500 text-xs">Loading…</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ul className="flex-1 overflow-y-auto py-2">
        {connections.map((conn) => (
          <li key={conn.id}>
            <button
              onClick={() => onSelectConnection(conn.id)}
              className={clsx(
                'w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-surface-card transition-colors',
                activeId === conn.id && 'bg-surface-card border-l-2 border-brand',
              )}
            >
              <span>{ENGINE_ICON[conn.engine] ?? '🗄️'}</span>
              <span className="flex-1 truncate text-sm">{conn.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggle(conn.id, conn.status); }}
                className={clsx(
                  'w-2 h-2 rounded-full shrink-0 transition-colors',
                  conn.status === 'connected' ? 'bg-emerald-400' : 'bg-slate-600',
                )}
                title={conn.status === 'connected' ? 'Disconnect' : 'Connect'}
              />
            </button>
            <p className="px-4 pb-1 text-xs text-slate-600 truncate">
              {conn.host} · {conn.database_name}
            </p>
          </li>
        ))}

        {connections.length === 0 && !adding && (
          <li className="px-4 py-2 text-xs text-slate-600">No connections yet.</li>
        )}
      </ul>

      {/* Add connection form */}
      {adding ? (
        <div className="border-t border-surface-border p-3 space-y-2">
          {[
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'host', label: 'Host', type: 'text' },
            { key: 'port', label: 'Port', type: 'number' },
            { key: 'database', label: 'Database', type: 'text' },
            { key: 'username', label: 'User', type: 'text' },
            { key: 'password', label: 'Password', type: 'password' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-slate-500">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-surface border border-surface-border rounded px-2 py-1 text-xs outline-none focus:border-brand"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-500">Engine</label>
            <select
              value={form.engine}
              onChange={(e) => setForm((f) => ({ ...f, engine: e.target.value, port: e.target.value === 'mysql' ? '3306' : '5432' }))}
              className="w-full bg-surface border border-surface-border rounded px-2 py-1 text-xs outline-none focus:border-brand"
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
            </select>
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 bg-brand hover:bg-brand-dark py-1.5 rounded text-xs font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button onClick={() => setAdding(false)}
              className="flex-1 bg-surface-card hover:bg-surface-border py-1.5 rounded text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="m-3 py-1.5 border border-dashed border-surface-border hover:border-brand rounded text-xs text-slate-500 hover:text-brand transition-colors"
        >
          + Add Connection
        </button>
      )}
    </div>
  );
}
