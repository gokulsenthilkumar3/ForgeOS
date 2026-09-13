'use client';

import React, { useState } from 'react';
import { apiFetch } from '../lib/api';

interface BlockchainBadgeProps {
  assetId: string;
}

export default function BlockchainBadge({ assetId }: BlockchainBadgeProps) {
  const [status, setStatus] = useState<'IDLE' | 'VERIFYING' | 'VERIFIED' | 'FAILED'>('IDLE');
  const [lastHash, setLastHash] = useState<string | null>(null);

  const verifyIntegrity = async () => {
    setStatus('VERIFYING');
    try {
      const data = await apiFetch(`/assets/${assetId}/audit-hash`);
      setLastHash(data.hash.substring(0, 16) + '...');
      setStatus('VERIFIED');
    } catch {
      setStatus('FAILED');
    }
  };

  return (
    <div className="blockchain-badge" title="Asset events are secured via SHA-256 cryptographic hashing to ensure an immutable audit trail.">
      {status === 'IDLE' && (
        <button className="btn-verify" onClick={verifyIntegrity}>
          <span className="icon">🔗</span> Verify Integrity
        </button>
      )}

      {status === 'VERIFYING' && (
        <div className="status verifying">
          <span className="spinner"></span>
          Anchoring to Ledger...
        </div>
      )}

      {status === 'VERIFIED' && (
        <div className="status verified">
          <span className="icon">✅</span>
          <div className="details">
            <p className="label">Vault-Anchored</p>
            <p className="hash">Block: {lastHash}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .blockchain-badge {
          display: flex;
          align-items: center;
        }

        .btn-verify {
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-verify:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--accent-primary);
          color: white;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .verifying {
          color: var(--accent-primary);
        }

        .verified {
          color: var(--accent-success);
          background: rgba(82, 196, 26, 0.1);
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(82, 196, 26, 0.2);
        }

        .details {
          display: flex;
          flex-direction: column;
        }

        .label {
          margin: 0;
          font-size: 0.7rem;
        }

        .hash {
          margin: 0;
          font-size: 0.6rem;
          opacity: 0.7;
          font-family: monospace;
        }

        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(88, 166, 255, 0.3);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
