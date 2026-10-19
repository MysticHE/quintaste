import { readFileSync } from 'node:fs';

export class AvatarError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
export const consentVersion = 'cloudflare-openai-selfie-v2';
export const frameNames = ['base', 'blink', 'mid', 'open'];
export const lifetimeMs = 15 * 60 * 1000;
/**
 * Local checks only: AVATAR_PROVIDER_LOCAL_URL sends image edits to a stub on this machine instead of the gateway, so no
 * paid provider call is made. Ignored in production and for anything but a loopback http address.
 */
function localStub() {
  const value = process.env.AVATAR_PROVIDER_LOCAL_URL;
  if (!value || process.env.NODE_ENV === 'production') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
export function avatarConfig() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const gateway = process.env.CLOUDFLARE_GATEWAY_ID || '';
  const model = process.env.AVATAR_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
  let token = '';
  try { token = readFileSync(process.env.CLOUDFLARE_GATEWAY_TOKEN_FILE || '', 'utf8').trim(); } catch { /* Status stays unavailable. */ }
  const valid = /^[a-f0-9]{32}$/.test(account) && /^[a-z0-9-]{1,64}$/.test(gateway)
    && ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'].includes(model) && /^[\x21-\x7e]{20,512}$/.test(token);
  return { enabled: process.env.AVATAR_ENABLED === 'true' && Boolean(valid), token, model,
    endpoint: localStub() ?? `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/openai/images/edits`,
    directory: process.env.AVATAR_DATA_DIR || '/app/.local/avatar',
    keyFile: process.env.AVATAR_STORAGE_KEY_FILE || '/run/secrets/avatar/storage-key',
    dailyAccount: 2, dailyGlobal: 5,
    // Lotus breeds have their own allowance (AVATAR_LOTUS_PLAN §5): one breed and its two free regenerations per account
    // per UTC day, and ten six-call attempts across the server.
    lotusDailyAccount: 3, lotusDailyGlobal: 10 };
}
