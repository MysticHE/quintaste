import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { join } from 'node:path';
import { avatarConfig, AvatarError } from './config.mjs';
import { avatarFrame } from './media.mjs';
import { basePrompt, expressionPrompt } from './prompts.mjs';

async function boundedJson(response) {
  if (!response.body) throw new AvatarError(502, 'The image provider returned no image.');
  const reader = response.body.getReader(), parts = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 20 * 1024 * 1024) throw new AvatarError(502, 'The image provider returned an oversized image.');
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export async function renderFrame(input, state, signal) {
  const config = avatarConfig();
  if (!config.enabled) throw new AvatarError(503, 'Avatar generation is temporarily unavailable.');
  const body = new FormData();
  for (const [key,value] of Object.entries({ model: config.model, prompt: state === 'base' ? basePrompt : expressionPrompt(state),
    n: '1', size: '1024x1024', quality: 'high', background: 'transparent', output_format: 'webp', output_compression: '85' })) body.set(key,value);
  body.append('image[]', new Blob([input], { type: state === 'base' ? 'image/jpeg' : 'image/webp' }), 'portrait.' + (state === 'base' ? 'jpg' : 'webp'));
  if (state === 'base') for (const name of ['hormozi-base.webp','graham-base.webp']) {
    body.append('image[]', new Blob([await readFile(join('server-assets','avatar',name))], { type: 'image/webp' }), name);
  }
  const response = await fetch(config.endpoint, { method: 'POST', body, redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(180000)]), headers: {
      'cf-aig-authorization': 'Bearer ' + config.token, 'cf-aig-byok-alias': 'default',
      'cf-aig-collect-log': 'false', 'cf-aig-collect-log-payload': 'false', 'cf-aig-skip-cache': 'true',
      'cf-aig-max-attempts': '1', 'cf-aig-request-timeout': '180000',
    } });
  if (!response.ok) {
    await response.body?.cancel();
    throw new AvatarError(502, response.status === 429 ? 'The image provider is busy or its allowance is exhausted. Try later.' :
      [401,403].includes(response.status) ? 'The image provider rejected access. Contact support.' : 'The image provider could not create this avatar. Your saved avatar is unchanged.');
  }
  const value = await boundedJson(response), encoded = value.data?.[0]?.b64_json;
  if (value.data?.length !== 1 || typeof encoded !== 'string' || encoded.length > 16000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new AvatarError(502, 'The image provider returned an unusable image.');
  }
  return avatarFrame(Buffer.from(encoded,'base64'));
}
