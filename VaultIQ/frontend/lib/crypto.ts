/**
 * VaultIQ Crypto Layer — Client-Side Encryption
 * Uses the Web Crypto API (AES-256-GCM) for zero-knowledge vault encryption.
 * The master password never leaves the browser; only ciphertext is sent to the server.
 */

/**
 * Derives a CryptoKey from the user's master password and their server-provided salt.
 * Uses PBKDF2 with SHA-256 (best available browser-side KDF; Argon2id is server-only).
 */
export async function deriveEncryptionKey(
  masterPassword: string,
  saltHex: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = hexToBytes(saltHex);

  // Import password as raw key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  // Derive AES-256-GCM key with PBKDF2
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 600_000, // NIST recommended minimum for PBKDF2-SHA256
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable — key never leaves browser memory
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns the ciphertext (base64) and IV (base64) to store on the server.
 */
export async function encryptData(
  plaintext: string,
  key: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const ivBytes = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

  const plaintextBytes = encoder.encode(plaintext);
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
    key,
    plaintextBytes.buffer as ArrayBuffer,
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(ivBytes),
  };
}

/**
 * Decrypts a ciphertext (base64) using the encryption key and IV (base64).
 * Returns the original plaintext string.
 */
export async function decryptData(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey,
): Promise<string> {
  const ciphertext = base64ToBytes(ciphertextBase64);
  const iv = base64ToBytes(ivBase64);

  const plaintextBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext.buffer as ArrayBuffer,
  );

  return new TextDecoder().decode(plaintextBuffer);
}

/**
 * Generates a random 16-byte salt as a hex string.
 * (Used when creating the account, returned from server on registration.)
 */
export function generateSalt(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return bytesToHex(bytes);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------
// Vault entry payload encryption helpers
// ---------------------------------------------------------------------------

export interface VaultEntryPayload {
  password?: string;
  notes?: string;
  customFields?: Array<{ name: string; value: string; type: 'text' | 'hidden' | 'url' }>;
  cardNumber?: string;
  cvv?: string;
  expirationDate?: string;
  cardholderName?: string;
  // identity fields
  ssn?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  driverLicense?: string;
  address?: string;
  phone?: string;
  // totp
  totpSecret?: string;
}

export async function encryptPayload(
  payload: VaultEntryPayload,
  key: CryptoKey,
): Promise<{ encryptedData: string; iv: string }> {
  const json = JSON.stringify(payload);
  const { ciphertext, iv } = await encryptData(json, key);
  return { encryptedData: ciphertext, iv };
}

export async function decryptPayload(
  encryptedData: string,
  iv: string,
  key: CryptoKey,
): Promise<VaultEntryPayload> {
  const json = await decryptData(encryptedData, iv, key);
  return JSON.parse(json) as VaultEntryPayload;
}
