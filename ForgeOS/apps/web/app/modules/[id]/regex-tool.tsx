'use client';
import { useEffect, useState } from 'react';

type RegexMatch = { value: string; index: number; groups: Record<string, string> | null };
type Result = { matches: RegexMatch[]; truncated: boolean };

export function RegexTool() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [sample, setSample] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPattern = params.get('pattern');
    const sharedFlags = params.get('flags');
    if (sharedPattern !== null) setPattern(sharedPattern);
    if (sharedFlags !== null) setFlags(sharedFlags);
  }, []);

  useEffect(() => {
    if (!pattern) { setResult(null); setError(''); setRunning(false); return; }
    setResult(null); setError(''); setRunning(true);
    let worker: Worker | null = null;
    let deadline: number | undefined;
    const debounce = window.setTimeout(() => {
      try {
        worker = new Worker('/regex-worker.mjs', { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ result?: Result; error?: string }>) => {
          if (deadline !== undefined) window.clearTimeout(deadline);
          setResult(event.data.result || null);
          setError(event.data.error || '');
          setRunning(false);
          worker?.terminate();
        };
        worker.onerror = () => {
          if (deadline !== undefined) window.clearTimeout(deadline);
          setError('The isolated regex tester could not start.'); setRunning(false); worker?.terminate();
        };
        deadline = window.setTimeout(() => {
          worker?.terminate(); setResult(null);
          setError('This pattern took too long to run and was stopped. Try a simpler expression.'); setRunning(false);
        }, 600);
        worker.postMessage({ pattern, flags, sample });
      } catch {
        setError('This browser cannot start the isolated regex tester.'); setRunning(false);
      }
    }, 180);
    return () => { window.clearTimeout(debounce); if (deadline !== undefined) window.clearTimeout(deadline); worker?.terminate(); };
  }, [pattern, flags, sample]);

  async function copyLink() {
    // Test text is deliberately excluded: URLs may be logged or shared.
    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set('pattern', pattern);
    url.searchParams.set('flags', flags);
    try { await navigator.clipboard.writeText(url.toString()); setMessage('Pattern-only link copied. Sample text was not included.'); }
    catch { setMessage('Clipboard unavailable. Copy the address from your browser instead.'); }
  }

  function highlightedSample() {
    if (!result?.matches.length) return sample;
    const pieces: React.ReactNode[] = [];
    let position = 0;
    for (const match of result.matches) {
      if (!match.value || match.index < position) continue;
      pieces.push(sample.slice(position, match.index));
      pieces.push(<mark key={`${match.index}-${pieces.length}`}>{match.value}</mark>);
      position = match.index + match.value.length;
    }
    pieces.push(sample.slice(position));
    return pieces;
  }

  return <section className="tool-card">
    <h2>Test a regular expression</h2>
    <p>JavaScript regex only. Test text stays in this browser. Long-running patterns are stopped automatically.</p>
    <div className="tool-row"><label>Pattern <input value={pattern} onChange={event => setPattern(event.target.value)} placeholder="e.g. (?&lt;year&gt;\\d{4})" aria-label="Pattern" /></label><label>Flags <input value={flags} onChange={event => setFlags(event.target.value)} placeholder="gim" aria-label="Flags" /></label></div>
    <label>Test text <textarea value={sample} onChange={event => setSample(event.target.value)} rows={10} placeholder="Text to test…" style={{ display: 'block', width: '100%' }} /></label>
    <button disabled={!pattern} onClick={() => void copyLink()}>Copy pattern-only link</button>
    {message && <p role="status">{message}</p>}
    {running ? <p role="status">Testing safely…</p> : error ? <p role="alert" className="error">{error}</p> : result ? <p role="status">{result.matches.length} match{result.matches.length === 1 ? '' : 'es'}{result.truncated ? ' (first 100 shown)' : ''}</p> : <p>Enter a pattern to see matches.</p>}
    {result && <><h3>Highlighted text</h3><pre aria-label="Highlighted matches">{highlightedSample()}</pre><h3>Matches</h3><div className="diff-lines" aria-label="Regex matches">{result.matches.map((match, index) => <div key={`${match.index}-${index}`}><span>{match.index}</span><code>{match.value || '(empty match)'}{match.groups && Object.keys(match.groups).length > 0 ? ` · groups: ${JSON.stringify(match.groups)}` : ''}</code></div>)}</div></>}
  </section>;
}
