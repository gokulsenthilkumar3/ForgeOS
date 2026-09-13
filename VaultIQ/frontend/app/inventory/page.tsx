'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '../../lib/api';
import { Plus, Search, Eye, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import CheckoutModal from '../../components/CheckoutModal';
import PremiumSelect from '../../components/PremiumSelect';
import PremiumDatePicker from '../../components/PremiumDatePicker';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#3fb950',
  ASSIGNED: '#58a6ff',
  MAINTENANCE: '#d29922',
  RETIRED: '#8b949e',
  LOST: '#ff7b78',
};

function AddAssetModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    modelName: '', serialNumber: '', tagId: '', typeId: '',
    locationId: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  
  const { data: types } = useSWR('/assets/types', url => apiFetch(url));
  const { data: locations } = useSWR('/assets/locations', url => apiFetch(url));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.modelName || !form.serialNumber || !form.tagId || !form.typeId || !form.locationId) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      await apiFetch('/assets', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          purchasePrice: parseFloat(form.purchasePrice) || 0,
        })
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add asset');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Register New Asset</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="modal-form">
          <label>Model Name<input className="input" value={form.modelName} onChange={e => setForm({...form, modelName: e.target.value})} placeholder="e.g. Dell XPS 15" /></label>
          <label>Serial Number<input className="input" value={form.serialNumber} onChange={e => setForm({...form, serialNumber: e.target.value})} placeholder="SN-XXXX" /></label>
          <label>Tag ID<input className="input" value={form.tagId} onChange={e => setForm({...form, tagId: e.target.value})} placeholder="VIQ-XXX" /></label>
          <label>Type
            <PremiumSelect 
              value={form.typeId} 
              onChange={val => setForm({...form, typeId: val})} 
              options={types?.map((t: any) => ({ value: t.id, label: t.name })) || []}
              placeholder="Select a type..." 
            />
          </label>
          <label>Location
            <PremiumSelect 
              value={form.locationId} 
              onChange={val => setForm({...form, locationId: val})} 
              options={locations?.map((l: any) => ({ value: l.id, label: l.name })) || []}
              placeholder="Select a location..." 
            />
          </label>
          <label>Purchase Price (₹)<input className="input" type="number" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} placeholder="85000" /></label>
          <label>Purchase Date
            <PremiumDatePicker 
              value={form.purchaseDate} 
              onChange={val => setForm({...form, purchaseDate: val})} 
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Register Asset</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [checkoutAsset, setCheckoutAsset] = useState<any>(null);
  const { user } = useAuth();

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, error, mutate } = useSWR(`/assets?page=${page}&limit=12${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`, url => apiFetch(url));

  const assets = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 12) || 1;

  if (error) return <div style={{ padding: 40, color: 'red' }}>Failed to load inventory.</div>;

  return (
    <div className="inventory-container">
      <header className="inventory-header">
        <div>
          <h1 className="page-title">Asset Inventory</h1>
          <p className="page-subtitle">{total} assets registered in the system.</p>
        </div>
        {user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Register Asset
          </button>
        )}
      </header>

      <div className="search-bar glass">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search by name or tag..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {!data ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="asset-grid">
            {assets.map((asset: any) => (
              <div key={asset.id} className="asset-card glass">
                <div className="asset-header">
                  <div>
                    <div className="asset-name">{asset.modelName}</div>
                    <span className="asset-tag">{asset.tagId}</span>
                  </div>
                  <span className="asset-type-badge">{asset.type.name}</span>
                </div>
                <div className="asset-meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Location</span>
                    <span className="meta-value">{asset.location.name}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Purchase Price</span>
                    <span className="meta-value">₹{asset.purchasePrice.toLocaleString()}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Status</span>
                    <span className="meta-value" style={{ color: STATUS_COLORS[asset.status] || 'var(--text-primary)' }}>
                      ● {asset.status}
                    </span>
                  </div>
                </div>
                <div className="asset-actions">
                  <Link href={`/inventory/${asset.id}`} className="btn btn-outline" style={{ gridColumn: asset.status === 'ACTIVE' && user && (user.role === 'ADMIN' || user.role === 'MANAGER') ? 'span 1' : 'span 2' }}>
                    <Eye size={14} /> View Details & History
                  </Link>
                  {asset.status === 'ACTIVE' && user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
                    <button className="btn btn-primary" onClick={() => setCheckoutAsset(asset)}>
                      Assign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={16} /> Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddAssetModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); mutate(); }}
        />
      )}

      {checkoutAsset && (
        <CheckoutModal
          asset={checkoutAsset}
          onClose={() => setCheckoutAsset(null)}
          onSuccess={() => { setCheckoutAsset(null); mutate(); }}
        />
      )}

      <style>{`
        .inventory-container { display: flex; flex-direction: column; gap: 24px; padding: 24px; }
        .inventory-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .page-title { font-size: 1.6rem; font-weight: 800; margin: 0; }
        .page-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
        .search-bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 10px; }
        .search-icon { color: var(--text-secondary); flex-shrink: 0; }
        .search-bar input { background: transparent; border: none; color: var(--text-primary); outline: none; font-size: 0.9rem; width: 100%; }
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
        .asset-card { padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 16px; transition: transform 0.2s, box-shadow 0.2s; }
        .asset-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .asset-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .asset-name { font-size: 1.1rem; font-weight: 700; }
        .asset-tag { font-size: 0.7rem; font-family: monospace; background: rgba(88,166,255,0.1); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; margin-top: 4px; display: inline-block; }
        .asset-type-badge { font-size: 0.75rem; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 6px; white-space: nowrap; }
        .asset-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; }
        .meta-item { display: flex; flex-direction: column; gap: 2px; }
        .meta-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); }
        .meta-value { font-size: 0.85rem; font-weight: 600; }
        .asset-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: none; text-decoration: none; transition: opacity 0.2s; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-primary { background: var(--accent-primary); color: white; }
        .btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
        .btn-outline:hover { background: rgba(255,255,255,0.05); }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 20px; font-size: 0.9rem; color: var(--text-secondary); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { padding: 32px; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 1.2rem; font-weight: 700; margin: 0 0 20px; }
        .modal-form { display: flex; flex-direction: column; gap: 12px; }
        .modal-form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: var(--text-secondary); }
        .input { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; outline: none; }
        .modal-actions { display: flex; gap: 12px; margin-top: 8px; }
        .error-banner { background: rgba(255,77,77,0.1); border: 1px solid rgba(255,77,77,0.3); color: #ff7b78; padding: 10px; border-radius: 8px; font-size: 0.85rem; }
      `}</style>
    </div>
  );
}
