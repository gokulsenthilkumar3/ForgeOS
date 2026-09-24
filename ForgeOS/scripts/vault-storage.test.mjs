import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openVault, persistVault } from '../apps/web/app/modules/[id]/vault-storage.ts';

function storage() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
}

test('vault ciphertext stays bound to the password and workspace used at unlock', async () => {
  const browserStorage = storage();
  browserStorage.setItem('forgeos-workspace-id', 'workspace-a');
  const vault = await openVault(browserStorage, 'correct master password');
  const entries = [{ name: 'Example', username: 'user', password: 'private secret' }];
  await persistVault(browserStorage, vault, entries);
  const ciphertext = browserStorage.getItem('forgeos-vault-v1:workspace-a');
  assert.ok(ciphertext);
  assert.ok(!ciphertext.includes('private secret'));
  assert.deepEqual((await openVault(browserStorage, 'correct master password')).entries, entries);
  await assert.rejects(openVault(browserStorage, 'wrong password'));

  browserStorage.setItem('forgeos-workspace-id', 'workspace-b');
  await assert.rejects(persistVault(browserStorage, vault, [...entries, { name: 'Second', username: '', password: 'another' }]));
  assert.equal(browserStorage.getItem('forgeos-vault-v1:workspace-a'), ciphertext);
  assert.equal(browserStorage.getItem('forgeos-vault-v1:workspace-b'), null);
});

test('locking invalidates a previously unlocked key before another save', async () => {
  const browserStorage = storage();
  const vault = await openVault(browserStorage, 'correct master password');
  vault.active = false;
  await assert.rejects(persistVault(browserStorage, vault, [{ name: 'Example', username: '', password: 'private secret' }]));
  assert.equal(browserStorage.getItem(vault.storageKey), null);
});
