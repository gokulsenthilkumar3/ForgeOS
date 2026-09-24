export type VaultEntry = { name: string; username: string; password: string };
type SavedVault = { salt: string; iv: string; data: string };
export type UnlockedVault = { storageKey: string; salt: Uint8Array; key: CryptoKey; entries: VaultEntry[]; active: boolean };

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));

export function workspaceVaultKey(storage: Storage): string {
  return `forgeos-vault-v1:${storage.getItem('forgeos-workspace-id') || 'default'}`;
}

async function derive(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 200000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function openVault(storage: Storage, password: string): Promise<UnlockedVault> {
  if (!password) throw new Error('Master password required');
  const storageKey = workspaceVaultKey(storage);
  const raw = storage.getItem(storageKey);
  const saved = raw ? JSON.parse(raw) as SavedVault : null;
  const salt = saved ? base64ToBytes(saved.salt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(password, salt);
  const plain = saved ? await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(saved.iv) }, key, base64ToBytes(saved.data)) : null;
  if (workspaceVaultKey(storage) !== storageKey) throw new Error('Workspace changed while unlocking');
  const entries = plain ? JSON.parse(new TextDecoder().decode(plain)) as VaultEntry[] : [];
  if (!Array.isArray(entries)) throw new Error('Invalid vault contents');
  return { storageKey, salt, key, entries, active: true };
}

export async function persistVault(storage: Storage, vault: UnlockedVault, entries: VaultEntry[]): Promise<void> {
  if (!vault.active || workspaceVaultKey(storage) !== vault.storageKey) throw new Error('Vault is locked or workspace changed');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, vault.key, new TextEncoder().encode(JSON.stringify(entries)));
  if (!vault.active || workspaceVaultKey(storage) !== vault.storageKey) throw new Error('Vault is locked or workspace changed');
  storage.setItem(vault.storageKey, JSON.stringify({ salt: bytesToBase64(vault.salt), iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) }));
}
