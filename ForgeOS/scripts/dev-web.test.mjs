import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { ensureDevCredentials, parseEnv, validCredential } from './dev-web.mjs';

test('example credentials are rejected', () => {
  assert.equal(validCredential('replace-with-at-least-32-random-characters', 32), false);
  assert.equal(validCredential('a'.repeat(32), 32), true);
});

test('local dev generates and reuses safe credentials when root file has examples', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'forgeos-dev-web-'));
  const web = resolve(root, 'apps/web');
  mkdirSync(web, { recursive: true });
  try {
    writeFileSync(resolve(root, '.env'), 'FORGEOS_ADMIN_PASSWORD=replace-with-a-strong-password\nFORGEOS_SESSION_SECRET=replace-with-at-least-32-random-characters\n');
    const first = ensureDevCredentials(root, web, {});
    assert.equal(first.generated, true);
    assert.equal(validCredential(first.password, 8), true);
    assert.equal(validCredential(first.secret, 32), true);
    assert.deepEqual(parseEnv(readFileSync(first.localFile, 'utf8')), { FORGEOS_ADMIN_PASSWORD: first.password, FORGEOS_SESSION_SECRET: first.secret });
    const second = ensureDevCredentials(root, web, {});
    assert.equal(second.generated, false);
    assert.equal(second.password, first.password);
    assert.equal(second.secret, first.secret);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
