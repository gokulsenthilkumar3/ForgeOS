'use client';
import React, { useState, useCallback } from 'react';
import { useVault, VaultEntry } from '../../context/VaultContext';
import Link from 'next/link';
import {
  Key, CreditCard, FileText, File, User, Plus, Search, Filter,
  Star, Copy, ExternalLink, Edit2, Trash2, Shield, AlertTriangle,
  ChevronDown, X, Lock,
} from 'lucide-react';

const TYPE_CONFIG = {
  ALL: { label: 'All', icon: <Key size={15} /> },
  PASSWORD: { label: 'Passwords', icon: <Key size={15} /> },
  CARD: { label: 'Cards', icon: <CreditCard size={15} /> },
  NOTE: { label: 'Notes', icon: <FileText size={15} /> },
  DOCUMENT: { label: 'Documents', icon: <File size={15} /> },
  IDENTITY: { label: 'Identities', icon: <User size={15} /> },
};

function EntryCard({ entry, onCopy, onDelete, onToggleFavorite }: {
  entry: VaultEntry;
  onCopy: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const isBreached = entry.breachRecords.length > 0;

  return (
    <div className="vault-entry">
      <div className="vault-entry-favicon">
        {entry.websiteUrl ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${entry.websiteUrl}&sz=32`}
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          entry.title.charAt(0).toUpperCase()
        )}
      </div>

      <div className="vault-entry-info" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="vault-entry-title truncate">{entry.title}</span>
          {isBreached && <span className="badge badge-danger" style={{ flexShrink: 0 }}>⚠ Breach</span>}
          {entry.strengthScore !== undefined && entry.strengthScore < 60 && !isBreached && (
            <span className={`badge ${entry.strengthScore < 40 ? 'badge-danger' : 'badge-warning'}`} style={{ flexShrink: 0 }}>
              {entry.strengthScore < 40 ? 'Weak' : 'Fair'}
            </span>
          )}
        </div>
        <div className="vault-entry-username truncate">{entry.username || entry.websiteUrl || entry.type.toLowerCase()}</div>
      </div>

      {/* Meta */}
      <div className="vault-entry-meta">
        {entry.hasTwoFactor && (
          <div title="2FA Enabled" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
            <Shield size={13} />
          </div>
        )}
        {entry.isFavorite && <Star size={13} color="var(--warning)" fill="var(--warning)" />}
      </div>

      {/* Actions */}
      <div className="vault-entry-actions">
        <button
          className="btn btn-ghost btn-icon-sm"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(entry.id); }}
          title={entry.isFavorite ? 'Unfavorite' : 'Favorite'}
        >
          <Star size={13} fill={entry.isFavorite ? 'var(--warning)' : 'none'} color={entry.isFavorite ? 'var(--warning)' : 'var(--text-muted)'} />
        </button>
        <button
          className="btn btn-ghost btn-icon-sm"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopy(entry); }}
          title="Copy username"
        >
          <Copy size={13} />
        </button>
        {entry.websiteUrl && (
          <a
            href={entry.websiteUrl.startsWith('http') ? entry.websiteUrl : `https://${entry.websiteUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-icon-sm"
            onClick={(e) => e.stopPropagation()}
            title="Open website"
          >
            <ExternalLink size={13} />
          </a>
        )}
        <Link href={`/vault/${entry.id}?edit=1`} className="btn btn-ghost btn-icon-sm" onClick={(e) => e.stopPropagation()} title="Edit">
          <Edit2 size={13} />
        </Link>
        <button
          className="btn btn-ghost btn-icon-sm"
          style={{ color: 'var(--danger)' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(entry.id); }}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Clickable overlay */}
      <Link href={`/vault/${entry.id}`} style={{ position: 'absolute', inset: 0, zIndex: 0 }} aria-label={`View ${entry.title}`} />
    </div>
  );
}

export default function VaultPage() {
  const { entries, encryptionReady, loading, deleteEntry, toggleFavorite } = useVault();
  const [activeType, setActiveType] = useState<keyof typeof TYPE_CONFIG>('ALL');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterBreached, setFilterBreached] = useState(false);
  const [filterWeak, setFilterWeak] = useState(false);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [copied, setCopied] = useState('');

  const handleCopy = useCallback(async (entry: VaultEntry) => {
    if (entry.username) {
      await navigator.clipboard.writeText(entry.username);
      setCopied(entry.id);
      setTimeout(() => setCopied(''), 2000);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('Delete this entry? This cannot be undone.')) {
      await deleteEntry(id);
    }
  }, [deleteEntry]);

  const filtered = entries.filter((e) => {
    if (activeType !== 'ALL' && e.type !== activeType) return false;
    if (filterBreached && e.breachRecords.length === 0) return false;
    if (filterWeak && (e.strengthScore ?? 100) >= 60) return false;
    if (filterFavorite && !e.isFavorite) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.title.toLowerCase().includes(q) ||
             (e.username?.toLowerCase().includes(q) ?? false) ||
             (e.websiteUrl?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const activeFilters = [filterBreached, filterWeak, filterFavorite].filter(Boolean).length;

  if (!encryptionReady) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Lock size={40} color="var(--text-muted)" />
        <h2>Vault is Locked</h2>
        <p style={{ color: 'var(--text-muted)' }}>Go to Dashboard to unlock your vault.</p>
        <Link href="/dashboard" className="btn btn-teal">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">My Vault</h1>
          <p className="page-subtitle">{entries.length} items stored securely</p>
        </div>
        <Link href="/vault/new" className="btn btn-teal"><Plus size={16} /> Add Entry</Link>
      </div>

      {/* Type tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
          <button
            key={type}
            className={`tab ${activeType === type ? 'active' : ''}`}
            onClick={() => setActiveType(type as keyof typeof TYPE_CONFIG)}
          >
            {config.icon}
            <span style={{ marginLeft: 6 }}>{config.label}</span>
            {type !== 'ALL' && (
              <span style={{ marginLeft: 4, fontSize: '0.65rem', background: 'rgba(148,163,184,0.15)', padding: '1px 5px', borderRadius: 10 }}>
                {entries.filter((e) => e.type === type).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-lg)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, username, or URL…"
            style={{ paddingLeft: 40 }}
          />
          {search && (
            <button className="btn btn-ghost btn-icon-sm" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <button
          className={`btn btn-secondary ${activeFilters > 0 ? '' : ''}`}
          style={{ flexShrink: 0, gap: 6, ...(activeFilters > 0 ? { borderColor: 'var(--teal)', color: 'var(--teal)' } : {}) }}
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <Filter size={15} />
          Filters
          {activeFilters > 0 && <span className="badge badge-teal" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>{activeFilters}</span>}
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter by:</span>
          {[
            { label: '⚠ Breached', value: filterBreached, set: setFilterBreached },
            { label: '🔴 Weak Password', value: filterWeak, set: setFilterWeak },
            { label: '⭐ Favorites', value: filterFavorite, set: setFilterFavorite },
          ].map(({ label, value, set }) => (
            <button
              key={label}
              className={`btn btn-sm ${value ? 'btn-teal' : 'btn-secondary'}`}
              onClick={() => set(!value)}
            >
              {label}
            </button>
          ))}
          {activeFilters > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterBreached(false); setFilterWeak(false); setFilterFavorite(false); }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--text-muted)' }}>
          <div className="animate-float" style={{ fontSize: '3rem', marginBottom: 16 }}>🗝️</div>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            {search || activeFilters > 0 ? 'No entries match your filters' : 'Your vault is empty'}
          </h3>
          <p style={{ fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
            {search || activeFilters > 0 ? 'Try adjusting your search or filters.' : 'Add your first password to get started.'}
          </p>
          {!search && !activeFilters && (
            <Link href="/vault/new" className="btn btn-teal"><Plus size={16} /> Add First Entry</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            {search && ` matching "${search}"`}
          </div>
          {filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Copy toast */}
      {copied && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', border: '1px solid var(--success)', borderRadius: 'var(--radius-lg)', padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center', boxShadow: 'var(--shadow-lg)', zIndex: 9999, animation: 'slideInFromTop 300ms ease' }}>
          <Copy size={14} color="var(--success)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>Copied to clipboard</span>
        </div>
      )}
    </div>
  );
}
