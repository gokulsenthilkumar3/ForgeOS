import React, { useState } from 'react';
import { Upload, FolderSync, FilePlus, FileMinus, FileEdit, ArrowLeft } from 'lucide-react';
import DiffEditor from './DiffEditor';
import { type DiffOptions } from './Sidebar';

interface FileNode {
  path: string;
  file: File;
}

interface DiffEntry {
  path: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  origFile?: File;
  modFile?: File;
}

interface FolderCompareProps {
  options?: DiffOptions;
}

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

const FolderCompare: React.FC<FolderCompareProps> = ({ options }) => {
  const [origFiles, setOrigFiles] = useState<FileNode[]>([]);
  const [modFiles, setModFiles] = useState<FileNode[]>([]);
  const [diffs, setDiffs] = useState<DiffEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // For text diff of individual files
  const [textDiffEntry, setTextDiffEntry] = useState<DiffEntry | null>(null);
  const [textDiffOrig, setTextDiffOrig] = useState('');
  const [textDiffMod, setTextDiffMod] = useState('');
  const [loadingTextDiff, setLoadingTextDiff] = useState(false);

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: FileNode[]) => void) => {
    const files = Array.from(e.target.files || []);
    const nodes = files.map(f => ({
      path: (f as unknown as { webkitRelativePath: string }).webkitRelativePath || f.name,
      file: f,
    }));
    setter(nodes);
    e.target.value = '';
  };

  const computeFolderDiff = async () => {
    setLoading(true);
    const results: DiffEntry[] = [];
    
    // Strip root folder name to get sub-paths
    const getSubPath = (p: string) => {
      const slashIdx = p.indexOf('/');
      return slashIdx >= 0 ? p.substring(slashIdx + 1) : p;
    };
    
    const origMap = new Map(origFiles.map(n => [getSubPath(n.path), n.file]));
    const modMap = new Map(modFiles.map(n => [getSubPath(n.path), n.file]));
    
    for (const [path, origFile] of origMap.entries()) {
      if (!modMap.has(path)) {
        results.push({ path, type: 'removed', origFile });
      } else {
        const modFile = modMap.get(path)!;
        // Compare by size; if same size, do content comparison for text files
        if (origFile.size !== modFile.size) {
          results.push({ path, type: 'modified', origFile, modFile });
        } else {
          // Quick check: compare a content hash for text files
          try {
            const origContent = await origFile.text();
            const modContent = await modFile.text();
            if (origContent !== modContent) {
              results.push({ path, type: 'modified', origFile, modFile });
            } else {
              results.push({ path, type: 'unchanged', origFile, modFile });
            }
          } catch {
            // For binary files, treat same-size as unchanged
            results.push({ path, type: 'unchanged', origFile, modFile });
          }
        }
        modMap.delete(path);
      }
    }
    
    for (const [path, modFile] of modMap.entries()) {
      results.push({ path, type: 'added', modFile });
    }
    
    setDiffs(results.sort((a, b) => a.path.localeCompare(b.path)));
    setLoading(false);
  };

  const handleTextDiff = async (entry: DiffEntry) => {
    setLoadingTextDiff(true);
    try {
      const origContent = entry.origFile ? await entry.origFile.text() : '';
      const modContent = entry.modFile ? await entry.modFile.text() : '';
      setTextDiffOrig(origContent);
      setTextDiffMod(modContent);
      setTextDiffEntry(entry);
    } catch (err) {
      console.error('Failed to read file for diff:', err);
    }
    setLoadingTextDiff(false);
  };

  // Show individual file text diff
  if (textDiffEntry) {
    const diffOptions = options || DEFAULT_OPTIONS;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <FileEdit size={18} style={{ color: 'var(--accent)' }} /> {textDiffEntry.path}
          </div>
          <button className="btn btn-ghost border" onClick={() => setTextDiffEntry(null)}>
            <ArrowLeft size={14} /> Back to Results
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <DiffEditor 
            options={diffOptions}
            originalValue={textDiffOrig}
            modifiedValue={textDiffMod}
            onOriginalChange={setTextDiffOrig}
            onModifiedChange={setTextDiffMod}
          />
        </div>
      </div>
    );
  }

  // Show folder diff results
  if (diffs.length > 0) {
    const addedCount = diffs.filter(d => d.type === 'added').length;
    const removedCount = diffs.filter(d => d.type === 'removed').length;
    const modifiedCount = diffs.filter(d => d.type === 'modified').length;
    const changedDiffs = diffs.filter(d => d.type !== 'unchanged');

    return (
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
         <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderSync style={{ color: 'var(--accent)' }} /> Folder Analysis Complete
            </h2>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.25rem 0.75rem', background: 'var(--green-dim)', color: 'var(--green)', fontWeight: 600, borderRadius: '0.25rem' }}>{addedCount} Added</div>
              <div style={{ padding: '0.25rem 0.75rem', background: 'var(--red-dim)', color: 'var(--red)', fontWeight: 600, borderRadius: '0.25rem' }}>{removedCount} Removed</div>
              <div style={{ padding: '0.25rem 0.75rem', background: 'var(--yellow-dim)', color: 'var(--yellow)', fontWeight: 600, borderRadius: '0.25rem' }}>{modifiedCount} Modified</div>
            </div>
            
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
              {changedDiffs.length > 0 ? changedDiffs.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                  {d.type === 'added' && <FilePlus size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />}
                  {d.type === 'removed' && <FileMinus size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />}
                  {d.type === 'modified' && <FileEdit size={16} style={{ color: 'var(--yellow)', flexShrink: 0 }} />}
                  <span style={{ fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.path}</span>
                  {d.type === 'modified' && (
                    <button 
                      className="btn btn-ghost border"
                      style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem', flexShrink: 0 }}
                      onClick={() => handleTextDiff(d)}
                      disabled={loadingTextDiff}
                    >
                      {loadingTextDiff ? 'Loading...' : 'View Text Diff'}
                    </button>
                  )}
                </div>
              )) : (
                 <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Folders are identical.</div>
              )}
            </div>
            
            <button className="btn btn-ghost border" style={{ marginTop: '1.5rem' }} onClick={() => { setDiffs([]); setOrigFiles([]); setModFiles([]); }}>
              <ArrowLeft size={14} /> Back to Upload
            </button>
         </div>
      </div>
    );
  }

  // Upload view
  return (
    <div className="input-area fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '42rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
           <FolderSync size={28} style={{ color: 'var(--accent)' }} />
           <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Compare Local Folders</h2>
        </div>
        
        <div style={{ display: 'flex', width: '100%', gap: '1rem' }}>
          <label style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: '0.5rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms' }}>
            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <span style={{ fontWeight: 500 }}>Original Folder</span>
            <input type="file" multiple {...{webkitdirectory: "", directory: ""} as React.InputHTMLAttributes<HTMLInputElement>} hidden onChange={e => handleFolderUpload(e, setOrigFiles)} />
            {origFiles.length > 0 && <span style={{ marginTop: '1rem', color: 'var(--green)', fontWeight: 700 }}>{origFiles.length} files loaded ✓</span>}
          </label>
          
          <label style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: '0.5rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms' }}>
            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <span style={{ fontWeight: 500 }}>Changed Folder</span>
            <input type="file" multiple {...{webkitdirectory: "", directory: ""} as React.InputHTMLAttributes<HTMLInputElement>} hidden onChange={e => handleFolderUpload(e, setModFiles)} />
            {modFiles.length > 0 && <span style={{ marginTop: '1rem', color: 'var(--green)', fontWeight: 700 }}>{modFiles.length} files loaded ✓</span>}
          </label>
        </div>
        
        {origFiles.length > 0 && modFiles.length > 0 && (
          <button 
            className="find-diff-btn"
            onClick={computeFolderDiff} 
            style={{ marginTop: '2rem' }}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Analyze Differences'}
          </button>
        )}
        {loading && <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>Analyzing structures...</div>}
      </div>
    </div>
  );
};

export default FolderCompare;
