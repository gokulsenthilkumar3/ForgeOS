import React, { useState } from 'react';
import { Upload, Table, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import DiffEditor from './DiffEditor';
import { type DiffOptions } from './Sidebar';

interface ExcelCompareProps {
  options: DiffOptions;
}

const ACCEPTED_TYPES = '.xlsx,.xls,.csv,.tsv';

const ExcelCompare: React.FC<ExcelCompareProps> = ({ options }) => {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [modifiedFileName, setModifiedFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (s: string) => void,
    nameSetter: (s: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setError(`"${file.name}" contains no sheets.`);
          setLoading(false);
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        setter(csv);
        nameSetter(file.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Could not parse "${file.name}": ${message}`);
        console.error('Failed to parse Excel:', err);
      }
      setLoading(false);
    };
    reader.onerror = () => {
      setError(`Failed to read "${file.name}".`);
      setLoading(false);
    };
    reader.readAsBinaryString(file);
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

  if (showDiff && originalText && modifiedText) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Table size={18} style={{ color: 'var(--accent)' }} /> Excel Compare
          </div>
          <button className="btn btn-ghost border" onClick={() => setShowDiff(false)}>
            Back to Upload
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <DiffEditor 
            options={{...options, disableWrap: true}} 
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
           <Table size={28} style={{ color: 'var(--accent)' }} />
           <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Compare Excel & CSV Files</h2>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: '0.875rem', width: '100%' }}>
            {error}
          </div>
        )}
        
        <div style={{ display: 'flex', width: '100%', gap: '1rem' }}>
          <label style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: '0.5rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms' }}>
            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <span style={{ fontWeight: 500 }}>Upload Original Spreadsheet</span>
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
          
          <label style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: '0.5rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 150ms' }}>
            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <span style={{ fontWeight: 500 }}>Upload Changed Spreadsheet</span>
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
            COMPARE SPREADSHEETS <Table size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ExcelCompare;
