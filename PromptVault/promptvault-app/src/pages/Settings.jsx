import { useRef, useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle, CheckCheck } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { usePromptStore } from '../store/usePromptStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const { prompts, importPrompts } = usePromptStore();
  const fileRef = useRef();
  const [importPreview, setImportPreview] = useState(null);
  const [importData, setImportData] = useState(null);

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      count: prompts.length,
      prompts: prompts.map(({ id, title, content, description, tags, model, collectionId, isFavorite, isPinned, rating, usageCount, createdAt, updatedAt, variables }) => ({
        id, title, content, description, tags, model, collectionId, isFavorite, isPinned, rating, usageCount, createdAt, updatedAt, variables,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptvault-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${prompts.length} prompts!`);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const items = parsed.prompts || parsed;
        if (!Array.isArray(items)) throw new Error('Invalid format');
        setImportData(items);
        setImportPreview({
          count: items.length,
          sample: items.slice(0, 3).map((p) => p.title),
        });
      } catch {
        toast.error('Invalid JSON file. Please use a PromptVault export file.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!importData) return;
    importPrompts(importData);
    toast.success(`Imported ${importData.length} prompts!`);
    setImportData(null);
    setImportPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClearAll = () => {
    if (prompt('Type DELETE to confirm clearing all prompts:') === 'DELETE') {
      usePromptStore.setState({ prompts: [] });
      toast.success('All prompts cleared');
    }
  };

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Export */}
        <div className="glass-card p-6">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Download size={16} style={{ color: 'var(--accent-green)' }} /> Export Prompts
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Download all your prompts as a JSON backup. You can import this file later or share it.
            Currently you have <strong style={{ color: 'var(--text-primary)' }}>{prompts.length} prompts</strong>.
          </p>
          <button id="export-btn" className="btn btn-primary" onClick={handleExport}>
            <Download size={15} /> Export {prompts.length} Prompts
          </button>
        </div>

        {/* Import */}
        <div className="glass-card p-6">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Upload size={16} style={{ color: 'var(--accent-primary)' }} /> Import Prompts
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Import prompts from a PromptVault JSON export file. Existing prompts will not be replaced.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="import-file-input"
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              id="choose-file-btn"
              className="btn btn-secondary"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} /> Choose JSON File
            </button>

            {importData && (
              <button
                id="confirm-import-btn"
                className="btn btn-primary"
                onClick={handleImport}
              >
                <CheckCheck size={15} /> Import {importData.length} Prompts
              </button>
            )}
          </div>

          {importPreview && (
            <div className="glass-card" style={{ padding: '12px 16px', marginTop: 12, borderColor: 'rgba(139,92,246,0.3)' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6 }}>
                Preview: {importPreview.count} prompts found
              </p>
              <ul style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', paddingLeft: 16 }}>
                {importPreview.sample.map((title, i) => (
                  <li key={i}>{title}</li>
                ))}
                {importPreview.count > 3 && <li>...and {importPreview.count - 3} more</li>}
              </ul>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--accent-red)' }}>
            <AlertTriangle size={16} /> Danger Zone
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Permanently delete all prompts. This cannot be undone. Export first!
          </p>
          <button id="clear-all-btn" className="btn btn-danger" onClick={handleClearAll}>
            <Trash2 size={15} /> Clear All Prompts
          </button>
        </div>

        {/* About */}
        <div className="glass-card p-6">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>About PromptVault</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            PromptVault is your premium AI prompt management studio. Store, organize, version, and run prompts
            for any AI model. Built with React + Vite, Zustand, Fuse.js, and Recharts.
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
            <span className="badge badge-violet">v1.0.0</span>
            <span className="badge badge-gray">React 18</span>
            <span className="badge badge-gray">Vite 5</span>
            <span className="badge badge-gray">Zustand</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
