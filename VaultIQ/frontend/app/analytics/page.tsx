'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LineChart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
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
        <h1><LineChart size={24} /> Analytics & Compliance</h1>
      </div>
      
      <div className="glass" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
        <h2>Predictive Analytics</h2>
        <p style={{ color: 'var(--text-muted)' }}>AI-driven maintenance forecasts coming soon in Phase 5.</p>
      </div>
    </>
  );
}
