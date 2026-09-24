import { hashPassword, verifyPassword } from './password';

describe('password storage', () => {
  it('uses unique salted hashes and verifies without exposing the password', async () => {
    const first = await hashPassword('a-long-unique-passphrase');
    const second = await hashPassword('a-long-unique-passphrase');
    expect(first).not.toBe(second);
    expect(first).not.toContain('a-long-unique-passphrase');
    expect(await verifyPassword('a-long-unique-passphrase', first)).toBe(true);
    expect(await verifyPassword('wrong-passphrase', first)).toBe(false);
    expect(await verifyPassword('a-long-unique-passphrase', 'invalid')).toBe(false);
  });
});
