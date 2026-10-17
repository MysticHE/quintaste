import { readFileSync } from 'node:fs';

export class AvatarError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const consentVersion = 'cloudflare-openai-selfie-v2';
export const frameNames = ['base', 'blink', 'mid', 'open'];
export const lifetimeMs = 15 * 60 * 1000;
export function avatarConfig() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const gateway = process.env.CLOUDFLARE_GATEWAY_ID || '';
  const model = process.env.AVATAR_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
  let token = '';
  try { token = readFileSync(process.env.CLOUDFLARE_GATEWAY_TOKEN_FILE || '', 'utf8').trim(); } catch { /* Status stays unavailable. */ }
  const valid = /^[a-f0-9]{32}$/.test(account) && /^[a-z0-9-]{1,64}$/.test(gateway)
    && ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'].includes(model) && /^[\x21-\x7e]{20,512}$/.test(token);
  return { enabled: process.env.AVATAR_ENABLED === 'true' && Boolean(valid), token, model,
    endpoint: `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/openai/images/edits`,
    directory: process.env.AVATAR_DATA_DIR || '/app/.local/avatar',
    keyFile: process.env.AVATAR_STORAGE_KEY_FILE || '/run/secrets/avatar/storage-key',
    dailyAccount: 2, dailyGlobal: 5 };
}
