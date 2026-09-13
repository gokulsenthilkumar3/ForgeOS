import { encrypt, decrypt, tryDecrypt } from '@dbpulse/shared';

describe('AES-256-GCM Crypto', () => {
  const SECRET = 'test-secret-key-at-least-32-chars!!';
  const PLAINTEXT = JSON.stringify({ username: 'admin', password: 'super-secret' });

  it('encrypts and decrypts correctly', () => {
    const cipher = encrypt(PLAINTEXT, SECRET);
    expect(decrypt(cipher, SECRET)).toBe(PLAINTEXT);
  });

  it('produces different ciphertext each call (random IV)', () => {
    const a = encrypt(PLAINTEXT, SECRET);
    const b = encrypt(PLAINTEXT, SECRET);
    expect(a).not.toBe(b);
  });

  it('throws on wrong secret (auth tag mismatch)', () => {
    const cipher = encrypt(PLAINTEXT, SECRET);
    expect(() => decrypt(cipher, 'wrong-secret')).toThrow();
  });

  it('throws on tampered ciphertext', () => {
    const cipher = Buffer.from(encrypt(PLAINTEXT, SECRET), 'base64');
    cipher[cipher.length - 1] ^= 0xff;  // flip last byte
    expect(() => decrypt(cipher.toString('base64'), SECRET)).toThrow();
  });

  it('tryDecrypt returns null on failure instead of throwing', () => {
    expect(tryDecrypt('not-valid-base64!!', SECRET)).toBeNull();
  });
});
