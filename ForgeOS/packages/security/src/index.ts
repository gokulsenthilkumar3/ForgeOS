import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Role } from '@forgeos/contracts';

const permissions: Record<Role, string[]> = {
  owner: ['*'], admin: ['workspace:manage', 'project:manage', 'run:manage', 'secret:manage', 'audit:read'],
  member: ['project:read', 'run:manage', 'artifact:read'], auditor: ['project:read', 'audit:read', 'artifact:read'],
  service_account: ['run:manage', 'artifact:write']
};
export const can = (role: Role, permission: string) => permissions[role].includes('*') || permissions[role].includes(permission);
export function encryptSecret(plainText: string, masterKey: Buffer) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', masterKey, iv);
  return { ciphertext: Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]).toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
export function decryptSecret(payload: ReturnType<typeof encryptSecret>, masterKey: Buffer) {
  const decipher = createDecipheriv('aes-256-gcm', masterKey, Buffer.from(payload.iv, 'base64')); decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
