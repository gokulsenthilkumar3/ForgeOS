import { ShieldCheck, Lock, Monitor, Sun, Moon } from 'lucide-react';

export type TabType = 'Text' | 'JSON' | 'SQL' | 'Images' | 'Documents' | 'Excel' | 'Folders';

interface TabDef {
  id: TabType;
  label: string;
  disabled?: boolean;
}

const TABS: TabDef[] = [
  { id: 'Text', label: 'Text' },
  { id: 'JSON', label: 'JSON' },
  { id: 'SQL', label: 'SQL' },
  { id: 'Images', label: 'Images' },
  { id: 'Documents', label: 'Documents' },
  { id: 'Excel', label: 'Excel' },
  { id: 'Folders', label: 'Folders' },
];

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, theme, onThemeToggle }) => {
  const isElectron = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electron;

  return (
    <header className="navbar fade-in">
      <div className="navbar-left">
        <div className="navbar-brand" onClick={() => window.location.reload()}>
          <div className="navbar-brand-icon">
            <ShieldCheck size={18} color="white" />
          </div>
          <div className="navbar-brand-text">
            Private<span>Comparer</span>
          </div>
        </div>

        <nav className="navbar-tabs">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={`navbar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                if (!tab.disabled) onTabChange(tab.id);
              }}
              title={tab.disabled ? 'Coming soon' : tab.label}
              style={{ opacity: tab.disabled ? 0.6 : 1 }}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!tab.disabled) onTabChange(tab.id);
                }
              }}
            >
              {tab.label}
            </div>
          ))}
        </nav>
      </div>

      <div className="navbar-right">
        <button
          className="navbar-tab"
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ padding: '0.4rem', borderRadius: '50%' }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        
        <div className="navbar-badge" title="All comparisons run locally in your browser. No data is sent to any server.">
          <Lock size={10} strokeWidth={3} />
          Local-Only Mode
        </div>
        
        {isElectron && (
          <div className="navbar-tab" style={{ cursor: 'default', opacity: 0.8 }}>
            <Monitor size={15} />
            <span>Desktop</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
