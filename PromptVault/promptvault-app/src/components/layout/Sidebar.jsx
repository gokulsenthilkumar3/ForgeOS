import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Star, Pin, BarChart2, Settings,
  Folder, Plus, ChevronRight, Sparkles, FolderPlus, Trash2
} from 'lucide-react';
import { useCollectionStore } from '../../store/useCollectionStore';
import { usePromptStore } from '../../store/usePromptStore';
import { useState } from 'react';
import Modal from '../ui/Modal';

const COLLECTION_COLOR_MAP = {
  1: '#8b5cf6', 2: '#06b6d4', 3: '#10b981', 4: '#f59e0b', 5: '#ec4899', 6: '#f97316',
};

export default function Sidebar() {
  const { collections, addCollection, deleteCollection } = useCollectionStore();
  const { prompts } = usePromptStore();
  const navigate = useNavigate();
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [newCollColor, setNewCollColor] = useState(1);

  const favCount = prompts.filter((p) => p.isFavorite).length;
  const pinnedCount = prompts.filter((p) => p.isPinned).length;

  const handleAddCollection = () => {
    if (!newCollName.trim()) return;
    const coll = addCollection({ name: newCollName.trim(), colorId: newCollColor });
    setNewCollName('');
    setNewCollColor(1);
    setShowAddCollection(false);
    navigate(`/collections/${coll.id}`);
  };

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Sparkles size={18} color="white" />
          </div>
          <div className="sidebar-logo-text">
            Prompt<span>Vault</span>
          </div>
        </div>

        {/* New Prompt CTA */}
        <button
          className="sidebar-new-prompt"
          onClick={() => navigate('/prompt/new')}
          id="sidebar-new-prompt-btn"
        >
          <Plus size={15} />
          New Prompt
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.6 }}>⌘N</span>
        </button>

        {/* Main Nav */}
        <nav>
          <div className="sidebar-section-title">Navigation</div>


          <NavLink to="/" end className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>

          <NavLink to="/prompts" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <BookOpen size={16} />
            All Prompts
            <span className="nav-badge">{prompts.length}</span>
          </NavLink>

          <NavLink to="/prompts?filter=favorites" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <Star size={16} />
            Favorites
            {favCount > 0 && <span className="nav-badge">{favCount}</span>}
          </NavLink>

          <NavLink to="/prompts?filter=pinned" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <Pin size={16} />
            Pinned
            {pinnedCount > 0 && <span className="nav-badge">{pinnedCount}</span>}
          </NavLink>

          <NavLink to="/stats" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <BarChart2 size={16} />
            Analytics
          </NavLink>
        </nav>

        <div className="sidebar-divider" />

        {/* Collections */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px 4px' }}>
            <span className="sidebar-section-title" style={{ padding: 0, flex: 1 }}>Collections</span>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setShowAddCollection(true)}
              title="New collection"
              style={{ padding: '4px' }}
            >
              <FolderPlus size={14} />
            </button>
          </div>

          {collections.map((coll) => {
            const count = prompts.filter((p) => p.collectionId === coll.id).length;
            return (
              <NavLink
                key={coll.id}
                to={`/collections/${coll.id}`}
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={{ position: 'relative' }}
              >
                <Folder size={15} style={{ color: COLLECTION_COLOR_MAP[coll.colorId] }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {coll.name}
                </span>
                {count > 0 && <span className="nav-badge">{count}</span>}
              </NavLink>
            );
          })}

          {collections.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              No collections yet
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <div className="sidebar-divider" />

        {/* Settings */}
        <NavLink to="/settings" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={16} />
          Settings
        </NavLink>
      </aside>

      {/* Add Collection Modal */}
      {showAddCollection && (
        <Modal
          title="New Collection"
          onClose={() => setShowAddCollection(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowAddCollection(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCollection}>Create</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="input"
              value={newCollName}
              onChange={(e) => setNewCollName(e.target.value)}
              placeholder="e.g. Marketing Prompts"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddCollection()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(COLLECTION_COLOR_MAP).map(([id, hex]) => (
                <button
                  key={id}
                  onClick={() => setNewCollColor(Number(id))}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: hex,
                    border: newCollColor === Number(id) ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer', boxShadow: newCollColor === Number(id) ? `0 0 8px ${hex}` : 'none',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
