import { useNavigate } from 'react-router-dom';
import { BookOpen, Star, Zap, TrendingUp, Plus, ArrowRight, Pin, Clock } from 'lucide-react';
import { usePromptStore, AI_MODELS } from '../store/usePromptStore';
import Layout from '../components/layout/Layout';

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="glass-card stat-card">
      <div className="stat-card-icon" style={{ background: bg }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function MiniPromptCard({ prompt, onClick }) {
  const model = AI_MODELS.find((m) => m.id === prompt.model);
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1d ago';
    return `${days}d ago`;
  };
  return (
    <div
      className="glass-card"
      style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {model && (
        <span className={`card-model-icon ${model.color}`} style={{ flexShrink: 0 }}>
          {model.short}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {prompt.title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
          <span><Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{timeAgo(prompt.updatedAt)}</span>
          {prompt.usageCount > 0 && <span>· {prompt.usageCount}× used</span>}
        </div>
      </div>
      <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { prompts } = usePromptStore();

  const totalUsage = prompts.reduce((s, p) => s + (p.usageCount || 0), 0);
  const favoriteCount = prompts.filter((p) => p.isFavorite).length;
  const withVars = prompts.filter((p) => p.variables?.length > 0).length;

  const pinned = prompts.filter((p) => p.isPinned).slice(0, 4);
  const recent = [...prompts].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
  const topUsed = [...prompts].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 5);

  return (
    <Layout>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-header-title">Welcome back 👋</h1>
          <p className="page-header-subtitle">Your AI prompt workspace — {prompts.length} prompts ready</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/prompt/new')} id="dashboard-new-btn">
          <Plus size={16} /> New Prompt
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stat-cards-grid">
        <StatCard icon={BookOpen} label="Total Prompts" value={prompts.length} color="#8b5cf6" bg="rgba(139,92,246,0.15)" />
        <StatCard icon={TrendingUp} label="Total Uses" value={totalUsage} color="#10b981" bg="rgba(16,185,129,0.15)" />
        <StatCard icon={Star} label="Favorites" value={favoriteCount} color="#f59e0b" bg="rgba(245,158,11,0.15)" />
        <StatCard icon={Zap} label="Templates" value={withVars} color="#06b6d4" bg="rgba(6,182,212,0.15)" />
      </div>

      {/* 2-column sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

        {/* Pinned */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pin size={16} style={{ color: 'var(--accent-primary)' }} /> Pinned
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/prompts?filter=pinned')}>View all</button>
          </div>
          {pinned.length === 0 ? (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No pinned prompts yet. Pin important prompts for quick access.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pinned.map((p) => <MiniPromptCard key={p.id} prompt={p} onClick={() => navigate(`/prompt/${p.id}`)} />)}
            </div>
          )}
        </div>

        {/* Top Used */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} style={{ color: 'var(--accent-green)' }} /> Most Used
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/stats')}>View stats</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topUsed.map((p) => <MiniPromptCard key={p.id} prompt={p} onClick={() => navigate(`/prompt/${p.id}`)} />)}
          </div>
        </div>
      </div>

      {/* Recently Updated */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: 'var(--accent-secondary)' }} /> Recently Updated
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/prompts')}>View all</button>
        </div>
        <div className="prompts-grid">
          {recent.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="glass-card"
              style={{ padding: '16px', cursor: 'pointer' }}
              onClick={() => navigate(`/prompt/${p.id}`)}
            >
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.9375rem' }}>{p.title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.description || p.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
