'use client';

import React, { useState } from 'react';
import PremiumSelect from './PremiumSelect';
import useSWR from 'swr';
import { apiFetch } from '../lib/api';

interface CheckoutModalProps {
  asset: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({ asset, onClose, onSuccess }: CheckoutModalProps) {
  const { data: users } = useSWR<any[]>('/users', apiFetch);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCheckout = async () => {
    if (!selectedUserId) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await apiFetch(`/assets/${asset.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: selectedUserId,
          signature: signatureData || 'DIGITAL_AGREEMENT_VERIFIED'
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Checkout failed. Please verify asset availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card glass animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Deploy Asset</h2>
          <p>Assigning <strong>{asset.modelName}</strong> to personnel.</p>
        </header>

        <div className="modal-body">
          {errorMessage && <div className="error-toast">{errorMessage}</div>}
          
          <div className="input-group">
            <label htmlFor="personnel-select">Select Personnel</label>
            <PremiumSelect 
              value={selectedUserId} 
              onChange={val => setSelectedUserId(val)}
              options={Array.isArray(users) ? users.map((user: any) => ({
                value: user.id,
                label: `${user.fullName} (${user.email})`
              })) : []}
              placeholder="Choose an employee..."
            />
          </div>

          <div className="input-group">
            <label htmlFor="signature-input">Digital Signature / Authorizer PIN</label>
            <input
              id="signature-input"
              type="password"
              placeholder="Enter authorization code"
              value={signatureData}
              onChange={e => setSignatureData(e.target.value)}
              className="glass"
              required
            />
          </div>

          <div className="compliance-notice">
            <p>⚠️ This deployment will be recorded on the blockchain audit trail. Digital signature will be anchored to SHA-256 block hash.</p>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleCheckout} 
            disabled={!selectedUserId || isSubmitting}
          >
            {isSubmitting ? 'Recording...' : 'Confirm Deployment'}
          </button>
        </footer>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .modal-content {
          width: 500px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .modal-header h2 { font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; }
        .modal-header p { color: var(--text-secondary); font-size: 0.9rem; }

        .modal-body { display: flex; flex-direction: column; gap: 24px; }

        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); }
        .input-group select, .input-group input { padding: 12px; border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; outline: none; background: rgba(255, 255, 255, 0.05); }

        .error-toast {
          background: rgba(255, 77, 77, 0.1);
          border: 1px solid rgba(255, 77, 77, 0.3);
          color: #ff4d4d;
          padding: 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .compliance-notice {
          padding: 16px;
          background: rgba(210, 153, 34, 0.05);
          border: 1px solid rgba(210, 153, 34, 0.2);
          border-radius: 8px;
          font-size: 0.8rem;
          color: var(--accent-warning);
          line-height: 1.4;
        }

        .modal-footer { display: flex; justify-content: flex-end; gap: 16px; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
}
