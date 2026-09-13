import { useEffect, useState } from 'react';
import { getEndpoints, getStats } from '../api';
import type { Endpoint, Stats } from '../types';

function StatusBadge({ s }: { s: string }) {
  const cls = s === 'UP' ? 'badge-up' : s === 'DOWN' ? 'badge-down' : 'badge-unknown';
  return <span className={`badge ${cls}`}>{s}</span>;
}

export default function StatusPage() {
  const [eps,   setEps]   = useState<Endpoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [last,  setLast]  = useState<string>('');

  const load = async () => {
    const [e, s] = await Promise.all([getEndpoints(), getStats()]);
    setEps(e); setStats(s);
    setLast(new Date().toLocaleTimeString());
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const allUp = eps.length > 0 && eps.every(e => e.status === 'UP');

  return (
    <div className="status-page">
      <div className="status-hero">
        <h1>◈ PulseWatch Status</h1>
        <p>Last updated: {last || '—'} &nbsp;·&nbsp; Auto-refreshes every 30s</p>
      </div>

      {allUp && (
        <div className="status-all-good">✓ All systems operational</div>
      )}
      {stats && stats.down > 0 && (
        <div style={{ textAlign:'center', color:'var(--red)', fontSize:18, marginBottom:24 }}>
          ⚠ {stats.down} endpoint{stats.down>1?'s':''} down
        </div>
      )}

      {eps.map(ep => (
        <div key={ep.id} className="status-row">
          <div>
            <div className="status-row-name">{ep.name}</div>
            <div className="status-row-meta">{ep.url} &nbsp;·&nbsp; {ep.uptime24h}% uptime (24h)</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:'var(--text-dim)', fontSize:11 }}>
              {ep.latency ? `${ep.latency}ms` : '—'}
            </span>
            <StatusBadge s={ep.status} />
          </div>
        </div>
      ))}

      <div style={{ textAlign:'center', marginTop:40, color:'var(--text-dim)', fontSize:11 }}>
        Powered by PulseWatch &nbsp;·&nbsp; {new Date().getFullYear()}
      </div>
    </div>
  );
}
