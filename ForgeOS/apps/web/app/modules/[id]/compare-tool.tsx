'use client';
import { useRef, useState } from 'react';
import { compareLines, exportComparison } from './compare-engine.mjs';

type Comparison = ReturnType<typeof compareLines>;
type Mode = 'text' | 'json' | 'folders' | 'images';
type FolderDifference = { path: string; type: 'added' | 'removed' | 'modified' | 'unchanged' | 'not compared'; original?: File; updated?: File };
const MAX_FILE_BYTES = 1_000_000;
const MAX_FOLDER_FILES = 300;

function saveText(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveImage(canvas: HTMLCanvasElement) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'forgeos-image-diff.png'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

function subpath(file: File) {
  const path = file.webkitRelativePath || file.name;
  const slash = path.indexOf('/');
  return slash < 0 ? path : path.slice(slash + 1);
}

async function sameBytes(first: File, second: File) {
  if (first.size !== second.size) return false;
  const [a, b] = await Promise.all([first.arrayBuffer(), second.arrayBuffer()]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return false;
  return true;
}

export function CompareTool() {
  const [mode, setMode] = useState<Mode>('text');
  const [original, setOriginal] = useState('');
  const [updated, setUpdated] = useState('');
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState('');
  const [originalFolder, setOriginalFolder] = useState<File[]>([]);
  const [updatedFolder, setUpdatedFolder] = useState<File[]>([]);
  const [folderDifferences, setFolderDifferences] = useState<FolderDifference[] | null>(null);
  const [folderBusy, setFolderBusy] = useState(false);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [updatedImage, setUpdatedImage] = useState<File | null>(null);
  const [changedPixels, setChangedPixels] = useState<number | null>(null);
  const imageCanvases = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)];

  function updateText(side: 'original' | 'updated', value: string) {
    if (side === 'original') setOriginal(value); else setUpdated(value);
    setComparison(null); setError('');
  }

  async function loadTextFile(side: 'original' | 'updated', file?: File) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setError('Local text files must be under 1 MB.'); return; }
    try { updateText(side, await file.text()); }
    catch { setError(`Could not read ${file.name}.`); }
  }

  function runComparison() {
    try {
      const left = mode === 'json' ? JSON.stringify(JSON.parse(original), null, 2) : original;
      const right = mode === 'json' ? JSON.stringify(JSON.parse(updated), null, 2) : updated;
      setComparison(compareLines(left, right, { ignoreCase, ignoreWhitespace }));
      setError('');
    } catch (cause) {
      setComparison(null);
      setError(mode === 'json' && cause instanceof SyntaxError ? 'Both sides must contain valid JSON.' : cause instanceof Error ? cause.message : 'Could not compare the inputs.');
    }
  }

  async function compareFolders() {
    if (!originalFolder.length || !updatedFolder.length) { setError('Choose both folders first.'); return; }
    if (originalFolder.length > MAX_FOLDER_FILES || updatedFolder.length > MAX_FOLDER_FILES) { setError(`Choose folders with no more than ${MAX_FOLDER_FILES} files each.`); return; }
    const totalBytes = [...originalFolder, ...updatedFolder].reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > 200_000_000) { setError('The selected folders exceed the 200 MB local comparison limit.'); return; }
    setFolderBusy(true); setError(''); setFolderDifferences(null);
    try {
      const before = new Map(originalFolder.map(file => [subpath(file), file]));
      const after = new Map(updatedFolder.map(file => [subpath(file), file]));
      const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
      const rows: FolderDifference[] = [];
      for (const path of paths) {
        const first = before.get(path), second = after.get(path);
        if (!first) rows.push({ path, type: 'added', updated: second });
        else if (!second) rows.push({ path, type: 'removed', original: first });
        else if (first.size !== second.size) rows.push({ path, type: 'modified', original: first, updated: second });
        else if (first.size > 20_000_000) rows.push({ path, type: 'not compared', original: first, updated: second });
        else rows.push({ path, type: await sameBytes(first, second) ? 'unchanged' : 'modified', original: first, updated: second });
      }
      setFolderDifferences(rows);
    } catch { setError('Could not read one of the selected files. Nothing was uploaded.'); }
    finally { setFolderBusy(false); }
  }

  async function inspectFolderFile(item: FolderDifference) {
    if (Math.max(item.original?.size || 0, item.updated?.size || 0) > MAX_FILE_BYTES) { setError('This file is too large for the text viewer.'); return; }
    if (!/\.(txt|md|sql|json|csv|tsv|xml|html|css|js|jsx|ts|tsx|py|yml|yaml|log)$/i.test(item.path)) { setError('Only text files can be opened in the line viewer.'); return; }
    try {
      const [left, right] = await Promise.all([item.original?.text() || '', item.updated?.text() || '']);
      setOriginal(left); setUpdated(right); setMode('text'); setError('');
      setComparison(compareLines(left, right, { ignoreCase, ignoreWhitespace }));
    } catch { setError(`Could not open ${item.path}.`); }
  }

  async function compareImages() {
    if (!originalImage || !updatedImage) { setError('Choose both images first.'); return; }
    let left: ImageBitmap | undefined, right: ImageBitmap | undefined;
    try {
      [left, right] = await Promise.all([createImageBitmap(originalImage), createImageBitmap(updatedImage)]);
      if (left.width !== right.width || left.height !== right.height) throw new Error('Images must have the same dimensions.');
      if (left.width * left.height > 4_000_000) throw new Error('Images must be 4 megapixels or smaller.');
      const [a, b, out] = imageCanvases.map(ref => ref.current);
      if (!a || !b || !out) return;
      for (const canvas of [a, b, out]) { canvas.width = left.width; canvas.height = left.height; }
      const aContext = a.getContext('2d'), bContext = b.getContext('2d'), outContext = out.getContext('2d');
      if (!aContext || !bContext || !outContext) throw new Error('Canvas is unavailable in this browser.');
      aContext.drawImage(left, 0, 0); bContext.drawImage(right, 0, 0);
      const originalPixels = aContext.getImageData(0, 0, a.width, a.height).data;
      const updatedPixels = bContext.getImageData(0, 0, b.width, b.height).data;
      const output = outContext.createImageData(a.width, a.height);
      let count = 0;
      for (let index = 0; index < originalPixels.length; index += 4) {
        const different = Math.max(...[0, 1, 2, 3].map(channel => Math.abs(originalPixels[index + channel] - updatedPixels[index + channel]))) > 20;
        if (different) count++;
        output.data.set(different ? [255, 49, 108, 255] : [originalPixels[index], originalPixels[index + 1], originalPixels[index + 2], 65], index);
      }
      outContext.putImageData(output, 0, 0); setChangedPixels(count); setError('');
    } catch (cause) { setChangedPixels(null); setError(cause instanceof Error ? cause.message : 'Could not compare images.'); }
    finally { left?.close(); right?.close(); }
  }

  return <section className="tool-card">
    <h2>Compare locally</h2>
    <p>Contents stay in this browser. Comparisons are not uploaded or saved to ForgeOS.</p>
    <label>Comparison type <select value={mode} onChange={event => { setMode(event.target.value as Mode); setError(''); setComparison(null); }}>
      <option value="text">Text / SQL / CSV</option><option value="json">JSON</option><option value="folders">Folders</option><option value="images">Images</option>
    </select></label>
    {(mode === 'text' || mode === 'json') && <>
      <div className="tool-row"><label>Original <input type="file" accept=".txt,.md,.sql,.json,.csv,.tsv,.xml,.html,.css,.js,.ts,.py,.yml,.yaml,.log,text/*" onChange={event => void loadTextFile('original', event.target.files?.[0])} /></label><label>Updated <input type="file" accept=".txt,.md,.sql,.json,.csv,.tsv,.xml,.html,.css,.js,.ts,.py,.yml,.yaml,.log,text/*" onChange={event => void loadTextFile('updated', event.target.files?.[0])} /></label></div>
      <div className="tool-row"><textarea aria-label="Original content" value={original} onChange={event => updateText('original', event.target.value)} rows={12} placeholder="Original content" /><textarea aria-label="Updated content" value={updated} onChange={event => updateText('updated', event.target.value)} rows={12} placeholder="Updated content" /></div>
      <div className="tool-row"><label><input type="checkbox" checked={ignoreCase} onChange={event => { setIgnoreCase(event.target.checked); setComparison(null); }} /> Ignore case</label><label><input type="checkbox" checked={ignoreWhitespace} onChange={event => { setIgnoreWhitespace(event.target.checked); setComparison(null); }} /> Ignore whitespace</label></div>
      <button className="primary" onClick={runComparison}>Compare</button><button disabled={!comparison} onClick={() => comparison && saveText('forgeos-comparison.txt', exportComparison(comparison))}>Download comparison</button>
      {comparison && <><p role="status">{comparison.added} added · {comparison.removed} removed · {comparison.unchanged} unchanged</p><div className="diff-lines" aria-label="Comparison results">{comparison.rows.slice(0, 3000).map((row, index) => <div key={index} style={{ background: row.type === 'added' ? '#ecfdf3' : row.type === 'removed' ? '#fff0ee' : undefined }}><span>{row.originalLine ?? '–'} / {row.updatedLine ?? '–'}</span><code>{row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '}{row.value || ' '}</code></div>)}</div></>}
    </>}
    {mode === 'folders' && <><p>Select two local folders. Files over 20 MB with identical sizes are marked “not compared,” not identical.</p><div className="tool-row"><label>Original folder <input type="file" multiple {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={event => { setOriginalFolder(Array.from(event.target.files || [])); setFolderDifferences(null); }} />{originalFolder.length} files selected</label><label>Updated folder <input type="file" multiple {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={event => { setUpdatedFolder(Array.from(event.target.files || [])); setFolderDifferences(null); }} />{updatedFolder.length} files selected</label></div><button disabled={folderBusy || !originalFolder.length || !updatedFolder.length} onClick={() => void compareFolders()}>{folderBusy ? 'Comparing…' : 'Compare folders'}</button>{folderDifferences && <><p role="status">{folderDifferences.filter(item => item.type !== 'unchanged').length} differences across {folderDifferences.length} paths</p><div className="diff-lines">{folderDifferences.map(item => <div key={item.path}><span>{item.type}</span><code>{item.path}</code><button disabled={item.type === 'unchanged'} onClick={() => void inspectFolderFile(item)}>Inspect text</button></div>)}</div></>}</>}
    {mode === 'images' && <><div className="tool-row"><label>Original image <input type="file" accept="image/*" onChange={event => { setOriginalImage(event.target.files?.[0] || null); setChangedPixels(null); }} /></label><label>Updated image <input type="file" accept="image/*" onChange={event => { setUpdatedImage(event.target.files?.[0] || null); setChangedPixels(null); }} /></label></div><button disabled={!originalImage || !updatedImage} onClick={() => void compareImages()}>Compare images</button>{changedPixels !== null && <p role="status">{changedPixels.toLocaleString()} changed pixels <button onClick={() => { const canvas = imageCanvases[2].current; if (canvas) saveImage(canvas); }}>Download diff PNG</button></p>}<div className="canvas-grid"><canvas ref={imageCanvases[0]} aria-label="Original image" /><canvas ref={imageCanvases[1]} aria-label="Updated image" /><canvas ref={imageCanvases[2]} aria-label="Difference image" /></div></>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
