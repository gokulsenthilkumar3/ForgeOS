export type DbColumn = { name: string; type: string; nullable: boolean; primary: boolean };
export type DbMapping = { left: string; right: string; mode: 'strict' | 'text' | 'numeric' | 'boolean'; key: boolean };
export type DbSnapshot = { columns: DbColumn[]; rows: (string | null)[][]; truncated: boolean; capturedAt: string };
export function typeFamily(type: string): string {
  if (/^(smallint|integer|bigint|int|int2|int4|int8|tinyint|mediumint|decimal|numeric|real|double precision|float|double|money)/i.test(type)) return 'numeric';
  if (/^(character|varchar|char|text|tinytext|mediumtext|longtext|uuid|citext)/i.test(type)) return 'text';
  if (/^(boolean|bool)$/i.test(type)) return 'boolean';
  if (/^(timestamp|datetime|date|time)/i.test(type)) return 'temporal';
  if (/^json/i.test(type)) return 'json';
  return 'unsupported';
}
export function decimalKey(value: string): string {
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value.trim());
  if (!match || Math.abs(Number(match[4] || 0)) > 10000) throw new Error('Numeric normalization requires finite decimal values.');
  let digits = (match[2] + (match[3] || '')).replace(/^0+/, '');
  if (!digits) return '0';
  let exponent = Number(match[4] || 0) - (match[3]?.length || 0);
  while (digits.endsWith('0')) { digits = digits.slice(0, -1); exponent++; }
  return (match[1] === '-' ? '-' : '') + digits + 'e' + exponent;
}
function canonical(value: string | null, column: DbColumn, mode: DbMapping['mode']): string {
  if (value === null) return 'null';
  if (mode === 'numeric') return 'n:' + decimalKey(value);
  if (mode === 'boolean') {
    if (['1', 'true', 't'].includes(value.toLowerCase())) return 'b:true';
    if (['0', 'false', 'f'].includes(value.toLowerCase())) return 'b:false';
    throw new Error('Boolean normalization accepts only true/false, t/f or 1/0.');
  }
  return (mode === 'strict' ? typeFamily(column.type) + ':' : 'text:') + value;
}
export function compareDbSnapshots(left: DbSnapshot, right: DbSnapshot, mappings: DbMapping[]) {
  if (!mappings.length || mappings.length > 12 || !mappings.some(m => m.key)) throw new Error('Select 1–12 column mappings and at least one unique row key.');
  if (new Set(mappings.map(m => m.left)).size !== mappings.length || new Set(mappings.map(m => m.right)).size !== mappings.length) throw new Error('Map each source and target column only once.');
  const indices = mappings.map(m => {
    const a = left.columns.findIndex(c => c.name === m.left), b = right.columns.findIndex(c => c.name === m.right);
    if (a < 0 || b < 0) throw new Error('A mapped column is missing from the selected table.');
    if (typeFamily(left.columns[a].type) === 'unsupported' || typeFamily(right.columns[b].type) === 'unsupported') throw new Error('Binary, spatial and user-defined columns are not supported. Select supported scalar columns.');
    return [a, b];
  });
  const index = (snapshot: DbSnapshot, side: number) => {
    const out = new Map<string, { row: (string | null)[]; key: (string | null)[] }>();
    for (const row of snapshot.rows) {
      const key = mappings.flatMap((m, i) => m.key ? [row[indices[i][side]]] : []);
      if (key.some(v => v === null || v === undefined)) throw new Error('A selected row key contains NULL. Choose a non-null unique key.');
      const signature = JSON.stringify(mappings.flatMap((m, i) => m.key ? [canonical(row[indices[i][side]], snapshot.columns[indices[i][side]], m.mode)] : []));
      if (out.has(signature)) throw new Error('Duplicate row keys in the read window. Choose a unique key or composite key.');
      out.set(signature, { row, key });
    }
    return out;
  };
  const a = index(left, 0), b = index(right, 1);
  let matched = 0, changed = 0, leftOnly = 0, rightOnly = 0, differingCells = 0;
  const rows = [...new Set([...a.keys(), ...b.keys()])].map(signature => {
    const source = a.get(signature), target = b.get(signature);
    const cells = mappings.map((mapping, i) => {
      const l = source ? source.row[indices[i][0]] : null, r = target ? target.row[indices[i][1]] : null;
      const equal = !!source && !!target && canonical(l, left.columns[indices[i][0]], mapping.mode) === canonical(r, right.columns[indices[i][1]], mapping.mode);
      if (source && target && !equal) differingCells++;
      return { leftColumn: mapping.left, rightColumn: mapping.right, left: l, right: r, equal };
    });
    let status: 'matched' | 'changed' | 'left-only' | 'right-only';
    if (!source) { status = 'right-only'; rightOnly++; }
    else if (!target) { status = 'left-only'; leftOnly++; }
    else if (cells.every(c => c.equal)) { status = 'matched'; matched++; }
    else { status = 'changed'; changed++; }
    return { key: (source || target)!.key, status, cells };
  });
  const partial = left.truncated || right.truncated;
  return {
    verdict: partial ? 'inconclusive' : changed + leftOnly + rightOnly ? 'different' : 'equal',
    scope: partial ? 'bounded-read-window' : 'selected-tables-and-columns',
    summary: { leftRows: left.rows.length, rightRows: right.rows.length, matched, changed, leftOnly, rightOnly, differingCells },
    schema: mappings.map((m, i) => ({ ...m, leftType: left.columns[indices[i][0]].type, rightType: right.columns[indices[i][1]].type, sameTypeLabel: left.columns[indices[i][0]].type === right.columns[indices[i][1]].type })),
    snapshots: { left: left.capturedAt, right: right.capturedAt, leftTruncated: left.truncated, rightTruncated: right.truncated },
    rows,
    notes: ['Each database is read in its own read-only transaction; the two snapshots are not atomic across servers.', 'Only the selected tables and mapped columns were compared.', ...(partial ? ['Row limit reached. Presence and differences refer only to fetched windows; no whole-table equality conclusion is made.'] : [])],
  };
}
