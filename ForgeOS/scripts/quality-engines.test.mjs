import test from 'node:test';
import assert from 'node:assert/strict';
import { compareLines, exportComparison, MAX_LINE_CELLS } from '../apps/web/app/modules/[id]/compare-engine.mjs';
import { evaluateRegex, MAX_MATCHES } from '../apps/web/public/regex-engine.mjs';

test('Comparer aligns inserted and removed lines without false positional changes', () => {
  const result = compareLines('alpha\nbeta\ngamma', 'alpha\ninserted\nbeta');
  assert.deepEqual(result.rows.map(row => [row.type, row.value]), [
    ['unchanged', 'alpha'], ['added', 'inserted'], ['unchanged', 'beta'], ['removed', 'gamma'],
  ]);
  assert.deepEqual([result.added, result.removed, result.unchanged], [1, 1, 2]);
  assert.match(exportComparison(result), /^--- Original\n\+\+\+ Updated\n/m);
});

test('Comparer treats empty input and comparison options correctly', () => {
  assert.equal(compareLines('', '').rows.length, 0);
  assert.equal(compareLines(' A  ', 'a', { ignoreWhitespace: true, ignoreCase: true }).unchanged, 1);
  assert.equal(compareLines('A', 'a').unchanged, 0);
});

test('Comparer refuses an oversized quadratic workload', () => {
  const manyLines = Array.from({ length: Math.ceil(Math.sqrt(MAX_LINE_CELLS)) }, (_, index) => String(index)).join('\n');
  assert.throws(() => compareLines(manyLines, manyLines), /Too many lines/);
});

test('RegexForge returns named groups and handles zero-width matches', () => {
  const result = evaluateRegex('(?<year>\\d{4})', 'g', '2026 and 2027');
  assert.deepEqual(result.matches.map(match => match.groups?.year), ['2026', '2027']);
  assert.deepEqual(evaluateRegex('(?=a)', 'g', 'aa').matches.map(match => match.index), [0, 1]);
});

test('RegexForge bounds result count and rejects invalid input', () => {
  const result = evaluateRegex('a', 'g', 'a'.repeat(MAX_MATCHES + 1));
  assert.equal(result.matches.length, MAX_MATCHES);
  assert.equal(result.truncated, true);
  assert.throws(() => evaluateRegex('a', 'gg', 'a'));
  assert.throws(() => evaluateRegex('a'.repeat(1001), 'g', 'a'), /too long/);
  assert.throws(() => evaluateRegex('a', 'g', 'a'.repeat(100001)), /too long/);
});
