'use client';

import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import PremiumSelect from './PremiumSelect';

interface ManageMaintenanceModalProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageMaintenanceModal({ item, onClose, onSuccess }: ManageMaintenanceModalProps) {
  const [status, setStatus] = useState(item.status);
  const [technicianNotes, setTechnicianNotes] = useState(item.technicianNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await apiFetch(`/maintenance/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, technicianNotes }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update maintenance record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card glass animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Manage Triage Ticket</h2>
          <p>Ticket ID: <span className="mono">{item.id.substring(0, 8)}</span></p>
        </header>

        <div className="modal-body">
          {error && <div className="error-toast">{error}</div>}
          
          <div className="info-row">
            <span className="label">Asset:</span>
            <span className="value">{item.asset.modelName} ({item.asset.tagId})</span>
          </div>
          <div className="info-row">
            <span className="label">Issue:</span>
            <span className="value">{item.issueType}</span>
          </div>

          <div className="input-group">
            <label htmlFor="status-select">Status</label>
            <PremiumSelect
              value={status}
              onChange={val => setStatus(val)}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'RESOLVED', label: 'Resolved' }
              ]}
            />
          </div>

          <div className="input-group">
            <label htmlFor="notes-input">Technician Notes</label>
            <textarea
              id="notes-input"
              rows={4}
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              className="glass"
              placeholder="Enter details of repairs performed..."
            ></textarea>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </footer>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 2000;
        }
        .modal-content {
          width: 500px; padding: 40px; display: flex; flex-direction: column; gap: 32px;
        }
        .modal-header h2 { font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; }
        .modal-header p { color: var(--text-secondary); font-size: 0.9rem; }
        .mono { font-family: monospace; color: var(--accent-primary); }
        .modal-body { display: flex; flex-direction: column; gap: 20px; }
        .info-row { display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
        .label { color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; }
        .value { font-weight: 700; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); }
        .input-group select, .input-group textarea { padding: 12px; border: 1px solid var(--border-color); color: white; border-radius: 8px; outline: none; background: rgba(255, 255, 255, 0.05); resize: vertical; }
        .error-toast { background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.3); color: #ff4d4d; padding: 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 16px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
}
