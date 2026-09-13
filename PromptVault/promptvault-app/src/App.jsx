import { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import AllPrompts from './pages/AllPrompts';
import CollectionView from './pages/CollectionView';
import PromptEditor from './pages/PromptEditor';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import CommandPalette from './components/ui/CommandPalette';

export default function App() {
  const [cmdOpen, setCmdOpen] = useState(false);

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setCmdOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/prompts" element={<AllPrompts />} />
        <Route path="/collections/:id" element={<CollectionView />} />
        <Route path="/prompt/new" element={<PromptEditor />} />
        <Route path="/prompt/:id" element={<PromptEditor />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#141428',
            color: '#f1f0ff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: 'white' },
          },
        }}
      />
    </HashRouter>
  );
}
