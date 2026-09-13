import React, { useState, useCallback } from 'react';
import DiffEditor from './DiffEditor';
import { type DiffOptions } from './Sidebar';
import { Braces, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface JsonCompareProps {
  options: DiffOptions;
}

interface ValidationResult {
  status: 'success' | 'error';
  message: string;
}

const JsonCompare: React.FC<JsonCompareProps> = ({ options }) => {
  const [originalValue, setOriginalValue] = useState('');
  const [modifiedValue, setModifiedValue] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const handleFormat = useCallback(() => {
    let orig = originalValue;
    let mod = modifiedValue;
    const errors: string[] = [];

    try {
      if (orig.trim()) orig = JSON.stringify(JSON.parse(orig), null, 2);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Invalid JSON';
      errors.push(`Original: ${message}`);
    }

    try {
      if (mod.trim()) mod = JSON.stringify(JSON.parse(mod), null, 2);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Invalid JSON';
      errors.push(`Changed: ${message}`);
    }

    if (errors.length > 0) {
       setValidationResult({ status: 'error', message: errors.join(' | ') });
    } else {
       setValidationResult({ status: 'success', message: 'Valid JSON. Formatted successfully!' });
       setOriginalValue(orig);
       setModifiedValue(mod);
    }
  }, [originalValue, modifiedValue]);

  const overrideOptions = { ...options, syntax: 'json' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <Braces size={18} style={{ color: 'var(--accent)' }} /> JSON Compare & Checker
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {validationResult && (
            <div style={{ 
              fontSize: '0.8125rem', 
              color: validationResult.status === 'error' ? 'var(--red)' : 'var(--green)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              maxWidth: '500px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {validationResult.status === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              {validationResult.message}
            </div>
          )}
          <button className="btn btn-primary" onClick={handleFormat} style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
            Validate & Format
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DiffEditor 
          options={overrideOptions}
          originalValue={originalValue}
          modifiedValue={modifiedValue}
          onOriginalChange={(v) => { setOriginalValue(v); setValidationResult(null); }}
          onModifiedChange={(v) => { setModifiedValue(v); setValidationResult(null); }}
        />
      </div>
    </div>
  );
};

export default JsonCompare;
