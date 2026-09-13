import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { getStats, getEndpoints, checkNow } from '../api';
import type { Endpoint, Stats } from '../types';

function StatusBadge({ s }: { s: string }) {
  const cls = s === 'UP' ? 'badge-up' : s === 'DOWN' ? 'badge-down' : 'badge-unknown';
  return <span className={`badge ${cls}`}>{s}</span>;
}

function LatencyVal({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="latency-val offline">—</span>;
  const cls = ms > 500 ? 'slow' : '';
  return <span className={`latency-val ${cls}`}>{ms}ms</span>;
}

export default function Dashboard() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [eps, setEps]         = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);

  const load = async () => {
    const [s, e] = await Promise.all([getStats(), getEndpoints()]);
    setStats(s); setEps(e); setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const handleCheck = async (id: string) => {
    setChecking(id);
    await checkNow(id);
    await load();
    setChecking(null);
  };

  if (loading) return <div style={{ color: 'var(--text-dim)', padding: 40 }}>Loading<span className="blink">_</span></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">◈ DASHBOARD</div>
          <div className="page-subtitle">Live uptime overview — auto-refresh every 15s</div>
        </div>
      </div>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: stats.down > 0 ? 'var(--red)' : 'var(--green)' }}>
              {stats.up}/{stats.total}
            </div>
            <div className="stat-label">Endpoints Up</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.uptime24h}%</div>
            <div className="stat-label">24h Uptime</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.checks24h}</div>
            <div className="stat-label">Checks (24h)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: stats.openIncidents > 0 ? 'var(--red)' : 'var(--green)' }}>
              {stats.openIncidents}
            </div>
            <div className="stat-label">Open Incidents</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Monitored Endpoints</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>URL</th><th>Status</th>
                <th>Latency</th><th>24h Uptime</th><th>Last Checked</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {eps.map(ep => (
                <tr key={ep.id}>
                  <td>{ep.name}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{ep.url}</td>
                  <td><StatusBadge s={ep.status} /></td>
                  <td><LatencyVal ms={ep.latency} /></td>
                  <td>{ep.uptime24h}%</td>
                  <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {ep.lastChecked ? new Date(ep.lastChecked).toLocaleTimeString() : '—'}
                  </td>
                  <td>
                    <button className="btn btn-sm" disabled={checking === ep.id} onClick={() => handleCheck(ep.id)}>
                      {checking === ep.id ? '...' : '⟳ Check'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
