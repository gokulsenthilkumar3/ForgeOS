/**
 * PrivateComparer — Pure client-side diff engine.
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNumber: number;
  inlineChanges?: InlineChange[];
}

export interface UnifiedLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
  inlineChanges?: InlineChange[];
}

export interface DiffResult {
  original: DiffLine[];
  modified: DiffLine[];
  unified: UnifiedLine[];
  additions: number;
  removals: number;
  unchanged: number;
  originalLineCount: number;
  modifiedLineCount: number;
}

export interface InlineChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export type DiffPrecision = 'line' | 'word' | 'character';

export interface DiffCompareOptions {
  ignoreCase?: boolean;
  ignoreWhitespace?: boolean;
  trimWhitespace?: boolean;
}

function normalize(s: string, options?: DiffCompareOptions): string {
  let res = s;
  if (!options) return res;
  if (options.ignoreCase) res = res.toLowerCase();
  if (options.ignoreWhitespace) res = res.replace(/\s+/g, '');
  if (options.trimWhitespace && !options.ignoreWhitespace) res = res.replace(/^\s+|\s+$/g, '');
  return res;
}

export function computeDiff(
  originalText: string,
  modifiedText: string,
  precision: DiffPrecision = 'line',
  options?: DiffCompareOptions
): DiffResult {
  const aLines = originalText === '' ? [] : originalText.split('\n');
  const bLines = modifiedText === '' ? [] : modifiedText.split('\n');

  const lineChanges = myers(aLines, bLines, options);

  const original: DiffLine[] = [];
  const modified: DiffLine[] = [];
  const unified: UnifiedLine[] = [];
  let additions = 0;
  let removals = 0;
  let unchanged = 0;
  let aIdx = 0;
  let bIdx = 0;

  for (const change of lineChanges) {
    if (change.type === 'unchanged') {
      aIdx++; bIdx++;
      const line: DiffLine = { type: 'unchanged', value: change.value, lineNumber: aIdx };
      original.push(line);
      modified.push({ ...line, lineNumber: bIdx });
      unified.push({ type: 'unchanged', value: change.value, originalLineNumber: aIdx, modifiedLineNumber: bIdx });
      unchanged++;
    } else if (change.type === 'removed') {
      aIdx++;
      original.push({ type: 'removed', value: change.value, lineNumber: aIdx });
      unified.push({ type: 'removed', value: change.value, originalLineNumber: aIdx });
      removals++;
    } else {
      bIdx++;
      modified.push({ type: 'added', value: change.value, lineNumber: bIdx });
      unified.push({ type: 'added', value: change.value, modifiedLineNumber: bIdx });
      additions++;
    }
  }

  if (precision !== 'line') {
    refine(unified, original, modified, precision, options);
  }

  return {
    original,
    modified,
    unified,
    additions,
    removals,
    unchanged,
    originalLineCount: aLines.length,
    modifiedLineCount: bLines.length
  };
}

function myers(a: string[], b: string[], options?: DiffCompareOptions): {type: string, value: string}[] {
  const n = a.length, m = b.length;
  const max = n + m;
  const v: Record<number, number> = { 1: 0 };
  const trace: Record<number, number>[] = [];

  for (let d = 0; d <= max; d++) {
    trace.push({ ...v });
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) ? (v[k + 1] ?? 0) : (v[k - 1] ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m && normalize(a[x], options) === normalize(b[y], options)) {
        x++; y++;
      }
      v[k] = x;
      if (x >= n && y >= m) return back(trace, a, b, d);
    }
  }
  return [];
}

function back(trace: Record<number, number>[], a: string[], b: string[], d: number): {type: string, value: string}[] {
  const res: {type: string, value: string}[] = [];
  let x = a.length, y = b.length;
  for (let d_cur = d; d_cur > 0; d_cur--) {
    const v = trace[d_cur];
    const k = x - y;
    const prev_k = (k === -d_cur || (k !== d_cur && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) ? k + 1 : k - 1;
    const prev_x = v[prev_k] ?? 0;
    const prev_y = prev_x - prev_k;
    while (x > prev_x && y > prev_y) {
      x--; y--;
      res.unshift({ type: 'unchanged', value: a[x] });
    }
    if (x > prev_x) { x--; res.unshift({ type: 'removed', value: a[x] }); }
    else if (y > prev_y) { y--; res.unshift({ type: 'added', value: b[y] }); }
  }
  while (x > 0 && y > 0) {
    x--; y--;
    res.unshift({ type: 'unchanged', value: a[x] });
  }
  return res;
}

function refine(unified: UnifiedLine[], original: DiffLine[], modified: DiffLine[], precision: DiffPrecision, options?: DiffCompareOptions) {
  let i = 0;
  while (i < unified.length) {
    if (unified[i].type === 'removed') {
      let j = i;
      while (j < unified.length && unified[j].type === 'removed') j++;
      let k = j;
      while (k < unified.length && unified[k].type === 'added') k++;
      
      const rems = unified.slice(i, j);
      const adds = unified.slice(j, k);
      
      if (adds.length > 0) {
        const count = Math.min(rems.length, adds.length);
        for (let m = 0; m < count; m++) {
          const s1 = rems[m].value, s2 = adds[m].value;
          const diff = precision === 'word' ? wordDiff(s1, s2, options) : charDiff(s1, s2, options);
          rems[m].inlineChanges = diff.filter(c => c.type !== 'added');
          adds[m].inlineChanges = diff.filter(c => c.type !== 'removed');
          
          if (rems[m].originalLineNumber) original[rems[m].originalLineNumber! - 1].inlineChanges = rems[m].inlineChanges;
          if (adds[m].modifiedLineNumber) modified[adds[m].modifiedLineNumber! - 1].inlineChanges = adds[m].inlineChanges;
        }
      }
      i = k;
    } else i++;
  }
}

function wordDiff(a: string, b: string, options?: DiffCompareOptions): InlineChange[] {
  return myers(a.split(/\b/), b.split(/\b/), options) as InlineChange[];
}

function charDiff(a: string, b: string, options?: DiffCompareOptions): InlineChange[] {
  return myers(a.split(''), b.split(''), options) as InlineChange[];
}

export function exportDiffAsHTML(result: DiffResult, title: string = 'Untitled diff'): string {
  return `<html><body><h1>${title}</h1><pre>${JSON.stringify(result, null, 2)}</pre></body></html>`;
}
