import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeCsvCell } from './csv-safety.mjs';

test('neutralizes spreadsheet formulas after leading whitespace', () => {
  for (const value of ['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1:A2)', ' \t=1+1']) {
    assert.equal(sanitizeCsvCell(value), `'${value}`);
  }
});

test('escapes CSV quotes without changing ordinary cell values', () => {
  assert.equal(sanitizeCsvCell('"quoted"'), '""quoted""');
  assert.equal(sanitizeCsvCell('ordinary value'), 'ordinary value');
  assert.equal(sanitizeCsvCell(null), '');
});
