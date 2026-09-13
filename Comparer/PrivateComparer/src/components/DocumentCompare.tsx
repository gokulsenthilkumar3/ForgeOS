import React, { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import DiffEditor from './DiffEditor';
import { type DiffOptions } from './Sidebar';

// Use versioned CDN for stability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface DocumentCompareProps {
  options: DiffOptions;
}

const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md,.csv,.json,.xml,.html';

const DocumentCompare: React.FC<DocumentCompareProps> = ({ options }) => {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [modifiedFileName, setModifiedFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const parseFile = useCallback(async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        text += textContent.items
          .map((item: Record<string, unknown>) => (item as { str: string }).str)
          .join(' ') + '\n';
      }
      return text.trim();
    } else if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else {
      return await file.text();
    }
  }, []);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (s: string) => void,
    nameSetter: (s: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const text = await parseFile(file);
      setter(text);
      nameSetter(file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Could not parse "${file.name}": ${message}`);
      console.error('Failed to parse document:', err);
    }
    setLoading(false);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleClearOriginal = () => {
    setOriginalText('');
    setOriginalFileName('');
    setShowDiff(false);
  };

  const handleClearModified = () => {
    setModifiedText('');
    setModifiedFileName('');
    setShowDiff(false);
  };

  // Show diff editor when both files are loaded and comparing
  if (showDiff && originalText && modifiedText) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <FileText size={18} style={{ color: 'var(--accent)' }} /> Document Compare
          </div>
          <button className="btn btn-ghost border" onClick={() => setShowDiff(false)}>
            Back to Upload
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <DiffEditor 
            options={options} 
            originalValue={originalText}
            modifiedValue={modifiedText}
            onOriginalChange={setOriginalText}
            onModifiedChange={setModifiedText}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="input-area fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '42rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
           <FileText size={28} style={{ color: 'var(--accent)' }} />
           <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Compare PDF & Word Documents</h2>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: '0.875rem', width: '100%' }}>
            {error}
          </div>
        )}
        
        <div style={{ display: 'flex', width: '100%', gap: '1rem' }}>
          <label style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: '0.5rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms', position: 'relative' }}>
            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <span style={{ fontWeight: 500 }}>Upload Original Document</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{ACCEPTED_TYPES}</span>
            <input type="file" accept={ACCEPTED_TYPES} hidden onChange={e => handleFileUpload(e, setOriginalText, setOriginalFileName)} />
            {originalFileName && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓ {originalFileName}</span>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearOriginal(); }} style={{ padding: '2px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} title="Clear">
                  <X size={12} />
                </button>
              </div>
            )}
          </label>
          
          <label style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: '0.5rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms', position: 'relative' }}>
            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <span style={{ fontWeight: 500 }}>Upload Changed Document</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{ACCEPTED_TYPES}</span>
            <input type="file" accept={ACCEPTED_TYPES} hidden onChange={e => handleFileUpload(e, setModifiedText, setModifiedFileName)} />
            {modifiedFileName && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓ {modifiedFileName}</span>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearModified(); }} style={{ padding: '2px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} title="Clear">
                  <X size={12} />
                </button>
              </div>
            )}
          </label>
        </div>

        {loading && <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>Parsing files...</div>}
        
        {originalText && modifiedText && !loading && (
          <button 
            className="find-diff-btn" 
            onClick={() => setShowDiff(true)}
            style={{ marginTop: '2rem' }}
          >
            COMPARE DOCUMENTS <FileText size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentCompare;
