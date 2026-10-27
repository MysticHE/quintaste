import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { secret } from './config';
import { HttpError } from './http';

/**
 * Signed calls from the QT bots to admin (docs/ADMIN_CHEFS_PLAN.md), signed like the app's bot routes (server/bot-signature.mjs):
 * X-QT-Time and X-QT-Signature = HMAC-SHA256(key, time \n METHOD \n path and query \n sha256(body)), five-minute window.
 * X-QT-Bot names the caller; each caller has its own key (never the editorial publisher key) and may reach only its listed
 * resources. Chefs are named by their bot ids (server-assets/kitchen/chefs.js); a chef reaches only its own lanes (chef-lanes.ts).
 */
const callers = {
  alerts: { key: 'ADMIN_BOT_ALERTS_KEY', resources: ['attention'] },
  head: { key: 'ADMIN_BOT_HEAD_KEY', resources: ['asks', 'answer'] },
  wok: { key: 'ADMIN_BOT_WOK_KEY', resources: ['lane', 'decide'] },
  writer: { key: 'ADMIN_BOT_WRITER_KEY', resources: ['lane', 'decide'] },
  artist: { key: 'ADMIN_BOT_ARTIST_KEY', resources: ['lane', 'decide'] },
  fixer: { key: 'ADMIN_BOT_FIXER_KEY', resources: ['lane', 'decide'] },
  host: { key: 'ADMIN_BOT_HOST_KEY', resources: ['lane', 'decide'] },
  safety: { key: 'ADMIN_BOT_SAFETY_KEY', resources: ['lane', 'decide'] },
} as const;
export type Caller = keyof typeof callers;

export function botCaller(request: Request, resource: string, body: Buffer = Buffer.alloc(0)): Caller {
  const name = request.headers.get('x-qt-bot') ?? '', time = request.headers.get('x-qt-time') ?? '';
  const signature = request.headers.get('x-qt-signature') ?? '';
  const caller = Object.hasOwn(callers, name) ? callers[name as Caller] : null, key = caller ? secret(caller.key) : '';
  if (!caller || key.length < 48 || !/^\d{10}$/.test(time) || Math.abs(Date.now() / 1000 - Number(time)) > 300
    || !/^[a-f0-9]{64}$/.test(signature)) throw new HttpError(401, 'Unauthorized.');
  const url = new URL(request.url);
  const message = time + '\n' + request.method + '\n' + url.pathname + url.search + '\n' + createHash('sha256').update(body).digest('hex');
  if (!timingSafeEqual(createHmac('sha256', key).update(message).digest(), Buffer.from(signature, 'hex'))) throw new HttpError(401, 'Unauthorized.');
  if (!(caller.resources as readonly string[]).includes(resource)) throw new HttpError(403, 'Not allowed.');
  return name as Caller;
}

/** The exact request bytes (the signature covers them), at most `limit` bytes. */
export async function rawBody(request: Request, limit = 32768) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const parts: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > limit) throw new HttpError(413, 'The request is too large.'); parts.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  return Buffer.concat(parts);
}
export function parse(body: Buffer): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(body.toString('utf8') || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch { /* falls through */ }
  throw new HttpError(400, 'JSON is required.');
}
