import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Dashboard   from './pages/Dashboard';
import Endpoints   from './pages/Endpoints';
import Incidents   from './pages/Incidents';
import Settings    from './pages/Settings';
import StatusPage  from './pages/StatusPage';
import { getNotifications, markAllRead } from './api';
import type { Notification } from './types';

const NAV = [
  { to: '/',          icon: '▣', label: 'Dashboard'  },
  { to: '/endpoints', icon: '◎', label: 'Endpoints'  },
  { to: '/incidents', icon: '⚠', label: 'Incidents'  },
  { to: '/settings',  icon: '⚙', label: 'Settings'   },
  { to: '/status',    icon: '◈', label: 'Status Page' },
];

function Shell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => getNotifications().then(setNotifs).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  // Alt+T shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.altKey && e.key === 't') setPanelOpen(p => !p); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const handleReadAll = async () => {
    await markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          ◈ PulseWatch
          <span>UPTIME MONITOR v1.0</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to==='/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="notif-btn" onClick={() => setPanelOpen(p => !p)} title="Alerts (Alt+T)">
            🔔 {unread > 0 && <span className="notif-dot" />}
          </button>
          <span style={{ marginLeft: 8, fontSize: 10 }}>Alt+T for alerts</span>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/endpoints" element={<Endpoints />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/settings"  element={<Settings />} />
          <Route path="/status"    element={<StatusPage />} />
        </Routes>
      </main>

      {/* Notification Panel */}
      <div ref={panelRef} className={`notif-panel ${panelOpen ? 'open' : ''}`}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'var(--accent)', fontSize:14 }}>🔔 Alerts</span>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-sm" onClick={handleReadAll}>Mark all read</button>
            <button className="btn btn-sm" onClick={() => setPanelOpen(false)}>✕</button>
          </div>
        </div>
        {notifs.length === 0 && <p style={{ color:'var(--text-dim)', fontSize:12 }}>No notifications yet.</p>}
        {notifs.map(n => (
          <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
            <div className="notif-msg" style={{ color: n.type==='DOWN' ? 'var(--red)' : 'var(--green)' }}>
              {n.type === 'DOWN' ? '▼' : '▲'} {n.message}
            </div>
            <div className="notif-ts">{new Date(n.ts).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
