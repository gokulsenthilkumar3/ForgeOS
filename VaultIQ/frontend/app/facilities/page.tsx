'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building } from 'lucide-react';

export default function FacilitiesPage() {
  const { user, loading } = useAuth();

  if (loading || !user) return <div style={{ padding: '20px', color: 'var(--text-primary)' }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1><Building size={24} /> Facilities & Space</h1>
        <div className="header-actions">
          <button className="btn btn-primary">Book Room</button>
        </div>
      </div>
      
      <div className="glass" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
        <h2>Space Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Hot-desking and room booking coming soon in Phase 2.</p>
      </div>
    </>
  );
}
