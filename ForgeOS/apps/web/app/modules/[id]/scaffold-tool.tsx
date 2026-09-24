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

  return <section className="tool-card">
    <h2>Generate a project</h2>
    <p>Choose a working starter, inspect every file, then download a ZIP. Generation stays in this browser.</p>
    <div className="tool-row"><label>Project name <input value={name} onChange={event => { setName(event.target.value); setMessage(''); }} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'project-name-error' : undefined} /></label><label>Starter <select value={template} onChange={event => { const next = event.target.value as Template; setTemplate(next); if (next === 'library') setDocker(false); setSelectedFile('package.json'); }}>
      {scaffoldTemplates.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
    </select></label></div>
    {nameError && <p id="project-name-error" role="alert" className="error">{nameError}</p>}
    <div className="tool-row"><label><input type="checkbox" checked={docker} disabled={template === 'library'} onChange={event => setDocker(event.target.checked)} /> Include Docker files</label><label><input type="checkbox" checked={ci} onChange={event => setCi(event.target.checked)} /> Include GitHub Actions build check</label></div>
    <h3>File preview · {paths.length} files</h3>
    {paths.length > 0 && <><label>File <select value={previewPath} onChange={event => setSelectedFile(event.target.value)}>{paths.map(path => <option key={path} value={path}>{path}</option>)}</select></label><pre aria-label="Generated file preview">{files[previewPath]}</pre></>}
    <button className="primary" disabled={Boolean(nameError) || !paths.length || busy} onClick={() => void downloadZip()}>{busy ? 'Building ZIP…' : 'Download project ZIP'}</button>
    {downloadError && <p role="alert" className="error">{downloadError}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
