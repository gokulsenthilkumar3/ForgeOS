'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Headset } from 'lucide-react';

export default function HelpdeskPage() {
  const { user, loading } = useAuth();

  if (loading || !user) return <div style={{ padding: '20px', color: 'var(--text-primary)' }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1><Headset size={24} /> IT Helpdesk</h1>
        <div className="header-actions">
          <button className="btn btn-primary">Report Issue</button>
        </div>
      </div>
      
      <div className="glass" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
        <h2>Tickets System</h2>
        <p style={{ color: 'var(--text-muted)' }}>Ticket management board coming soon in Phase 1.</p>
      </div>
    </>
  );
}
