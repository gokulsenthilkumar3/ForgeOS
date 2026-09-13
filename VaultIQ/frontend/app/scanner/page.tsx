'use client';

import React from 'react';
import QRScanner from '../../components/QRScanner';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

export default function ScannerPage() {
  const router = useRouter();

  const [scanError, setScanError] = React.useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = React.useState(false);
  const [manualId, setManualId] = React.useState('');

  const handleScan = async (data: string) => {
    try {
      setScanError(null);
      setScanSuccess(true);
      const asset = await apiFetch(`/assets/${data}`);
      if (asset && asset.id) {
        setTimeout(() => router.push(`/inventory/${asset.id}`), 500);
      } else {
        setScanSuccess(false);
        setScanError('Asset not found. Check the QR code and try again.');
      }
    } catch {
      setScanSuccess(false);
      setScanError('Asset not found. Check the QR code and try again.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) handleScan(manualId.trim());
  };

  return (
    <div className="scanner-container">
      <header>
        <h1 className="page-title">Hardware Scanner</h1>
        <p className="page-subtitle">Scan QR codes to instantly check-in, check-out, or view asset vitals.</p>
      </header>

      <div className={`scanner-main card glass ${scanSuccess ? 'scan-success-flash' : ''}`}>
        <div className="scanner-viewport">
          <QRScanner onScanSuccess={handleScan} />
        </div>
        
          <div className="scanner-instructions">
            <h3>Instructions</h3>
            <ul>
              <li>Position the asset QR code within the frame.</li>
              <li>Ensure adequate lighting for optical recognition.</li>
              <li>VaultIQ will automatically redirect to the asset lifecycle page.</li>
            </ul>
            
            <div className="manual-entry">
              <h4>Or enter manually</h4>
              <form onSubmit={handleManualSubmit} className="manual-form">
                <input 
                  type="text" 
                  value={manualId} 
                  onChange={e => setManualId(e.target.value)} 
                  placeholder="Enter Tag ID manually..." 
                  className="manual-input"
                />
                <button type="submit" className="btn btn-primary">Go</button>
              </form>
            </div>

            {scanError && (
              <div className="error-toast glass animate-fade-in">
                <strong>Error:</strong> {scanError}
              </div>
            )}
          </div>
      </div>

      <style jsx>{`
        .error-toast {
          margin-top: 20px;
          padding: 16px;
          background: rgba(218, 54, 51, 0.1);
          color: var(--accent-danger);
          border: 1px solid rgba(218, 54, 51, 0.2);
          border-radius: 8px;
        }
        .scanner-container {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .scanner-main {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 40px;
          padding: 40px;
          min-height: 500px;
        }

        .scanner-viewport {
          background: var(--bg-secondary);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scanner-instructions {
          display: flex;
          flex-direction: column;
          gap: 24px;
          counter-reset: step;
        }

        .scanner-instructions h3 {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .scanner-instructions ul {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .scanner-instructions li {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .scanner-instructions li::before {
          counter-increment: step;
          content: counter(step);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent-primary);
          color: white;
          font-size: 0.8rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        .scan-success-flash {
          animation: flashSuccess 0.5s ease;
        }

        @keyframes flashSuccess {
          0% { box-shadow: 0 0 0px 0px rgba(63, 185, 80, 0); }
          50% { box-shadow: 0 0 20px 5px rgba(63, 185, 80, 0.6); }
          100% { box-shadow: 0 0 0px 0px rgba(63, 185, 80, 0); }
        }

        .manual-entry {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .manual-entry h4 {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .manual-form {
          display: flex;
          gap: 8px;
        }

        .manual-input {
          flex: 1;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-primary);
          font-size: 0.9rem;
        }
        .manual-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}
