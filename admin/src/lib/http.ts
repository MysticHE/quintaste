import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { settings } from './config';
import { query } from './db';
import { pageSize } from './paging';

export { pageSize };

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export function cookie(request: Request, name: string) {
  return request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1) || '';
}
export function cookieHeader(name: string, value: string, maxAge: number) {
  return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${settings().origin.startsWith('https:') ? '; Secure' : ''}`;
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function trustedWrite(request: Request) {
  if (request.headers.get('origin') !== settings().origin || request.headers.get('x-quintaste-admin') !== '1') {
    throw new HttpError(403, 'This request must come from the staff console.');
  }
}
export async function body(request: Request, limit = 16384): Promise<Record<string, unknown>> {
  trustedWrite(request);
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new HttpError(415, 'JSON is required.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A request body is required.');
  let size = 0; const parts: Uint8Array[] = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > limit) throw new HttpError(413, 'The request is too large.'); parts.push(value); }
    const parsed: unknown = JSON.parse(Buffer.concat(parts).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
    return parsed as Record<string, unknown>;
  } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Check the submitted information.'); }
  finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export function text(value: unknown, name: string, maximum = 500, minimum = 1) {
  if (typeof value !== 'string' || value.trim().length < minimum || value.trim().length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new HttpError(400, `Check ${name}.`);
  }
  return value.trim();
}
export function choice<T extends string>(value: unknown, values: readonly T[], name: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new HttpError(400, `Check ${name}.`);
  return value as T;
}
export function integer(value: unknown, name: string, min = 0, max = 100000) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, `Check ${name}.`);
  return value;
}
/** Row offset for a page of staff list rows; anything malformed reads as the first page. */
export function offset(value: string | null) {
  const page = /^\d{1,4}$/.test(value ?? '') ? Number(value) : 0;
  return Math.min(page, 1000) * pageSize;
}
export function uuid(value: unknown, name: string) {
  const id = text(value, name, 36, 36);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new HttpError(400, `Check ${name}.`);
  return id;
}
export async function throttle(key: string, maximum = 60, seconds = 60) {
  const result = await query<{ attempts: number }>(`INSERT INTO staff.throttle (key,window_start,attempts)
    VALUES($1,to_timestamp(floor(extract(epoch from now())/$2)*$2),1)
    ON CONFLICT (key,window_start) DO UPDATE SET attempts=staff.throttle.attempts+1 RETURNING attempts`, [hash(key), seconds]);
  if (result.rows[0].attempts > maximum) throw new HttpError(429, 'Too many requests. Wait and try again.');
}
