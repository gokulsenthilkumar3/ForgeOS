import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!key || key.length < 32) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be set and at least 32 chars');
  }
  return Buffer.from(key.slice(0, 32), 'utf-8');
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(hex):tag(hex):ciphertext(hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encoded: string): string {
  const [ivHex, tagHex, encHex] = encoded.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf-8') + decipher.final('utf-8');
}

@Injectable()
export class ApiKeysService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  /** Save or update an API key for a provider. Key is encrypted before storage. */
  async upsert(userId: string, provider: string, rawKey: string) {
    const encrypted = encrypt(rawKey);
    const keyHint = `...${rawKey.slice(-4)}`;

    const { data, error } = await this.supabase
      .from('user_api_keys')
      .upsert(
        { user_id: userId, provider, encrypted_key: encrypted, key_hint: keyHint },
        { onConflict: 'user_id,provider' },
      )
      .select('id, provider, key_hint, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return data; // Never return the encrypted key
  }

  /** List all stored API keys for the user (never return the actual key) */
  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from('user_api_keys')
      .select('id, provider, key_hint, updated_at')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
  }

  /** Retrieve and decrypt a key for internal use (e.g., LLM runner) */
  async getDecryptedKey(userId: string, provider: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (!data) return null;
    return decrypt(data.encrypted_key);
  }

  /** Delete an API key */
  async remove(userId: string, provider: string) {
    const { error } = await this.supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) throw new Error(error.message);
    return { message: `${provider} API key removed` };
  }
}
