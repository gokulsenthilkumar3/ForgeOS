'use client';
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Key,
  Shield,
  Wand2,
  Share2,
  Settings,
  LogOut,
  Lock,
  Unlock,
  HelpCircle,
  Menu,
  X,
  ChevronRight,
  Zap,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  proOnly?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function NavGroups({ securityScore }: { securityScore: any }) {
  const weakCount = securityScore?.weakCount ?? 0;
  const breachedCount = securityScore?.breachedCount ?? 0;
  const alertCount = weakCount + breachedCount;

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
        { href: '/vault', label: 'My Vault', icon: <Key size={17} /> },
      ],
    },
    {
      label: 'Security',
      items: [
        { href: '/security', label: 'Security Center', icon: <Shield size={17} />, badge: alertCount > 0 ? alertCount : undefined },
        { href: '/generator', label: 'Generator', icon: <Wand2 size={17} /> },
      ],
    },
    {
      label: 'Team',
      items: [
        { href: '/sharing', label: 'Sharing', icon: <Share2 size={17} />, proOnly: true },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/settings', label: 'Settings', icon: <Settings size={17} /> },
        { href: '/help', label: 'Help & Support', icon: <HelpCircle size={17} /> },
      ],
    },
  ];

  return <>{groups}</>;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { encryptionReady, lockVault, securityScore } = useVault();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/register';

  const normPath = '/' + (pathname.replace(/^\//, '').split('/')[0] || '');

  React.useEffect(() => {
    if (!loading && !user && !isPublicRoute) router.replace('/login');
  }, [loading, user, isPublicRoute, router]);

  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isPublicRoute) return <>{children}</>;

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid var(--border)',
            borderTopColor: 'var(--teal)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading vault…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const initials = (user.fullName || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const weakCount = securityScore?.weakCount ?? 0;
  const breachedCount = securityScore?.breachedCount ?? 0;
  const alertCount = weakCount + breachedCount;

  const navGroups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: 'Overview',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
        { href: '/vault', label: 'My Vault', icon: <Key size={17} /> },
      ],
    },
    {
      label: 'Security',
      items: [
        { href: '/security', label: 'Security Center', icon: <Shield size={17} />, badge: alertCount > 0 ? alertCount : undefined },
        { href: '/generator', label: 'Generator', icon: <Wand2 size={17} /> },
      ],
    },
    {
      label: 'Team',
      items: [
        { href: '/sharing', label: 'Sharing', icon: <Share2 size={17} />, proOnly: true },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/settings', label: 'Settings', icon: <Settings size={17} /> },
        { href: '/help', label: 'Help & Support', icon: <HelpCircle size={17} /> },
      ],
    },
  ];


  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Lock size={16} />
        </div>
        <span>VaultIQ</span>
      </div>

      {/* Vault lock status */}
      {encryptionReady && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
            <Unlock size={11} />
            <span>Vault Unlocked</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            <div className="nav-group-items">
              {group.items.map((item) => {
                const isActive = normPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.proOnly && user.tier === 'FREE' ? '/settings?tab=subscription' : item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                    )}
                    {item.proOnly && user.tier === 'FREE' && (
                      <span style={{ fontSize: '0.6rem', background: 'rgba(0,168,181,0.15)', color: 'var(--teal)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>PRO</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Security score mini */}
        {securityScore && (
          <Link href="/security" style={{ display: 'block', textDecoration: 'none', marginBottom: 12 }}>
            <div style={{ background: 'rgba(0,168,181,0.06)', border: '1px solid rgba(0,168,181,0.15)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Security Score</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: securityScore.score >= 80 ? 'var(--success)' : securityScore.score >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                  {securityScore.score}
                </span>
              </div>
              <div style={{ marginTop: 6, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${securityScore.score}%`, background: securityScore.score >= 80 ? 'var(--success)' : securityScore.score >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 2, transition: 'width 1s ease' }} />
              </div>
            </div>
          </Link>
        )}

        {/* User */}
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user.fullName}</div>
            <div className="user-tier" style={{ color: user.tier === 'PRO' ? 'var(--teal)' : user.tier === 'ENTERPRISE' ? 'var(--info)' : 'var(--text-muted)' }}>
              {user.tier}
            </div>
          </div>
        </div>

        {/* Lock & Logout */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {encryptionReady && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, fontSize: '0.75rem' }}
              onClick={lockVault}
            >
              <Lock size={12} /> Lock
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ flex: 1, fontSize: '0.75rem', color: 'var(--danger)' }}
            onClick={logout}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <header className="mobile-header">
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--teal)' }}>
          <Lock size={18} /> VaultIQ
        </div>
        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{initials}</div>
      </header>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Layout */}
      <div className="shell-layout">
        <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
          <SidebarContent />
        </aside>
        <main className="main-content">
          {children}
        </main>
      </div>
    </>
  );
}
