// The comparison engine runs entirely in the browser. Bound the quadratic LCS
// matrix so an accidentally large paste cannot freeze the workbench.
export const MAX_INPUT_CHARACTERS = 1_000_000;
export const MAX_LINE_CELLS = 1_500_000;

export function compareLines(original, updated, options = {}) {
  if (original.length > MAX_INPUT_CHARACTERS || updated.length > MAX_INPUT_CHARACTERS) {
    throw new Error('Each input must be under 1 MB. Choose smaller files or sections.');
  }
  const before = original === '' ? [] : original.replace(/\r\n/g, '\n').split('\n');
  const after = updated === '' ? [] : updated.replace(/\r\n/g, '\n').split('\n');
  const n = before.length;
  const m = after.length;
  if ((n + 1) * (m + 1) > MAX_LINE_CELLS) {
    throw new Error('Too many lines to compare safely in this browser. Choose smaller sections.');
  }
  const normalize = value => {
    let result = options.ignoreWhitespace ? value.replace(/\s+/g, '') : options.trimWhitespace ? value.trim() : value;
    if (options.ignoreCase) result = result.toLocaleLowerCase();
    return result;
  };
  const normalizedBefore = before.map(normalize);
  const normalizedAfter = after.map(normalize);
  const width = m + 1;
  const matrix = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const index = i * width + j;
      matrix[index] = normalizedBefore[i] === normalizedAfter[j]
        ? matrix[index + width + 1] + 1
        : Math.max(matrix[index + width], matrix[index + 1]);
    }
  }
  const rows = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && normalizedBefore[i] === normalizedAfter[j]) {
      rows.push({ type: 'unchanged', value: before[i], originalLine: ++i, updatedLine: ++j });
    } else if (i < n && (j === m || matrix[(i + 1) * width + j] >= matrix[i * width + j + 1])) {
      rows.push({ type: 'removed', value: before[i], originalLine: ++i });
    } else {
      rows.push({ type: 'added', value: after[j], updatedLine: ++j });
    }
  }
  return {
    rows,
    added: rows.filter(row => row.type === 'added').length,
    removed: rows.filter(row => row.type === 'removed').length,
    unchanged: rows.filter(row => row.type === 'unchanged').length,
  };
}

export function exportComparison(result) {
  return ['--- Original', '+++ Updated', ...result.rows.map(row =>
    `${row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}${row.value}`
  )].join('\n') + '\n';
}
