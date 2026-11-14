'use client';
import { useState } from 'react';
import { generateScaffold, scaffoldTemplates, validateProjectName } from './scaffold-engine.mjs';

type Template = 'next' | 'api' | 'library';

export function ScaffoldTool() {
  const [name, setName] = useState('my-app');
  const [template, setTemplate] = useState<Template>('next');
  const [docker, setDocker] = useState(false);
  const [ci, setCi] = useState(true);
  const [selectedFile, setSelectedFile] = useState('package.json');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const nameError = validateProjectName(name);
  let files: Record<string, string> = {};
  if (!nameError) {
    try { files = generateScaffold({ name, template, docker, ci }); }
    catch { /* Name validation and template options below explain the error. */ }
  }
  const paths = Object.keys(files);
  const previewPath = paths.includes(selectedFile) ? selectedFile : paths[0];

  async function downloadZip() {
    if (nameError || !paths.length || busy) return;
    setBusy(true); setMessage(''); setDownloadError('');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const [path, content] of Object.entries(files)) zip.file(path, content);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${name}.zip`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Downloaded ${name}.zip with ${paths.length} files.`);
    } catch (cause) { setDownloadError(cause instanceof Error ? cause.message : 'Could not create the ZIP archive.'); }
    finally { setBusy(false); }
  }

  const bytes = Object.values(files).reduce((sum, content) => sum + new TextEncoder().encode(content).byteLength, 0);
  return <section className="tool-card forge-workbench">
    <header className="forge-header"><div><span className="workbench-mode">LOCAL / DETERMINISTIC</span><h2>Build from a reviewed recipe</h2><p>Configure a starter. Inspect the source. Download the exact files you reviewed.</p></div><div className="workbench-metric"><strong>{paths.length}</strong><span>generated files</span></div></header>
    <div className="forge-config"><label>Project name<input value={name} onChange={event => { setName(event.target.value); setMessage(''); }} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'project-name-error' : undefined} /></label><label>Starter<select value={template} onChange={event => { const next = event.target.value as Template; setTemplate(next); if (next === 'library') setDocker(false); setSelectedFile('package.json'); }}>
      {scaffoldTemplates.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
    </select></label><label className="check-option"><input type="checkbox" checked={docker} disabled={template === 'library'} onChange={event => setDocker(event.target.checked)} /> Docker files</label><label className="check-option"><input type="checkbox" checked={ci} onChange={event => setCi(event.target.checked)} /> CI build workflow</label></div>
    {nameError && <p id="project-name-error" role="alert" className="error">{nameError}</p>}
    <div className="source-workbench"><nav className="source-explorer" aria-label="Generated files"><div className="source-pane-label">EXPLORER / {name || 'PROJECT'}</div>{paths.map(path => <button key={path} type="button" className={path === previewPath ? 'selected-file' : ''} aria-pressed={path === previewPath} onClick={() => setSelectedFile(path)}><span aria-hidden="true">{path.includes('.') ? '{}' : '/'}</span>{path}</button>)}{!paths.length && <p>Enter a valid project name to preview files.</p>}</nav>
      <section className="source-editor" aria-label="Generated source preview"><div className="source-tab">{previewPath || 'No file selected'}<span>READ ONLY</span></div><pre tabIndex={0} aria-label="Generated file preview">{previewPath ? files[previewPath] : 'Source preview appears after valid configuration.'}</pre></section>
    </div>
    <div className="forge-evidence"><div><span>Output</span><strong>{(bytes / 1024).toFixed(1)} KiB source</strong></div><div><span>Recipe validation</span><strong>{nameError ? 'Needs correction' : 'Passed'}</strong></div><div><span>Build / tests</span><strong>Not executed</strong></div><p>This generator has no application-building agent or validation worker. A generated ZIP has not been installed, built or deployed by ForgeOS.</p></div>
    <footer className="forge-actions"><button className="button-primary" disabled={Boolean(nameError) || !paths.length || busy} onClick={() => void downloadZip()}>{busy ? 'Building ZIP...' : 'Download project ZIP'}</button><a className="quiet-link" href="/help#guide-stackforge">How generation works</a></footer>
    {downloadError && <p role="alert" className="error">{downloadError}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
