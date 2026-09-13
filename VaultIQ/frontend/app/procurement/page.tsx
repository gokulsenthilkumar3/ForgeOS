'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProcurementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user) return <div style={{ padding: '20px', color: 'var(--text-primary)' }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1><ShoppingCart size={24} /> Procurement</h1>
        <div className="header-actions">
          <button className="btn btn-primary">New Request</button>
        </div>
      </div>
      
      <div className="glass" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
        <h2>Vendor & PO Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Purchase tracking coming soon in Phase 3.</p>
      </div>
    </>
  );
}
