'use client';
import React, { useEffect, useState } from 'react';
import { useVault } from '../../context/VaultContext';
import Link from 'next/link';
import {
  Shield, AlertTriangle, AlertCircle, RefreshCw, TrendingUp, Lock,
  CheckCircle, Info, ExternalLink, Clock, Zap, Eye,
} from 'lucide-react';

type SecurityTab = 'overview' | 'weak' | 'reused' | 'stale' | 'breaches' | '2fa';

function TabButton({ tab, active, label, icon, count, onClick }: any) {
  return (
    <button
      className={`tab ${active ? 'active' : ''}`}
      onClick={() => onClick(tab)}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <span style={{
          fontSize: '0.62rem', background: count > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
          color: count > 0 ? 'var(--danger)' : 'var(--success)', padding: '1px 6px', borderRadius: 10, fontWeight: 700,
        }}>{count}</span>
      )}
    </button>
  );
}

function EntryIssueRow({ entry, badge }: { entry: { id: string; title: string }; badge?: string }) {
  return (
    <Link href={`/vault/${entry.id}`} className="vault-entry" style={{ textDecoration: 'none' }}>
      <div className="vault-entry-favicon">{entry.title.charAt(0).toUpperCase()}</div>
      <div className="vault-entry-info">
        <div className="vault-entry-title">{entry.title}</div>
      </div>
      {badge && <span className="badge badge-danger">{badge}</span>}
      <ExternalLink size={13} color="var(--text-muted)" />
    </Link>
  );
}

export default function SecurityPage() {
  const { securityScore, refreshScore, encryptionReady, entries } = useVault();
  const [activeTab, setActiveTab] = useState<SecurityTab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (encryptionReady) refreshScore(); }, [encryptionReady]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshScore();
    setTimeout(() => setRefreshing(false), 800);
  };

  if (!encryptionReady) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Lock size={40} color="var(--text-muted)" />
        <h2>Vault is Locked</h2>
        <Link href="/dashboard" className="btn btn-teal">Unlock Vault</Link>
      </div>
    );
  }

  const score = securityScore?.score ?? 0;
  const breakdown = securityScore?.breakdown ?? [];

  const getEntriesByType = (type: string) =>
    breakdown.find((b: any) => b.type === type)?.entries ?? [];

  const weakEntries = getEntriesByType('weak');
  const reusedEntries = getEntriesByType('reused');
  const staleEntries = getEntriesByType('stale');
  const breachedEntries = getEntriesByType('breached');
  const noTwoFactorEntries = getEntriesByType('no2fa');

  const scoreColor = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--info)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Critical';

  const tabs: Array<{ tab: SecurityTab; label: string; icon: React.ReactNode; count: number }> = [
    { tab: 'overview', label: 'Overview', icon: <Shield size={14} />, count: 0 },
    { tab: 'weak', label: 'Weak', icon: <AlertCircle size={14} />, count: securityScore?.weakCount ?? 0 },
    { tab: 'reused', label: 'Reused', icon: <RefreshCw size={14} />, count: securityScore?.reusedCount ?? 0 },
    { tab: 'stale', label: 'Stale', icon: <Clock size={14} />, count: securityScore?.staleCount ?? 0 },
    { tab: 'breaches', label: 'Breaches', icon: <AlertTriangle size={14} />, count: securityScore?.breachedCount ?? 0 },
    { tab: '2fa', label: '2FA', icon: <Shield size={14} />, count: securityScore?.noTwoFactorCount ?? 0 },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">🛡 Security Center</h1>
          <p className="page-subtitle">Monitor and improve your vault's security posture</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-sync' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Score hero */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)', background: 'linear-gradient(135deg, rgba(27,58,107,0.2) 0%, rgba(0,168,181,0.06) 100%)', borderColor: 'rgba(0,168,181,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
          {/* Big score */}
          <div style={{ textAlign: 'center', minWidth: 140 }}>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '0.85rem', color: scoreColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{scoreLabel}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Security Score</div>
          </div>

          {/* Progress bar */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              {[
                { label: 'Total', value: securityScore?.totalEntries ?? 0, color: 'var(--text-secondary)' },
                { label: 'Weak', value: securityScore?.weakCount ?? 0, color: 'var(--warning)' },
                { label: 'Reused', value: securityScore?.reusedCount ?? 0, color: 'var(--warning)' },
                { label: 'Breached', value: securityScore?.breachedCount ?? 0, color: 'var(--danger)' },
                { label: 'No 2FA', value: securityScore?.noTwoFactorCount ?? 0, color: 'var(--info)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center', padding: '8px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', minWidth: 70 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Score bar */}
            <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: 5, transition: 'width 1.2s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0 — Critical</span><span>40 — Fair</span><span>60 — Good</span><span>80 — Excellent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        {tabs.map((t) => (
          <TabButton key={t.tab} {...t} active={activeTab === t.tab} onClick={setActiveTab} />
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
          {[
            {
              label: 'Weak Passwords', count: securityScore?.weakCount ?? 0, icon: <AlertCircle size={22} />, color: 'var(--warning)',
              description: 'Passwords with a strength score below 60%',
              action: { label: 'Fix Weak Passwords', tab: 'weak' as SecurityTab },
            },
            {
              label: 'Reused Passwords', count: securityScore?.reusedCount ?? 0, icon: <RefreshCw size={22} />, color: 'var(--warning)',
              description: 'Passwords shared across multiple sites',
              action: { label: 'View Reused', tab: 'reused' as SecurityTab },
            },
            {
              label: 'Stale Passwords', count: securityScore?.staleCount ?? 0, icon: <Clock size={22} />, color: 'var(--info)',
              description: 'Not changed in over 90 days',
              action: { label: 'View Stale', tab: 'stale' as SecurityTab },
            },
            {
              label: 'Breached Accounts', count: securityScore?.breachedCount ?? 0, icon: <AlertTriangle size={22} />, color: 'var(--danger)',
              description: 'Found in known data breaches',
              action: { label: 'View Breaches', tab: 'breaches' as SecurityTab },
            },
            {
              label: 'Missing 2FA', count: securityScore?.noTwoFactorCount ?? 0, icon: <Shield size={22} />, color: 'var(--info)',
              description: 'Accounts without two-factor authentication',
              action: { label: 'View 2FA', tab: '2fa' as SecurityTab },
            },
          ].map((item) => (
            <div key={item.label} className={`card ${item.count > 0 ? 'card-hover' : ''}`} style={{ cursor: item.count > 0 ? 'pointer' : 'default' }} onClick={() => item.count > 0 && setActiveTab(item.action.tab)}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ color: item.count > 0 ? item.color : 'var(--success)', background: item.count > 0 ? `${item.color}18` : 'rgba(34,197,94,0.1)', padding: 10, borderRadius: 'var(--radius-md)', border: `1px solid ${item.count > 0 ? item.color : 'var(--success)'}30` }}>
                  {item.count > 0 ? item.icon : <CheckCircle size={22} />}
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: item.count > 0 ? item.color : 'var(--success)', lineHeight: 1 }}>{item.count}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: 2 }}>{item.label}</div>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{item.description}</p>
              {item.count > 0 && (
                <button className="btn btn-sm btn-secondary" style={{ marginTop: 12, width: '100%' }} onClick={() => setActiveTab(item.action.tab)}>
                  {item.action.label}
                </button>
              )}
              {item.count === 0 && <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>✓ All Clear</div>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'weak' && (
        <div>
          <div className="card card-warning" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={18} color="var(--warning)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Weak Passwords Detected</div>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>These passwords have a strength score below 60%. Use the generator to create stronger replacements.</p>
                <Link href="/generator" className="btn btn-sm btn-secondary" style={{ marginTop: 10 }}><Zap size={12} /> Open Generator</Link>
              </div>
            </div>
          </div>
          {weakEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
              <CheckCircle size={40} color="var(--success)" style={{ marginBottom: 12 }} />
              <h3 style={{ color: 'var(--success)' }}>No Weak Passwords</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {weakEntries.map((e: any) => <EntryIssueRow key={e.id} entry={e} badge="Weak" />)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reused' && (
        <div>
          <div className="card card-warning" style={{ marginBottom: 'var(--space-lg)' }}>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Using the same password on multiple sites means a breach on one site exposes all of them. Generate a unique password for each account.</p>
          </div>
          {reusedEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}><CheckCircle size={40} color="var(--success)" /><h3 style={{ color: 'var(--success)', marginTop: 12 }}>No Reused Passwords</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reusedEntries.map((e: any) => <EntryIssueRow key={e.id} entry={e} badge="Reused" />)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stale' && (
        <div>
          <div className="card card-info" style={{ marginBottom: 'var(--space-lg)' }}>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>These passwords haven't been changed in more than 90 days. Regular rotation reduces the impact of undetected breaches.</p>
          </div>
          {staleEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}><CheckCircle size={40} color="var(--success)" /><h3 style={{ color: 'var(--success)', marginTop: 12 }}>All Passwords Are Fresh</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {staleEntries.map((e: any) => <EntryIssueRow key={e.id} entry={e} badge="Stale" />)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'breaches' && (
        <div>
          <div className="card card-danger" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="var(--danger)" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.9rem' }}>Breach Alert</div>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Accounts with known breach records. Change these passwords immediately and enable 2FA where possible.</p>
              </div>
            </div>
          </div>
          {breachedEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}><Shield size={40} color="var(--success)" style={{ marginBottom: 12 }} /><h3 style={{ color: 'var(--success)' }}>No Breaches Detected</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {breachedEntries.map((e: any) => <EntryIssueRow key={e.id} entry={e} badge="Breached" />)}
            </div>
          )}
        </div>
      )}

      {activeTab === '2fa' && (
        <div>
          <div className="card card-info" style={{ marginBottom: 'var(--space-lg)' }}>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Two-factor authentication (2FA) adds a critical second layer of security. Even if your password is compromised, 2FA keeps your account safe.</p>
          </div>
          {noTwoFactorEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}><CheckCircle size={40} color="var(--success)" /><h3 style={{ color: 'var(--success)', marginTop: 12 }}>2FA Enabled Everywhere</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {noTwoFactorEntries.map((e: any) => <EntryIssueRow key={e.id} entry={e} badge="No 2FA" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
