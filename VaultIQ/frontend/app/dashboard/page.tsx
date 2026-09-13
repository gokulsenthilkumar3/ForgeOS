'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import {
  Shield, Key, AlertCircle, RefreshCw, Lock, Plus, Search,
  TrendingUp, Eye, Star, Zap, ChevronRight, Activity, Clock,
  CheckCircle, AlertTriangle, Wand2,
} from 'lucide-react';

function SecurityScoreRing({ score }: { score: number }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const [displayScore, setDisplayScore] = useState(0);
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, score));
    let start: number | null = null;
    const duration = 1200;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      setDisplayScore(Math.round(eased * target));
      setDashOffset(circumference - eased * (target / 100) * circumference);

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [score, circumference]);

  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#3B82F6' : score >= 40 ? '#F59E0B' : '#EF4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'At Risk';

  return (
    <div className="score-ring-wrapper">
      <svg width="200" height="200" className="score-ring-svg">
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1B3A6B" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={radius} className="score-ring-track" />
        <circle
          cx="100" cy="100" r={radius}
          className="score-ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ stroke: color }}
        />
      </svg>
      <div className="score-ring-center">
        <div className="score-ring-value" style={{ color }}>{displayScore}</div>
        <div className="score-ring-label">{label}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, href }: { label: string; value: number | string; icon: React.ReactNode; color: string; href?: string }) {
  const content = (
    <div className={`card card-hover`} style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', cursor: href ? 'pointer' : 'default' }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function UnlockVaultPrompt() {
  const { user } = useAuth();
  const { initializeEncryption } = useVault();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await initializeEncryption(password, user?.salt ?? '');
    } catch {
      setError('Incorrect master password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="animate-float" style={{ fontSize: '4rem', marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Vault is Locked</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 360 }}>
          Enter your master password to decrypt and access your vault entries.
        </p>
      </div>

      <form onSubmit={handleUnlock} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div className="card card-danger" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.83rem' }}>
            <AlertCircle size={14} color="var(--danger)" /> {error}
          </div>
        )}
        <div className="input-with-icon" style={{ position: 'relative' }}>
          <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master password"
            style={{ paddingLeft: 40 }}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-teal" style={{ width: '100%' }} disabled={loading || !password}>
          {loading ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <><Lock size={16} /> Unlock Vault</>}
        </button>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { entries, encryptionReady, securityScore, refreshScore } = useVault();

  useEffect(() => { if (encryptionReady) refreshScore(); }, [encryptionReady]);

  if (!encryptionReady) return (
    <div className="page-container">
      <UnlockVaultPrompt />
    </div>
  );

  const score = securityScore?.score ?? 0;
  const total = securityScore?.totalEntries ?? entries.length;
  const weak = securityScore?.weakCount ?? 0;
  const breached = securityScore?.breachedCount ?? 0;
  const noTwoFactor = securityScore?.noTwoFactorCount ?? 0;
  const reused = securityScore?.reusedCount ?? 0;

  const recent = [...entries].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);
  const favorites = entries.filter((e) => e.isFavorite).slice(0, 4);

  const recommendations: Array<{ title: string; description: string; href: string; severity: 'danger' | 'warning' | 'info' }> = [];
  if (breached > 0) recommendations.push({ title: `${breached} Breached Account${breached > 1 ? 's' : ''}`, description: 'Change passwords immediately', href: '/security?tab=breaches', severity: 'danger' });
  if (weak > 0) recommendations.push({ title: `${weak} Weak Password${weak > 1 ? 's' : ''}`, description: 'Generate stronger replacements', href: '/security?tab=weak', severity: 'warning' });
  if (reused > 0) recommendations.push({ title: `${reused} Reused Password${reused > 1 ? 's' : ''}`, description: 'Each site should have a unique password', href: '/security?tab=reused', severity: 'warning' });
  if (noTwoFactor > 0) recommendations.push({ title: `${noTwoFactor} Without 2FA`, description: 'Enable two-factor authentication', href: '/security?tab=2fa', severity: 'info' });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.fullName.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's your vault security overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/vault" className="btn btn-secondary btn-sm"><Key size={14} /> Open Vault</Link>
          <Link href="/vault?action=add" className="btn btn-teal btn-sm"><Plus size={14} /> Add Entry</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-xl)', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
            <StatCard label="Total Entries" value={total} icon={<Key size={20} />} color="var(--teal)" href="/vault" />
            <StatCard label="Weak Passwords" value={weak} icon={<AlertCircle size={20} />} color={weak > 0 ? 'var(--warning)' : 'var(--success)'} href="/security?tab=weak" />
            <StatCard label="Reused Passwords" value={reused} icon={<RefreshCw size={20} />} color={reused > 0 ? 'var(--warning)' : 'var(--success)'} href="/security?tab=reused" />
            <StatCard label="Breached" value={breached} icon={<AlertTriangle size={20} />} color={breached > 0 ? 'var(--danger)' : 'var(--success)'} href="/security?tab=breaches" />
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>🎯 Priority Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recommendations.map((rec, i) => (
                  <Link key={i} href={rec.href} className={`card card-${rec.severity}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', padding: '12px 16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{rec.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{rec.description}</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent entries */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1rem' }}>⏱ Recently Updated</h3>
              <Link href="/vault" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>View all <ChevronRight size={12} /></Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                  <div className="animate-float" style={{ fontSize: '2.5rem', marginBottom: 8 }}>🗝️</div>
                  <p style={{ fontSize: '0.85rem' }}>No vault entries yet. <Link href="/vault?action=add" style={{ color: 'var(--teal)' }}>Add your first entry</Link></p>
                </div>
              ) : recent.map((entry) => (
                <Link key={entry.id} href={`/vault/${entry.id}`} className="vault-entry" style={{ textDecoration: 'none' }}>
                  <div className="vault-entry-favicon">
                    {entry.websiteUrl
                      ? <img src={`https://www.google.com/s2/favicons?domain=${entry.websiteUrl}&sz=32`} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : entry.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="vault-entry-info">
                    <div className="vault-entry-title truncate">{entry.title}</div>
                    {entry.username && <div className="vault-entry-username truncate">{entry.username}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {entry.breachRecords.length > 0 && <span className="badge badge-danger">Breached</span>}
                    {entry.isFavorite && <Star size={14} color="var(--warning)" fill="var(--warning)" />}
                    {entry.strengthScore !== undefined && entry.strengthScore < 60 && (
                      <span className={`badge ${entry.strengthScore < 40 ? 'badge-danger' : 'badge-warning'}`}>{entry.strengthScore < 40 ? 'Weak' : 'Fair'}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — security score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>🛡 Security Score</h3>
            <SecurityScoreRing score={score} />
            <p style={{ marginTop: 'var(--space-md)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {score >= 80 ? 'Your vault is highly secure. Keep it up!' :
               score >= 60 ? 'Good security. A few improvements would help.' :
               score >= 40 ? 'Several issues need your attention.' :
               'Critical issues found. Take action now.'}
            </p>
            <Link href="/security" className="btn btn-teal btn-sm" style={{ marginTop: 'var(--space-md)', width: '100%' }}>
              <Shield size={14} /> View Security Center
            </Link>
          </div>

          {/* Quick actions */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: <Plus size={15} />, label: 'Add Password', href: '/vault?action=add', color: 'var(--teal)' },
                { icon: <Wand2 size={15} />, label: 'Generate Password', href: '/generator', color: 'var(--info)' },
                { icon: <Search size={15} />, label: 'Search Vault', href: '/vault', color: 'var(--text-secondary)' },
                { icon: <Activity size={15} />, label: 'Check Breaches', href: '/security?tab=breaches', color: 'var(--warning)' },
              ].map((action) => (
                <Link key={action.href} href={action.href} className="nav-item" style={{ fontSize: '0.85rem', textDecoration: 'none' }}>
                  <span style={{ color: action.color }}>{action.icon}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{action.label}</span>
                  <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>⭐ Favorites</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {favorites.map((e) => (
                  <Link key={e.id} href={`/vault/${e.id}`} className="nav-item" style={{ textDecoration: 'none', gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg, var(--navy), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0, color: 'white', overflow: 'hidden' }}>
                      {e.websiteUrl ? <img src={`https://www.google.com/s2/favicons?domain=${e.websiteUrl}`} alt="" style={{ width: '100%', objectFit: 'contain' }} onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} /> : e.title.charAt(0)}
                    </div>
                    <span className="truncate" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{e.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
