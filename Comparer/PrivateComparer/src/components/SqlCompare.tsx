import React, { useState, useCallback } from 'react';
import DiffEditor from './DiffEditor';
import { type DiffOptions } from './Sidebar';
import { Database, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SqlCompareProps {
  options: DiffOptions;
}

// SQL keywords that should start on a new line
const SQL_NEWLINE_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR',
  'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET',
  'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN', 'JOIN',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
  'ON', 'USING', 'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'WITH', 'AS',
];

// SQL statement keywords for validation
const SQL_STATEMENT_STARTERS = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE',
  'DROP', 'ALTER', 'GRANT', 'REVOKE', 'TRUNCATE',
  'MERGE', 'WITH', 'EXPLAIN', 'SHOW', 'DESCRIBE',
  'USE', 'BEGIN', 'COMMIT', 'ROLLBACK', 'SET',
];

interface ValidationResult {
  status: 'success' | 'warning' | 'error';
  message: string;
}

const SqlCompare: React.FC<SqlCompareProps> = ({ options }) => {
  const [originalValue, setOriginalValue] = useState('');
  const [modifiedValue, setModifiedValue] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const formatSql = useCallback((sql: string): string => {
    if (!sql.trim()) return sql;
    
    // Normalize whitespace (preserve within strings)
    let formatted = sql.replace(/\s+/g, ' ').trim();
    
    // Sort keywords by length (longest first) to avoid partial replacements
    const sortedKeywords = [...SQL_NEWLINE_KEYWORDS].sort((a, b) => b.length - a.length);
    
    sortedKeywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      formatted = formatted.replace(regex, `\n${kw.toUpperCase()}`);
    });
    
    // Clean up: remove leading newline, collapse multiple newlines
    return formatted
      .replace(/^\n/, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }, []);

  const checkSqlSyntax = useCallback((sql: string): boolean => {
    if (!sql.trim()) return true;
    const upper = sql.trim().toUpperCase();
    return SQL_STATEMENT_STARTERS.some(kw => upper.includes(kw));
  }, []);

  const handleFormat = () => {
    const warnings: string[] = [];

    if (originalValue.trim() && !checkSqlSyntax(originalValue)) {
      warnings.push('Original input does not appear to be valid SQL.');
    }
    if (modifiedValue.trim() && !checkSqlSyntax(modifiedValue)) {
      warnings.push('Changed input does not appear to be valid SQL.');
    }

    if (warnings.length > 0) {
       setValidationResult({ status: 'warning', message: warnings.join(' ') });
    } else {
       setValidationResult({ status: 'success', message: 'SQL valid. Formatting applied.' });
    }

    // Always apply formatting even with warnings
    if (originalValue.trim()) setOriginalValue(formatSql(originalValue));
    if (modifiedValue.trim()) setModifiedValue(formatSql(modifiedValue));
  };

  const overrideOptions = { ...options, syntax: 'sql' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <Database size={18} style={{ color: 'var(--accent)' }} /> SQL Compare & Checker
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
           {validationResult && (
            <div style={{ 
              fontSize: '0.8125rem', 
              color: validationResult.status === 'warning' ? 'var(--yellow)' : validationResult.status === 'error' ? 'var(--red)' : 'var(--green)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              maxWidth: '400px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {validationResult.status === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
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

export default SqlCompare;
