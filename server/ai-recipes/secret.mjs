import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pool, logger } from '../config.mjs';

/**
 * Provider keys staff enter in the admin console, stored in ops.provider_secret as AES-256-GCM ciphertext under the
 * provider-secret-key file (32 bytes, hex) that only the app and admin containers mount. The app decrypts on read,
 * caches the value for a minute, and never logs it.
 */
const CACHE_MS = 60000;
const cache = new Map();
let keyBytes;

function keyMaterial() {
  if (keyBytes !== undefined) return keyBytes;
  try {
    const hex = readFileSync(process.env.PROVIDER_SECRET_KEY_FILE || '', 'utf8').trim();
    keyBytes = /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, 'hex') : null;
  } catch { keyBytes = null; }
  if (!keyBytes) logger.warn({ event: 'provider_secret_key_missing' });
  return keyBytes;
}
export const providerSecretsReady = () => Boolean(keyMaterial());

/** iv(12) || tag(16) || data, with the provider name as associated data so a row cannot be moved between providers. */
export function encryptSecret(key, provider, plaintext) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(provider));
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}
export function decryptSecret(key, provider, blob) {
  const decipher = createDecipheriv('aes-256-gcm', key, blob.subarray(0, 12));
  decipher.setAAD(Buffer.from(provider));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString('utf8');
}

/** The stored key for a provider, or null when none is set or it cannot be decrypted. */
export async function loadProviderKey(provider) {
  const hit = cache.get(provider);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  let value = null;
  const key = keyMaterial();
  if (key) {
    try {
      const row = (await pool.query('SELECT ciphertext FROM ops.provider_secret WHERE provider=$1', [provider])).rows[0];
      if (row) value = decryptSecret(key, provider, row.ciphertext);
    } catch (error) {
      logger.warn({ event: 'provider_secret_unreadable', provider, category: error?.code ?? 'decrypt' });
    }
  }
  cache.set(provider, { value, at: Date.now() });
  return value;
}
export function forgetProviderKey(provider) { cache.delete(provider); }
