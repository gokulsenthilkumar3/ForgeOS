'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiFetch } from '../../../lib/api';
import DigitalTwin from '../../../components/DigitalTwin';
import { ArrowLeft, Edit, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [verification, setVerification] = React.useState<any>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);

  const verifyAudit = async () => {
    setIsVerifying(true);
    try {
      const res = await apiFetch(`/assets/${id}/verify-audit`);
      setVerification(res);
    } catch (e) {
      setVerification({ isValid: false, message: 'Failed to verify chain' });
    }
    setIsVerifying(false);
  };

  const { data: asset, error } = useSWR<any>(`/assets/${id}`, apiFetch);

  if (error) return <div className="error-state" style={{ padding: 40, color: 'var(--accent-warning)' }}>Failed to load asset details.</div>;
  if (!asset) return <div className="loading-state" style={{ padding: 40 }}>Loading...</div>;

  const statusColor = 
    asset.status === 'AVAILABLE' ? '#3fb950' : 
    asset.status === 'IN_USE' ? '#58a6ff' : 
    asset.status === 'MAINTENANCE' ? '#d29922' : '#da3633';

  // Map backend status to Digital Twin status
  const twinStatus = 
    asset.status === 'AVAILABLE' || asset.status === 'IN_USE' ? 'HEALTHY' :
    asset.status === 'MAINTENANCE' ? 'WARNING' : 'CRITICAL';

  // Determine twin type from asset model/type
  let twinType = 'SERVER';
  const typeName = asset.type?.name?.toLowerCase() || '';
  if (typeName.includes('laptop') || typeName.includes('macbook')) twinType = 'LAPTOP';
  else if (typeName.includes('monitor') || typeName.includes('display')) twinType = 'MONITOR';
  else if (typeName.includes('phone') || typeName.includes('tablet') || typeName.includes('ipad')) twinType = 'PHONE';
  else if (typeName.includes('printer')) twinType = 'PRINTER';
  else if (typeName.includes('router') || typeName.includes('switch') || typeName.includes('network')) twinType = 'ROUTER';
  else if (typeName.includes('keyboard') || typeName.includes('mouse')) twinType = 'KEYBOARD';

  return (
    <div className="asset-detail-container">
      <header className="detail-header">
        <button className="btn btn-back" onClick={() => router.back()}>
          <ArrowLeft size={18} /> Back to Inventory
        </button>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={verifyAudit} disabled={isVerifying}>
            <ShieldCheck size={16} /> {isVerifying ? 'Verifying...' : 'Verify Audit Trail'}
          </button>
          <button className="btn btn-outline"><Edit size={16} /> Edit Asset</button>
        </div>
      </header>

      <div className="detail-grid">
        {/* Left Column: 3D Twin */}
        <div className="twin-section glass">
          <div className="twin-header">
            <h3>Digital Twin</h3>
            <span className="badge" style={{ backgroundColor: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
              {asset.status}
            </span>
          </div>
          <div className="twin-viewer">
            <DigitalTwin status={twinStatus as any} type={twinType as any} />
          </div>
        </div>

        {/* Right Column: Info & History */}
        <div className="info-section">
          <div className="info-card glass">
            <h2>{asset.modelName}</h2>
            <p className="serial-number">SN: {asset.serialNumber}</p>
            
            {verification && (
              <div className="verification-alert" style={{ background: verification.isValid ? 'rgba(63, 185, 80, 0.1)' : 'rgba(218, 54, 51, 0.1)', border: `1px solid ${verification.isValid ? '#3fb950' : '#da3633'}`, padding: '12px', borderRadius: '8px', marginBottom: '20px', color: verification.isValid ? '#3fb950' : '#da3633', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {verification.isValid ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{verification.message} {verification.blocksVerified !== undefined && `(${verification.blocksVerified} blocks)`}</span>
              </div>
            )}

            
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Type</span>
                <span className="meta-value">{asset.type?.name}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Location</span>
                <span className="meta-value">{asset.location?.name}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Purchase Date</span>
                <span className="meta-value">{new Date(asset.purchaseDate).toLocaleDateString()}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Purchase Price</span>
                <span className="meta-value">${asset.purchasePrice?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="history-card glass">
            <h3>Recent Maintenance</h3>
            {asset.maintenance && asset.maintenance.length > 0 ? (
              <ul className="ticket-list">
                {asset.maintenance.slice(0, 3).map((ticket: any) => (
                  <li key={ticket.id} className="ticket-item">
                    {ticket.status === 'OPEN' ? <AlertCircle size={16} color="#d29922" /> : <CheckCircle size={16} color="#3fb950" />}
                    <div>
                      <div className="ticket-title">{ticket.issueType}</div>
                      <div className="ticket-date">{new Date(ticket.scheduledDate).toLocaleDateString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-history">No recent maintenance records.</div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .asset-detail-container { padding: 24px; display: flex; flex-direction: column; gap: 24px; height: 100%; overflow: auto; }
        .detail-header { display: flex; justify-content: space-between; align-items: center; }
        .btn-back { display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1rem; font-weight: 600; padding: 8px; transition: color 0.2s; }
        .btn-back:hover { color: var(--text-primary); }
        .btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; }
        .btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
        .btn-outline:hover { background: rgba(255, 255, 255, 0.05); }

        .detail-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; height: calc(100vh - 120px); }
        
        .twin-section { display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; }
        .twin-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.2); }
        .twin-header h3 { margin: 0; font-size: 1.2rem; font-weight: 700; }
        .badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px; }
        .twin-viewer { flex: 1; min-height: 400px; background: rgba(10, 10, 15, 0.5); position: relative; }

        .info-section { display: flex; flex-direction: column; gap: 24px; overflow-y: auto; }
        .info-card { padding: 24px; border-radius: 16px; }
        .info-card h2 { margin: 0 0 4px; font-size: 1.8rem; font-weight: 800; }
        .serial-number { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0; margin-bottom: 24px; font-family: monospace; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .meta-item { display: flex; flex-direction: column; gap: 4px; }
        .meta-label { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-value { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }

        .history-card { padding: 24px; border-radius: 16px; flex: 1; }
        .history-card h3 { margin: 0 0 16px; font-size: 1.1rem; }
        .ticket-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
        .ticket-item { display: flex; gap: 12px; align-items: flex-start; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border-color); }
        .ticket-title { font-weight: 600; font-size: 0.95rem; }
        .ticket-date { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; }
        .empty-history { color: var(--text-secondary); font-size: 0.9rem; font-style: italic; }
      `}</style>
    </div>
  );
}
