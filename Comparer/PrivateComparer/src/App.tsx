import React, { useState, useEffect, Component, type ReactNode } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import Header, { type TabType } from './components/Header';
import Sidebar, { type DiffOptions } from './components/Sidebar';
import DiffEditor from './components/DiffEditor';
import ImageCompare from './components/ImageCompare';
import DocumentCompare from './components/DocumentCompare';
import ExcelCompare from './components/ExcelCompare';
import FolderCompare from './components/FolderCompare';
import JsonCompare from './components/JsonCompare';
import SqlCompare from './components/SqlCompare';

// ─── Error Boundary ───
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', color: 'var(--text-secondary)' }}>
          <AlertTriangle size={32} style={{ color: 'var(--red)' }} />
          <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Something went wrong</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred in this tab.'}
          </div>
          <button className="btn btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Constants ───
const APP_NAME = 'Private Comparer';
const APP_VERSION = '1.0.0';
const SPLASH_DURATION = 1200;

const STORAGE_KEYS = {
  activeTab: 'pc-activeTab',
  theme: 'pc-theme',
  options: 'pc-options',
} as const;

const DEFAULT_OPTIONS: DiffOptions = {
  realTime: false,
  hideUnchanged: false,
  disableWrap: false,
  layout: 'split',
  precision: 'word',
  syntax: 'auto',
  ignoreCase: false,
  ignoreWhitespace: false,
  trimWhitespace: false,
};

const TABS_WITH_SIDEBAR: TabType[] = ['Text', 'JSON', 'SQL', 'Documents', 'Excel'];

// ─── Main App ───
const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem(STORAGE_KEYS.activeTab) as TabType) || 'Text';
  });
  const [sidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(STORAGE_KEYS.theme) as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
  }, [activeTab]);

  // Text diff settings
  const [options, setOptions] = useState<DiffOptions>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.options);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_OPTIONS, ...parsed }; 
      } catch {
        // Corrupted storage — use defaults
      }
    }
    return DEFAULT_OPTIONS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.options, JSON.stringify(options));
  }, [options]);

  const [originalValue, setOriginalValue] = useState('');
  const [modifiedValue, setModifiedValue] = useState('');

  // Splash screen
  useEffect(() => {
    const timer = setTimeout(() => setHasStarted(true), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  if (!hasStarted) {
    return (
      <div className="splash fade-in">
        <div className="splash-content">
          <div className="splash-icon">
            <Shield size={40} color="var(--accent)" />
          </div>
          <h2 className="splash-title">
            Private<span>Comparer</span>
          </h2>
          <div className="splash-sub">
            <Lock size={12} />
            Enterprise Privacy Framework
          </div>
          <div className="loading-bar">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleRestore = (orig: string, mod: string) => {
    setOriginalValue(orig);
    setModifiedValue(mod);
    setActiveTab('Text');
  };

  const currentYear = new Date().getFullYear();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Text':
        return (
          <DiffEditor 
            options={options}
            originalValue={originalValue}
            modifiedValue={modifiedValue}
            onOriginalChange={setOriginalValue}
            onModifiedChange={setModifiedValue}
          />
        );
      case 'JSON':
        return <JsonCompare options={options} />;
      case 'SQL':
        return <SqlCompare options={options} />;
      case 'Images':
        return <ImageCompare />;
      case 'Documents':
        return <DocumentCompare options={options} />;
      case 'Excel':
        return <ExcelCompare options={options} />;
      case 'Folders':
        return <FolderCompare options={options} />;
      default:
        return (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Not yet implemented.
          </div>
        );
    }
  };

  return (
    <div className="app-layout fade-in">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        theme={theme}
        onThemeToggle={() => setTheme(p => p === 'dark' ? 'light' : 'dark')}
      />
      
      <main className="main-content">
        {TABS_WITH_SIDEBAR.includes(activeTab) && (
          <Sidebar 
            options={options} 
            setOptions={setOptions} 
            collapsed={sidebarCollapsed} 
            onRestore={handleRestore}
          />
        )}
        
        <ErrorBoundary key={activeTab}>
          {renderActiveTab()}
        </ErrorBoundary>
      </main>

      <footer className="app-footer">
        <div>&copy; {currentYear} {APP_NAME} v{APP_VERSION}</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.625rem', color: 'var(--accent)', opacity: 0.8 }}>
            <Lock size={8} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px', marginTop: '-1px' }} />
            100% Client-Side
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
