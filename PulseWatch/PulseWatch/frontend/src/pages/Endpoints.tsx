import { useEffect, useState } from 'react';
import { getEndpoints, createEndpoint, updateEndpoint, deleteEndpoint, checkNow } from '../api';
import type { Endpoint } from '../types';

const EMPTY = { name: '', url: '', method: 'GET', interval: 60, timeout: 10 };

function StatusBadge({ s }: { s: string }) {
  const cls = s === 'UP' ? 'badge-up' : s === 'DOWN' ? 'badge-down' : 'badge-unknown';
  return <span className={`badge ${cls}`}>{s}</span>;
}

export default function Endpoints() {
  const [eps, setEps]         = useState<Endpoint[]>([]);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Endpoint | null>(null);
  const [form, setForm]       = useState(EMPTY);
  const [checking, setChecking] = useState<string | null>(null);

  const load = () => getEndpoints().then(setEps);
  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (ep: Endpoint) => {
    setEditing(ep);
    setForm({ name: ep.name, url: ep.url, method: ep.method, interval: ep.interval, timeout: ep.timeout });
    setModal(true);
  };

  const save = async () => {
    if (editing) await updateEndpoint(editing.id, form);
    else         await createEndpoint(form);
    setModal(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this endpoint?')) return;
    await deleteEndpoint(id); load();
  };

  const handleCheck = async (id: string) => {
    setChecking(id);
    await checkNow(id);
    await load();
    setChecking(null);
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">◎ ENDPOINTS</div>
          <div className="page-subtitle">Manage monitored URLs</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Endpoint</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>URL</th><th>Method</th><th>Interval</th><th>Status</th><th>Latency</th><th>Uptime 24h</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {eps.map(ep => (
                <tr key={ep.id}>
                  <td>{ep.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{ep.url}</td>
                  <td><span className="badge badge-unknown">{ep.method}</span></td>
                  <td style={{ color: 'var(--text-dim)' }}>{ep.interval}s</td>
                  <td><StatusBadge s={ep.status} /></td>
                  <td style={{ color: 'var(--green)' }}>{ep.latency ? `${ep.latency}ms` : '—'}</td>
                  <td>{ep.uptime24h}%</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" disabled={checking === ep.id} onClick={() => handleCheck(ep.id)}>
                      {checking === ep.id ? '...' : '⟳'}
                    </button>
                    <button className="btn btn-sm" onClick={() => openEdit(ep)}>✎</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(ep.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing ? '✎ Edit Endpoint' : '+ Add Endpoint'}</div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="My API" />
            </div>
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-input" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://api.example.com" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-input" value={form.method} onChange={e => set('method', e.target.value)}>
                  {['GET','POST','HEAD','PUT','DELETE'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Interval (s)</label>
                <input className="form-input" type="number" value={form.interval} min={10} onChange={e => set('interval', +e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Timeout (s)</label>
                <input className="form-input" type="number" value={form.timeout} min={1} max={60} onChange={e => set('timeout', +e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
