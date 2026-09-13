import React from 'react';
import { Settings, History, Trash2 } from 'lucide-react';
import { type DiffPrecision } from '../lib/diffEngine';

export interface DiffOptions {
  realTime: boolean;
  hideUnchanged: boolean;
  disableWrap: boolean;
  layout: 'split' | 'unified';
  precision: DiffPrecision;
  syntax: string;
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
  trimWhitespace: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  originalValue: string;
  modifiedValue: string;
  preview?: string;
}

interface SidebarProps {
  options: DiffOptions;
  setOptions: (options: DiffOptions | ((prev: DiffOptions) => DiffOptions)) => void;
  collapsed: boolean;
  onRestore: (orig: string, mod: string) => void;
}

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => (
  <label className="sidebar-row">
    <span>{label}</span>
    <div 
      className={`toggle ${checked ? 'active' : ''}`}
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange();
        }
      }}
    >
      <div className="toggle-knob" />
    </div>
  </label>
);

const Sidebar: React.FC<SidebarProps> = ({ options, setOptions, collapsed, onRestore }) => {
  const [activeTab, setActiveTab] = React.useState<'tools'|'history'>('tools');
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);

  React.useEffect(() => {
    const loadHistory = () => {
      try {
        setHistory(JSON.parse(localStorage.getItem('diff-history') || '[]'));
      } catch {
        setHistory([]);
      }
    };
    loadHistory();
    window.addEventListener('history-updated', loadHistory);
    return () => window.removeEventListener('history-updated', loadHistory);
  }, []);

  if (collapsed) return null;

  const updateOption = <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const clearHistory = () => {
    localStorage.removeItem('diff-history');
    setHistory([]);
    window.dispatchEvent(new Event('history-updated'));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    localStorage.setItem('diff-history', JSON.stringify(updated));
    setHistory(updated);
    window.dispatchEvent(new Event('history-updated'));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-tabs">
          <button 
            className={`sidebar-header-tab ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            <Settings size={14} /> Tools
          </button>
          <button 
            className={`sidebar-header-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={14} /> History
            {history.length > 0 && (
              <span style={{ marginLeft: '4px', fontSize: '0.625rem', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '1px 5px', borderRadius: '999px', fontWeight: 700 }}>
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div style={{ display: activeTab === 'tools' ? 'block' : 'none' }}>
        <div className="sidebar-section">
          <ToggleSwitch label="Real-time editor" checked={options.realTime} onChange={() => updateOption('realTime', !options.realTime)} />
          <ToggleSwitch label="Hide unchanged lines" checked={options.hideUnchanged} onChange={() => updateOption('hideUnchanged', !options.hideUnchanged)} />
          <ToggleSwitch label="Disable line wrap" checked={options.disableWrap} onChange={() => updateOption('disableWrap', !options.disableWrap)} />
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Layout</div>
          <div className="segmented" role="radiogroup" aria-label="Layout">
            <button 
              className={`segmented-btn ${options.layout === 'split' ? 'active' : ''}`}
              onClick={() => updateOption('layout', 'split')}
              role="radio"
              aria-checked={options.layout === 'split'}
            >
              Split
            </button>
            <button 
              className={`segmented-btn ${options.layout === 'unified' ? 'active' : ''}`}
              onClick={() => updateOption('layout', 'unified')}
              role="radio"
              aria-checked={options.layout === 'unified'}
            >
              Unified
            </button>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Diff precision</div>
          <div className="segmented" role="radiogroup" aria-label="Diff precision">
            <button 
              className={`segmented-btn ${options.precision === 'word' ? 'active' : ''}`}
              onClick={() => updateOption('precision', 'word')}
              role="radio"
              aria-checked={options.precision === 'word'}
            >
              Word
            </button>
            <button 
              className={`segmented-btn ${options.precision === 'character' ? 'active' : ''}`}
              onClick={() => updateOption('precision', 'character')}
              role="radio"
              aria-checked={options.precision === 'character'}
            >
              Character
            </button>
          </div>
        </div>

        <div className="sidebar-section" style={{ borderBottom: 'none' }}>
          <div className="sidebar-section-title">Text transformations</div>
          <ToggleSwitch label="Ignore case" checked={options.ignoreCase} onChange={() => updateOption('ignoreCase', !options.ignoreCase)} />
          <ToggleSwitch label="Ignore whitespace" checked={options.ignoreWhitespace} onChange={() => updateOption('ignoreWhitespace', !options.ignoreWhitespace)} />
          <ToggleSwitch label="Trim whitespace" checked={options.trimWhitespace} onChange={() => updateOption('trimWhitespace', !options.trimWhitespace)} />
        </div>
      </div>
      
      {activeTab === 'history' && (
        <div className="history-tab" style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
          {history.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                <button 
                  className="btn btn-ghost"
                  onClick={clearHistory}
                  style={{ fontSize: '0.75rem', color: 'var(--red)', padding: '0.25rem 0.5rem' }}
                >
                  <Trash2 size={12} /> Clear All
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.map(item => (
                  <div 
                    key={item.id} 
                    style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.375rem', cursor: 'pointer', border: '1px solid var(--border)', transition: 'border-color 150ms', position: 'relative' }}
                    onClick={() => onRestore(item.originalValue, item.modifiedValue)}
                    title="Click to restore this diff"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Saved Diff</div>
                      <button 
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        style={{ padding: '2px', borderRadius: '4px', color: 'var(--text-muted)' }}
                        title="Delete this entry"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(item.timestamp)}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>
                      {item.preview || item.originalValue.substring(0, 80).replace(/\n/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
              No history found.<br/><br/>Click the 'Save' button in your Diff output to track changes.
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
