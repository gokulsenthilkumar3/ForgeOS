import { useEffect, useState } from 'react';
import { getIncidents } from '../api';
import type { Incident } from '../types';

function fmt(s: string) { return new Date(s).toLocaleString(); }
function dur(sec: number | null) {
  if (!sec) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec/60)}m ${sec%60}s`;
  return `${Math.floor(sec/3600)}h ${Math.floor((sec%3600)/60)}m`;
}

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    getIncidents().then(i => { setIncidents(i); setLoading(false); });
    const t = setInterval(() => getIncidents().then(setIncidents), 15000);
    return () => clearInterval(t);
  }, []);

  const open   = incidents.filter(i => !i.resolvedAt);
  const closed = incidents.filter(i =>  i.resolvedAt);

  if (loading) return <div style={{ color: 'var(--text-dim)', padding: 40 }}>Loading<span className="blink">_</span></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">⚠ INCIDENTS</div>
          <div className="page-subtitle">{open.length} open · {closed.length} resolved</div>
        </div>
      </div>

      {open.length === 0 && closed.length === 0 && (
        <div style={{ color: 'var(--green)', padding: 32, textAlign: 'center', fontSize: 18 }}>✓ No incidents recorded</div>
      )}

      {open.length > 0 && (
        <>
          <div style={{ color: 'var(--red)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>▼ Active</div>
          {open.map(i => (
            <div key={i.id} className="incident-item incident-open">
              <div className="incident-title">
                <span style={{ color: 'var(--red)' }}>▼ {i.endpointName}</span>
                <span className="badge badge-down" style={{ marginLeft: 10 }}>ONGOING</span>
              </div>
              <div className="incident-meta">
                Error: {i.error} &nbsp;·&nbsp; Started: {fmt(i.startedAt)}
              </div>
            </div>
          ))}
        </>
      )}

      {closed.length > 0 && (
        <>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '20px 0 10px' }}>✓ Resolved</div>
          {closed.map(i => (
            <div key={i.id} className="incident-item incident-closed">
              <div className="incident-title">
                <span style={{ color: 'var(--green)' }}>✓ {i.endpointName}</span>
                <span className="badge badge-up" style={{ marginLeft: 10 }}>RESOLVED</span>
              </div>
              <div className="incident-meta">
                Error: {i.error} &nbsp;·&nbsp;
                Started: {fmt(i.startedAt)} &nbsp;·&nbsp;
                Resolved: {fmt(i.resolvedAt!)} &nbsp;·&nbsp;
                Duration: {dur(i.duration)}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
