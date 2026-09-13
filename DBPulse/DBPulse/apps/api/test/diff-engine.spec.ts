import { computeDiff, formatDiff } from '@dbpulse/diff-engine';

describe('computeDiff', () => {
  it('detects changed columns on UPDATE', () => {
    const before = { id: 1, name: 'Alice', email: 'alice@a.com' };
    const after  = { id: 1, name: 'Alice', email: 'alice@b.com' };
    const result = computeDiff(before, after);
    expect(result.hasChanges).toBe(true);
    expect(result.changedColumns).toEqual(['email']);
    expect(result.diffs[0]).toMatchObject({
      column: 'email',
      before: 'alice@a.com',
      after: 'alice@b.com',
    });
  });

  it('returns no changes when rows are identical', () => {
    const row = { id: 1, active: true };
    expect(computeDiff(row, row).hasChanges).toBe(false);
  });

  it('handles INSERT (null before)', () => {
    const result = computeDiff(null, { id: 1, name: 'Bob' });
    expect(result.changedColumns).toContain('id');
    expect(result.changedColumns).toContain('name');
  });

  it('handles DELETE (null after)', () => {
    const result = computeDiff({ id: 2, name: 'Carol' }, null);
    expect(result.hasChanges).toBe(true);
    expect(result.diffs.every((d) => d.after === null)).toBe(true);
  });

  it('deep-compares JSON objects by serialization', () => {
    const before = { meta: { role: 'admin' } };
    const after  = { meta: { role: 'user' } };
    expect(computeDiff(before as any, after as any).hasChanges).toBe(true);
  });

  it('formatDiff returns readable string', () => {
    const result = computeDiff({ x: 1 }, { x: 2 });
    expect(formatDiff(result)).toContain('x:');
    expect(formatDiff(result)).toContain('→');
  });

  it('formatDiff returns no-change message for identical rows', () => {
    expect(formatDiff(computeDiff({ a: 1 }, { a: 1 }))).toBe('No changes detected.');
  });
});
