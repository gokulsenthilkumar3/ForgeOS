import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePromptImport } from '../apps/web/app/modules/[id]/prompt-import.mjs';

test('imports standalone Zustand prompts, versions and collections', () => {
  const result = parsePromptImport({ state: { prompts: [{
    title: 'Useful', content: 'Current {{topic}}', updatedAt: '2026-01-02',
    versions: [{ content: 'Previous', savedAt: '2026-01-01' }],
    tags: ['engineering'], collectionId: 'c1', isFavorite: true,
  }] } }, { state: { collections: [{ id: 'c1', name: 'Team' }] } });
  assert.equal(result.prompts[0].versions.length, 2);
  assert.equal(result.prompts[0].metadata.collection, 'Team');
  assert.equal(result.prompts[0].metadata.favorite, true);
});

test('imports old ForgeOS records and flags likely demo prompts', () => {
  const result = parsePromptImport([{ name: 'Code Review Expert', versions: [{ text: 'Review', createdAt: '2026-01-01' }] }]);
  assert.equal(result.prompts[0].possibleDemo, true);
});

test('rejects oversized import sets without changing input', () => {
  assert.throws(() => parsePromptImport(Array.from({ length: 1001 }, () => ({ name: 'a' }))), /safety limit/);
});
