import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileUp, ArrowRight, Plus, Minus, Download, Save, Share, RefreshCcw } from 'lucide-react';
import { computeDiff, type DiffResult, type UnifiedLine, type InlineChange } from '../lib/diffEngine';
import { type DiffOptions } from './Sidebar';

const renderLineContent = (content: string, inlineChanges?: InlineChange[]) => {
  if (!inlineChanges || inlineChanges.length === 0) return content || ' ';
  return inlineChanges.map((chunk, i) => {
    if (chunk.type === 'unchanged') return <span key={i}>{chunk.value}</span>;
    const style: React.CSSProperties = chunk.type === 'added'
      ? { background: 'rgba(63,185,80,0.3)', borderRadius: '2px' }
      : { background: 'rgba(248,81,73,0.3)', borderRadius: '2px' };
    return <span key={i} style={style}>{chunk.value}</span>;
  });
};

interface DiffEditorProps {
  originalValue: string;
  modifiedValue: string;
  onOriginalChange: (value: string) => void;
  onModifiedChange: (value: string) => void;
  options: DiffOptions;
}

const DiffEditor: React.FC<DiffEditorProps> = ({
  originalValue,
  modifiedValue,
  onOriginalChange,
  onModifiedChange,
  options
}) => {
  const [showDiff, setShowDiff] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeAndShowDiff = useCallback(() => {
    let orig = originalValue;
    let mod = modifiedValue;

    if (options.ignoreCase) {
      orig = orig.toLowerCase();
      mod = mod.toLowerCase();
    }

    if (options.trimWhitespace) {
      orig = orig.split('\n').map(l => l.replace(/^\s+|\s+$/g, '')).join('\n');
      mod = mod.split('\n').map(l => l.replace(/^\s+|\s+$/g, '')).join('\n');
    }

    if (options.ignoreWhitespace) {
      orig = orig.split('\n').map(l => l.replace(/\s+/g, ' ')).join('\n');
      mod = mod.split('\n').map(l => l.replace(/\s+/g, ' ')).join('\n');
    }

    const result = computeDiff(orig, mod, options.precision, {
      ignoreCase: options.ignoreCase,
      ignoreWhitespace: options.ignoreWhitespace,
      trimWhitespace: options.trimWhitespace,
    });
    setDiffResult(result);
    setShowDiff(true);
  }, [originalValue, modifiedValue, options.ignoreCase, options.ignoreWhitespace, options.trimWhitespace, options.precision]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (side === 'left') onOriginalChange(content);
      else onModifiedChange(content);
    };
    reader.readAsText(file);
    // Reset file input so re-uploading the same file triggers onChange
    e.target.value = '';
  };

  // Re-compute when options change while diff is visible
  useEffect(() => {
    if (showDiff) {
      computeAndShowDiff();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.ignoreCase, options.ignoreWhitespace, options.trimWhitespace, options.precision, options.hideUnchanged, options.disableWrap, options.layout]);

  // Re-compute when text changes in real-time mode (debounced)
  useEffect(() => {
    if (showDiff && options.realTime) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        computeAndShowDiff();
      }, 300);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalValue, modifiedValue, options.realTime, showDiff]);

  const handleSwap = () => {
    const temp = originalValue;
    onOriginalChange(modifiedValue);
    onModifiedChange(temp);
  };

  const handleClear = () => {
    onOriginalChange('');
    onModifiedChange('');
  };

  const handleExport = () => {
    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const htmlContent = `<!DOCTYPE html><html><head><title>Diff Export - Private Comparer</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
        pre { background: #f6f8fa; padding: 15px; border-radius: 6px; overflow: auto; font-size: 13px; }
        .added { background: #dafbe1; }
        .removed { background: #ffebe9; }
        .stats { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .stat { padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 14px; }
        .stat.rem { background: #ffebe9; color: #cf222e; }
        .stat.add { background: #dafbe1; color: #1a7f37; }
      </style>
    </head><body>
      <h2>Private Comparer — Exported Diff</h2>
      <div class="stats">
        <span class="stat rem">− ${diffResult?.removals ?? 0} removals</span>
        <span class="stat add">+ ${diffResult?.additions ?? 0} additions</span>
      </div>
      <h3>Original</h3>
      <pre>${escapeHtml(originalValue)}</pre>
      <h3>Modified</h3>
      <pre>${escapeHtml(modifiedValue)}</pre>
    </body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff-export-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    const hist = JSON.parse(localStorage.getItem('diff-history') || '[]');
    const preview = originalValue.substring(0, 80).replace(/\n/g, ' ');
    hist.unshift({
      id: Date.now().toString(),
      timestamp: Date.now(),
      originalValue,
      modifiedValue,
      preview,
    });
    localStorage.setItem('diff-history', JSON.stringify(hist.slice(0, 20)));
    window.dispatchEvent(new Event('history-updated'));
  };

  const handleShare = async () => {
    const text = `Original:\n${originalValue}\n\nModified:\n${modifiedValue}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Private Comparer Diff', text });
      } catch {
        // user cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // fallback
      }
    }
  };

  if (!showDiff) {
    return (
      <div className="input-area fade-in">
        <div className="input-columns">
          <div className="input-column">
            <div className="input-column-header">
              <div className="input-column-header-title">Original text</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={() => onOriginalChange('')} title="Clear original text" style={{ padding: '0.25rem 0.5rem' }}>
                  <RefreshCcw size={14} /> Clear
                </button>
                <label className="file-btn">
                  <FileUp size={14} /> Open file
                  <input type="file" hidden onChange={(e) => handleFileChange(e, 'left')} />
                </label>
              </div>
            </div>
            <textarea 
              className="input-textarea"
              placeholder="Paste original text here"
              value={originalValue}
              spellCheck={false}
              onChange={(e) => onOriginalChange(e.target.value)}
              style={{ whiteSpace: options.disableWrap ? 'pre' : 'pre-wrap' }}
            />
          </div>

          <div style={{ 
            width: '40px', 
            background: 'var(--bg-tertiary)', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderLeft: '1px solid var(--border)', 
            borderRight: '1px solid var(--border)',
            gap: '1rem'
          }}>
            <button className="btn btn-ghost" onClick={handleSwap} title="Swap texts" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-secondary)' }}>
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-ghost" onClick={handleClear} title="Clear all" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--red)' }}>
              <RefreshCcw size={16} />
            </button>
          </div>

          <div className="input-column">
            <div className="input-column-header">
              <div className="input-column-header-title">Changed text</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={() => onModifiedChange('')} title="Clear changed text" style={{ padding: '0.25rem 0.5rem' }}>
                  <RefreshCcw size={14} /> Clear
                </button>
                <label className="file-btn">
                  <FileUp size={14} /> Open file
                  <input type="file" hidden onChange={(e) => handleFileChange(e, 'right')} />
                </label>
              </div>
            </div>
            <textarea 
              className="input-textarea"
              placeholder="Paste changed text here"
              value={modifiedValue}
              spellCheck={false}
              onChange={(e) => onModifiedChange(e.target.value)}
              style={{ whiteSpace: options.disableWrap ? 'pre' : 'pre-wrap' }}
            />
          </div>
        </div>
        <div className="find-diff-bar">
          <button className="find-diff-btn" onClick={computeAndShowDiff}>
            FIND DIFFERENCE <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Render diff output
  return (
    <div className="editor-area fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {options.realTime && (
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <textarea 
               className="input-textarea"
               placeholder="Original text"
               value={originalValue}
               spellCheck={false}
               onChange={(e) => onOriginalChange(e.target.value)}
               style={{ height: '120px' }}
            />
            <textarea 
               className="input-textarea"
               placeholder="Changed text"
               value={modifiedValue}
               spellCheck={false}
               onChange={(e) => onModifiedChange(e.target.value)}
               style={{ height: '120px' }}
            />
          </div>
        </div>
      )}

      <div className="editor-toolbar">
        <div className="diff-title">Untitled diff</div>
        <div className="toolbar-actions">
          <button className="btn btn-ghost border" onClick={() => setShowDiff(false)}>
            <RefreshCcw size={14} /> Edit Input
          </button>
          <button className="btn btn-ghost border" onClick={handleExport}>
            <Download size={14} /> Export (HTML)
          </button>
          <button 
            className="btn btn-primary" 
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            onClick={handleSave}
          >
            <Save size={14} /> Save
          </button>
          <button className="btn btn-primary" style={{ background: '#3fb950' }} onClick={handleShare}>
            <Share size={14} /> Share
          </button>
        </div>
      </div>

      <div className="diff-panel">
        {options.layout === 'split' ? (() => {
          // Build synchronized rows for perfect vertical alignment
          const syncRows: { left: UnifiedLine | null, right: UnifiedLine | null }[] = [];
          if (diffResult) {
            let i = 0;
            while (i < diffResult.unified.length) {
              const line = diffResult.unified[i];
              if (line.type === 'unchanged') {
                if (!options.hideUnchanged) {
                  syncRows.push({ left: line, right: line });
                }
                i++;
              } else {
                const removedBlock: UnifiedLine[] = [];
                const addedBlock: UnifiedLine[] = [];
                while (i < diffResult.unified.length && diffResult.unified[i].type !== 'unchanged') {
                  if (diffResult.unified[i].type === 'removed') removedBlock.push(diffResult.unified[i]);
                  if (diffResult.unified[i].type === 'added') addedBlock.push(diffResult.unified[i]);
                  i++;
                }
                const maxLines = Math.max(removedBlock.length, addedBlock.length);
                for (let j = 0; j < maxLines; j++) {
                  syncRows.push({
                    left: j < removedBlock.length ? removedBlock[j] : null,
                    right: j < addedBlock.length ? addedBlock[j] : null,
                  });
                }
              }
            }
          }

          return (
            <div className="diff-columns-synced" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 10 }}>
                <div className="diff-column-header" style={{ flex: 1, borderRight: '2px solid var(--border)' }}>
                  <div className="diff-stat-badge removals">
                    <Minus size={14} /> <span className="count">{diffResult?.removals ?? 0} removals</span>
                  </div>
                  <div className="diff-line-info">{diffResult?.originalLineCount ?? 0} lines</div>
                </div>
                <div className="diff-column-header" style={{ flex: 1 }}>
                  <div className="diff-stat-badge additions">
                    <Plus size={14} /> <span className="count">{diffResult?.additions ?? 0} additions</span>
                  </div>
                  <div className="diff-line-info">{diffResult?.modifiedLineCount ?? 0} lines</div>
                </div>
              </div>

              <div className="diff-rows-container">
                {syncRows.map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', width: '100%' }}>
                    {/* Left Column */}
                    <div className={`diff-line ${row.left ? row.left.type : 'empty'}`} style={{ flex: 1, borderRight: '2px solid var(--border)', display: 'flex', minWidth: 0 }}>
                      <div className="diff-line-number" style={{ width: '48px' }}>{row.left?.originalLineNumber || ''}</div>
                      <div className="diff-line-prefix">{row.left ? (row.left.type === 'removed' ? '-' : ' ') : ''}</div>
                      <div className="diff-line-content" style={{ whiteSpace: options.disableWrap ? 'pre' : 'pre-wrap' }}>
                        {row.left ? renderLineContent(row.left.value, row.left.inlineChanges) : ''}
                      </div>
                    </div>
                    
                    {/* Right Column */}
                    <div className={`diff-line ${row.right ? row.right.type : 'empty'}`} style={{ flex: 1, display: 'flex', minWidth: 0 }}>
                      <div className="diff-line-number" style={{ width: '48px' }}>{row.right?.modifiedLineNumber || ''}</div>
                      <div className="diff-line-prefix">{row.right ? (row.right.type === 'added' ? '+' : ' ') : ''}</div>
                      <div className="diff-line-content" style={{ whiteSpace: options.disableWrap ? 'pre' : 'pre-wrap' }}>
                        {row.right ? renderLineContent(row.right.value, row.right.inlineChanges) : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })() : (
          <div className="unified-view">
             <div className="diff-columns" style={{ flexDirection: 'column' }}>
                <div className="diff-column-header" style={{ display: 'flex', gap: '2rem' }}>
                  <div className="diff-stat-badge removals">
                    <Minus size={14} /> <span className="count">{diffResult?.removals ?? 0} removals</span>
                  </div>
                  <div className="diff-stat-badge additions">
                    <Plus size={14} /> <span className="count">{diffResult?.additions ?? 0} additions</span>
                  </div>
                </div>
                <div className="diff-lines">
                  {diffResult?.unified.map((line, idx) => {
                    if (options.hideUnchanged && line.type === 'unchanged') return null;

                    const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
                    return (
                      <div key={"u-" + idx} className={"diff-line " + line.type}>
                         <div className="diff-line-number" style={{ width: '40px' }}>{line.originalLineNumber || ''}</div>
                         <div className="diff-line-number" style={{ width: '40px' }}>{line.modifiedLineNumber || ''}</div>
                         <div className="diff-line-prefix">{prefix}</div>
                         <div className="diff-line-content" style={{ whiteSpace: options.disableWrap ? 'pre' : 'pre-wrap' }}>{renderLineContent(line.value, line.inlineChanges)}</div>
                      </div>
                    );
                  })}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffEditor;
