import 'server-only';
import { createHash } from 'node:crypto';
import sharp, { type OutputInfo } from 'sharp';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { HttpError, trustedWrite, reasonText } from './http';

const types = new Set(['image/jpeg', 'image/png', 'image/webp']), limit = 8 * 1024 * 1024;
async function readImage(request: Request) {
  trustedWrite(request);
  if (!types.has(request.headers.get('content-type')?.split(';')[0] ?? '')) throw new HttpError(415, 'Use a JPEG, PNG or WebP photo.');
  if (Number(request.headers.get('content-length') ?? 0) > limit) throw new HttpError(413, 'Use a photo under 8 MB.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Choose a photo.');
  let size = 0; const parts: Uint8Array[] = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > limit) throw new HttpError(413, 'Use a photo under 8 MB.'); parts.push(value); }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  return Buffer.concat(parts);
}
/** Re-encodes an uploaded photo (strips location and camera metadata), stores it by SHA-256 and returns its public path. */
export async function uploadPhoto(member: Session, request: Request) {
  authorize(member, 'content');
  let reason: string;
  try { reason = reasonText(decodeURIComponent(request.headers.get('x-quintaste-reason') ?? ''), 'Photo uploaded (no reason given)'); }
  catch { throw new HttpError(400, 'Give a reason of at least 10 characters for this photo.'); }
  const input = await readImage(request);
  let output: { data: Buffer; info: OutputInfo };
  try {
    const encode = (quality: number) => sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' }).rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    output = await encode(82);
    if (output.data.length > 600000) output = await encode(68);
  } catch { throw new HttpError(400, 'This file could not be read as a photo.'); }
  if (output.data.length > 690000) throw new HttpError(413, 'This photo is too detailed. Crop it or use a smaller one.');
  if (output.info.width < 320 || output.info.height < 240) throw new HttpError(400, 'Use a photo at least 320 by 240 pixels.');
  const sha = createHash('sha256').update(output.data).digest('hex');
  await transaction(async db => {
    await lockPermission(db, member, 'content');
    await db.query('INSERT INTO content.asset(sha256,bytes,width,height,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [sha, output.data, output.info.width, output.info.height, member.id]);
    await audit(db, member.id, 'content.photo.upload', 'asset:' + sha, reason, { bytes: output.data.length });
  });
  return { path: `/api/catalogue-photos/${sha}.jpg`, width: output.info.width, height: output.info.height };
}
/** A content photo for staff preview: uploaded photos from the database, packaged ones from the app. */
export async function contentPhoto(member: Session, sha: string) {
  authorize(member, 'content');
  if (!/^[a-f0-9]{64}$/.test(sha)) throw new HttpError(400, 'Check photo.');
  const stored = (await query<{ bytes: Buffer }>('SELECT bytes FROM content.asset WHERE sha256=$1', [sha])).rows[0];
  if (stored) return stored.bytes;
  const origin = process.env.NODE_ENV === 'production' ? 'http://app:3000' : 'http://localhost:3300';
  const response = await fetch(`${origin}/api/catalogue-photos/${sha}.jpg`, { redirect: 'error', signal: AbortSignal.timeout(8000) }).catch(() => null);
  return response?.ok ? Buffer.from(await response.arrayBuffer()) : null;
}

/** Only public recipe asset namespaces; never proxy a caller-supplied URL. */
export async function recipePhoto(member: Session, path: string) {
  authorize(member, 'content');
  const match = /^\/api\/(catalogue-photos|editorial\/assets)\/([a-f0-9]{64})\.jpg$/.exec(path);
  if (!match) throw new HttpError(400, 'Check recipe photo.');
  if (match[1] === 'catalogue-photos') return contentPhoto(member, match[2]);
  const origin = process.env.NODE_ENV === 'production' ? 'http://app:3000' : 'http://localhost:3300';
  const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(8000) }).catch(() => null);
  return response?.ok ? Buffer.from(await response.arrayBuffer()) : null;
}
