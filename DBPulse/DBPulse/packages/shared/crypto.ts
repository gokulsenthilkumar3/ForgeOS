import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;  // 256-bit
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

/**
 * Derive a 256-bit key from an arbitrary-length secret using SHA-256.
 * In production, prefer a proper KDF (PBKDF2 / Argon2) or Supabase Vault.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format (base64-encoded): iv(12) + tag(16) + ciphertext
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: iv || tag || ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt an AES-256-GCM ciphertext produced by `encrypt()`.
 * Throws if the auth tag is invalid (tampering detected).
 */
export function decrypt(ciphertext: string, secret: string): string {
  const key = deriveKey(secret);
  const packed = Buffer.from(ciphertext, 'base64');

  const iv  = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const enc = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(enc),
    decipher.final(),
  ]).toString('utf8');
}

/** Safe wrapper — returns null instead of throwing on bad ciphertext */
export function tryDecrypt(ciphertext: string, secret: string): string | null {
  try { return decrypt(ciphertext, secret); }
  catch { return null; }
}
