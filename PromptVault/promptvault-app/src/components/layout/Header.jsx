import { Search, Plus, Grid3X3, List, SortAsc, SortDesc, Command } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useNavigate, useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/prompts': 'All Prompts',
  '/stats': 'Analytics',
  '/settings': 'Settings',
};

export default function Header({ title }) {
  const { searchQuery, setSearchQuery, viewMode, setViewMode, sortBy, setSortBy, sortDir, setSortDir } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = title || PAGE_TITLES[location.pathname] || 'PromptVault';
  const showSearch = ['/prompts'].some((p) => location.pathname.startsWith(p));

  const toggleSort = () => setSortDir(sortDir === 'desc' ? 'asc' : 'desc');

  const triggerCmdPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  };

  return (
    <header className="header">
      <h1 className="header-title" style={{ fontSize: '1rem', fontWeight: 700 }}>{pageTitle}</h1>

      {/* Command palette pill — always visible */}
      <button
        className="header-cmd-pill"
        onClick={triggerCmdPalette}
        id="cmd-palette-trigger"
        title="Command Palette (Ctrl+K)"
      >
        <Search size={13} style={{ color: 'var(--text-muted)' }} />
        <span>Search anything...</span>
        <kbd>⌘K</kbd>
      </button>

      {showSearch && (
        <div className="header-search">
          <Search size={14} className="header-search-icon" />
          <input
            id="global-search"
            className="header-search-input"
            placeholder="Filter prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="header-actions">
        {showSearch && (
          <>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8125rem', borderRadius: 8 }}
            >
              <option value="updatedAt">Modified</option>
              <option value="createdAt">Created</option>
              <option value="title">Title</option>
              <option value="usageCount">Most Used</option>
              <option value="rating">Rating</option>
            </select>

            <button
              id="sort-dir-btn"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={toggleSort}
              title={sortDir === 'desc' ? 'Sort descending' : 'Sort ascending'}
            >
              {sortDir === 'desc' ? <SortDesc size={16} /> : <SortAsc size={16} />}
            </button>

            <button
              id="view-grid-btn"
              className={`btn btn-icon btn-sm ${viewMode === 'grid' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid3X3 size={16} />
            </button>

            <button
              id="view-list-btn"
              className={`btn btn-icon btn-sm ${viewMode === 'list' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </>
        )}

        <button
          id="new-prompt-btn"
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/prompt/new')}
        >
          <Plus size={15} />
          New Prompt
        </button>
      </div>
    </header>
  );
}
