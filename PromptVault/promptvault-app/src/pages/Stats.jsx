import { BarChart2, TrendingUp, Zap, Star, BookOpen, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import Layout from '../components/layout/Layout';
import { usePromptStore, AI_MODELS } from '../store/usePromptStore';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#f97316', '#ef4444', '#3b82f6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '8px 14px' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ fontSize: '0.8125rem', color: p.color || 'var(--text-secondary)' }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Stats() {
  const { prompts, usageHistory } = usePromptStore();
  const stats = usePromptStore.getState().getStats();

  const totalUsage = stats.totalUsage;
  const favoriteCount = prompts.filter((p) => p.isFavorite).length;
  const withVars = prompts.filter((p) => p.variables?.length > 0).length;
  const avgRating = prompts.reduce((s, p) => s + (p.rating || 0), 0) / (prompts.filter((p) => p.rating > 0).length || 1);

  // Model distribution data
  const modelData = Object.entries(stats.modelCounts).map(([modelId, count]) => {
    const model = AI_MODELS.find((m) => m.id === modelId);
    return { name: model?.label || modelId, value: count };
  });

  // Top tags
  const topTags = Object.entries(stats.tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  // Top prompts
  const topPrompts = stats.topPrompts;

  // Usage over last 14 days
  const usageData = stats.usageHistory;

  return (
    <Layout title="Analytics">
      {/* Summary Stats */}
      <div className="stat-cards-grid" style={{ marginBottom: 36 }}>
        <div className="glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <BookOpen size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="stat-card-value">{prompts.length}</div>
          <div className="stat-card-label">Total Prompts</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <TrendingUp size={20} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-card-value">{totalUsage}</div>
          <div className="stat-card-label">Total Uses</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Star size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-card-value">{favoriteCount}</div>
          <div className="stat-card-label">Favorites</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <Zap size={20} style={{ color: '#06b6d4' }} />
          </div>
          <div className="stat-card-value">{withVars}</div>
          <div className="stat-card-label">Templates</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(236,72,153,0.15)' }}>
            <Star size={20} style={{ color: '#ec4899' }} />
          </div>
          <div className="stat-card-value">{avgRating.toFixed(1)}</div>
          <div className="stat-card-label">Avg Rating</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

        {/* Usage Over Time */}
        <div className="glass-card p-5">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Clock size={16} style={{ color: 'var(--accent-primary)' }} /> Usage Over Last 14 Days
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Uses" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Model Distribution */}
        <div className="glass-card p-5">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
            <BarChart2 size={16} style={{ color: 'var(--accent-cyan)' }} /> Prompts by AI Model
          </h3>
          {modelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}>
                  {modelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No data yet</p>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

        {/* Top Tags */}
        <div className="glass-card p-5">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 20 }}>Top Tags</h3>
          {topTags.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topTags} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="tag" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Prompts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No tags yet</p>
          )}
        </div>

        {/* Top Prompts by Usage */}
        <div className="glass-card p-5">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 20 }}>Most Used Prompts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topPrompts.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: `${COLORS[i % COLORS.length]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                <span className="badge badge-violet">{p.usageCount}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
