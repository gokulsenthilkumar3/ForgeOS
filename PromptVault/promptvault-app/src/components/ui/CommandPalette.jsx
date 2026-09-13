import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import {
  Search, LayoutDashboard, BookOpen, Plus, BarChart2, Settings,
  Star, Pin, Folder, ArrowRight, Zap, Copy, CheckCheck
} from 'lucide-react';
import { usePromptStore, AI_MODELS } from '../../store/usePromptStore';
import { useCollectionStore } from '../../store/useCollectionStore';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, path: '/', group: 'Navigation' },
  { id: 'nav-prompts', label: 'Browse All Prompts', icon: BookOpen, path: '/prompts', group: 'Navigation' },
  { id: 'nav-favorites', label: 'View Favorites', icon: Star, path: '/prompts?filter=favorites', group: 'Navigation' },
  { id: 'nav-pinned', label: 'View Pinned', icon: Pin, path: '/prompts?filter=pinned', group: 'Navigation' },
  { id: 'nav-stats', label: 'Open Analytics', icon: BarChart2, path: '/stats', group: 'Navigation' },
  { id: 'nav-settings', label: 'Open Settings', icon: Settings, path: '/settings', group: 'Navigation' },
  { id: 'action-new', label: 'Create New Prompt', icon: Plus, path: '/prompt/new', group: 'Actions' },
];

export default function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const { prompts, recordUsage } = usePromptStore();
  const { collections } = useCollectionStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fuse = useMemo(() => new Fuse(prompts, {
    keys: ['title', 'description', 'tags', 'content'],
    threshold: 0.35,
    includeScore: true,
  }), [prompts]);

  const promptResults = useMemo(() => {
    if (!query.trim()) return prompts.slice(0, 5);
    return fuse.search(query).slice(0, 8).map(r => r.item);
  }, [query, fuse, prompts]);

  const navResults = useMemo(() => {
    if (!query.trim()) return NAV_ITEMS;
    return NAV_ITEMS.filter(n => n.label.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  // Flatten for keyboard nav
  const allItems = useMemo(() => [
    ...navResults.map(n => ({ ...n, type: 'nav' })),
    ...promptResults.map(p => ({ ...p, type: 'prompt', id: p.id })),
  ], [navResults, promptResults]);

  const handleSelect = (item) => {
    if (item.type === 'nav') {
      navigate(item.path);
    } else {
      navigate(`/prompt/${item.id}`);
    }
    onClose();
  };

  const handleCopy = async (e, prompt) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.content);
    recordUsage(prompt.id);
    setCopied(prompt.id);
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 1800);
    onClose();
  };

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      if (allItems[selected]) handleSelect(allItems[selected]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const model = (modelId) => AI_MODELS.find(m => m.id === modelId);

  let navIdx = 0;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ alignItems: 'flex-start', paddingTop: '10vh' }}
    >
      <div
        className="command-palette"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="cp-search-wrap">
          <Search size={16} className="cp-search-icon" />
          <input
            ref={inputRef}
            className="cp-search-input"
            placeholder="Search prompts, navigate..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            id="command-palette-input"
          />
          <kbd className="cp-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="cp-results" ref={listRef}>
          {/* Navigation group */}
          {navResults.length > 0 && (
            <div className="cp-group">
              <div className="cp-group-label">Navigation</div>
              {navResults.map((item, i) => {
                const idx = i;
                navIdx = i + 1;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    className={`cp-item ${selected === idx ? 'cp-item-selected' : ''}`}
                    onClick={() => handleSelect({ ...item, type: 'nav' })}
                    onMouseEnter={() => setSelected(idx)}
                  >
                    <span className="cp-item-icon"><Icon size={15} /></span>
                    <span className="cp-item-label">{item.label}</span>
                    <ArrowRight size={13} className="cp-item-arrow" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Prompts group */}
          {promptResults.length > 0 && (
            <div className="cp-group">
              <div className="cp-group-label">Prompts</div>
              {promptResults.map((p, i) => {
                const idx = navResults.length + i;
                const m = model(p.model);
                return (
                  <button
                    key={p.id}
                    data-idx={idx}
                    className={`cp-item ${selected === idx ? 'cp-item-selected' : ''}`}
                    onClick={() => handleSelect({ ...p, type: 'prompt' })}
                    onMouseEnter={() => setSelected(idx)}
                  >
                    {m && (
                      <span className={`card-model-icon ${m.color}`} style={{ width: 24, height: 24, fontSize: '0.65rem', flexShrink: 0 }}>
                        {m.short}
                      </span>
                    )}
                    <span className="cp-item-label" style={{ flex: 1 }}>
                      {p.title}
                      {p.variables?.length > 0 && (
                        <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--accent-secondary)' }}>
                          <Zap size={10} style={{ display: 'inline', marginRight: 2 }} />
                          {p.variables.length} var{p.variables.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                    <button
                      className="cp-copy-btn"
                      onClick={e => handleCopy(e, p)}
                      title="Copy"
                    >
                      {copied === p.id ? <CheckCheck size={13} style={{ color: 'var(--accent-green)' }} /> : <Copy size={13} />}
                    </button>
                  </button>
                );
              })}
            </div>
          )}

          {allItems.length === 0 && (
            <div className="cp-empty">No results for "{query}"</div>
          )}
        </div>

        <div className="cp-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
