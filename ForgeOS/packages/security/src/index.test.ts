import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { can, decryptSecret, encryptSecret } from './index';
const key = randomBytes(32); const encrypted = encryptSecret('private-token', key);
assert.equal(decryptSecret(encrypted, key), 'private-token');
assert.equal(can('auditor', 'secret:manage'), false);
assert.equal(can('owner', 'secret:manage'), true);
