'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '../../lib/api';
import { Wrench, AlertTriangle, CheckCircle, Clock, Plus, X } from 'lucide-react';
import PremiumSelect from '../../components/PremiumSelect';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#8b949e',
  MEDIUM: '#d29922',
  HIGH: '#ff7b78',
  CRITICAL: '#f85149',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#d29922',
  IN_PROGRESS: '#58a6ff',
  RESOLVED: '#3fb950',
};

function NewTicketModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data } = useSWR('/assets?limit=1000', url => apiFetch(url));
  const assets = data?.data || [];
  
  const [assetId, setAssetId] = useState('');
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) { setError('Please describe the issue.'); return; }
    if (!assetId) { setError('Select an asset.'); return; }
    
    try {
      await apiFetch('/maintenance', {
        method: 'POST',
        body: JSON.stringify({ assetId, issue, priority })
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Maintenance Ticket</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="modal-form">
          <label>Asset
            <PremiumSelect
              value={assetId}
              onChange={val => setAssetId(val)}
              options={assets.map((a: any) => ({
                value: a.id,
                label: `${a.modelName} (${a.tagId})`
              }))}
              placeholder="Select an asset..."
            />
          </label>
          <label>Issue Description
            <textarea className="input" rows={3} value={issue} onChange={e => setIssue(e.target.value)} placeholder="Describe the problem..." />
          </label>
          <label>Priority
            <PremiumSelect
              value={priority}
              onChange={val => setPriority(val)}
              options={[
                { value: 'LOW', label: 'LOW' },
                { value: 'MEDIUM', label: 'MEDIUM' },
                { value: 'HIGH', label: 'HIGH' },
                { value: 'CRITICAL', label: 'CRITICAL' }
              ]}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit Ticket</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const [showNew, setShowNew] = useState(false);
  const { data: tickets, error, mutate } = useSWR('/maintenance', url => apiFetch(url));

  const open = (tickets || []).filter((t: any) => t.status === 'OPEN');
  const inProgress = (tickets || []).filter((t: any) => t.status === 'IN_PROGRESS');
  const resolved = (tickets || []).filter((t: any) => t.status === 'COMPLETED'); // Mapping COMPLETED

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiFetch(`/maintenance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      mutate();
    } catch (err) {
      alert('Failed to update ticket status');
    }
  };

  if (error) return <div style={{ padding: 40, color: 'red' }}>Failed to load maintenance queue.</div>;
  if (!tickets) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="maintenance-container">
      <header className="maintenance-header">
        <div>
          <h1 className="page-title">Maintenance Queue</h1>
          <p className="page-subtitle">{open.length} open, {inProgress.length} in progress, {resolved.length} resolved.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Ticket
        </button>
      </header>

      <div className="stats-row">
        <div className="stat-pill stat-open"><AlertTriangle size={14} /> {open.length} Open</div>
        <div className="stat-pill stat-progress"><Clock size={14} /> {inProgress.length} In Progress</div>
        <div className="stat-pill stat-resolved"><CheckCircle size={14} /> {resolved.length} Resolved</div>
      </div>

      <div className="tickets-list">
        {tickets.length === 0 && <p className="empty-state">No maintenance tickets. System is healthy.</p>}
        {tickets.map((ticket: any) => (
          <div key={ticket.id} className="ticket-card glass">
            <div className="ticket-header">
              <div className="ticket-info">
                <span className="ticket-asset">{ticket.asset.modelName}</span>
                <span className="ticket-tag">{ticket.asset.tagId}</span>
              </div>
              <div className="ticket-badges">
                <span className="badge" style={{ color: PRIORITY_COLORS[ticket.issueType], borderColor: PRIORITY_COLORS[ticket.issueType] }}>
                  {ticket.issueType}
                </span>
                <span className="badge" style={{ color: STATUS_COLORS[ticket.status] || '#3fb950', borderColor: STATUS_COLORS[ticket.status] || '#3fb950' }}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <p className="ticket-issue">{ticket.description}</p>
            <div className="ticket-footer">
              <span className="ticket-meta">Reported on {new Date(ticket.scheduledDate).toLocaleDateString()}</span>
              <div className="ticket-actions">
                {ticket.status === 'OPEN' && (
                  <button className="btn btn-sm btn-outline" onClick={() => handleStatusChange(ticket.id, 'IN_PROGRESS')}>
                    <Wrench size={12} /> Start Work
                  </button>
                )}
                {ticket.status === 'IN_PROGRESS' && (
                  <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(ticket.id, 'COMPLETED')}>
                    <CheckCircle size={12} /> Mark Resolved
                  </button>
                )}
                {ticket.status === 'COMPLETED' && (
                  <span className="resolved-label"><CheckCircle size={12} /> Resolved {ticket.completedAt ? new Date(ticket.completedAt).toLocaleDateString() : ''}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); mutate(); }}
        />
      )}

      <style>{`
        .maintenance-container { display: flex; flex-direction: column; gap: 24px; padding: 24px; }
        .maintenance-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .page-title { font-size: 1.6rem; font-weight: 800; margin: 0; }
        .page-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
        .stats-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat-pill { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; border: 1px solid; }
        .stat-open { color: #d29922; border-color: rgba(210,153,34,0.3); background: rgba(210,153,34,0.08); }
        .stat-progress { color: #58a6ff; border-color: rgba(88,166,255,0.3); background: rgba(88,166,255,0.08); }
        .stat-resolved { color: #3fb950; border-color: rgba(63,185,80,0.3); background: rgba(63,185,80,0.08); }
        .tickets-list { display: flex; flex-direction: column; gap: 16px; }
        .ticket-card { padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; }
        .ticket-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .ticket-info { display: flex; flex-direction: column; gap: 4px; }
        .ticket-asset { font-size: 1rem; font-weight: 700; }
        .ticket-tag { font-size: 0.7rem; font-family: monospace; color: var(--accent-primary); background: rgba(88,166,255,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; }
        .ticket-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .badge { font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid; letter-spacing: 0.5px; }
        .ticket-issue { font-size: 0.9rem; color: var(--text-secondary); margin: 0; }
        .ticket-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ticket-meta { font-size: 0.75rem; color: var(--text-muted); }
        .ticket-actions { display: flex; gap: 8px; }
        .btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.2s; }
        .btn-sm { padding: 5px 10px; font-size: 0.78rem; }
        .btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
        .btn-success { background: rgba(63,185,80,0.15); color: #3fb950; border: 1px solid rgba(63,185,80,0.3); }
        .btn-primary { background: var(--accent-primary); color: white; }
        .resolved-label { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; color: #3fb950; }
        .empty-state { color: var(--text-secondary); text-align: center; padding: 40px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { padding: 32px; border-radius: 16px; width: 100%; max-width: 480px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-title { font-size: 1.1rem; font-weight: 700; margin: 0; }
        .btn-icon { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .modal-form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: var(--text-secondary); }
        .input { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: white; padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; outline: none; resize: vertical; }
        .modal-actions { display: flex; gap: 12px; margin-top: 4px; }
        .error-banner { background: rgba(255,77,77,0.1); border: 1px solid rgba(255,77,77,0.3); color: #ff7b78; padding: 10px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
