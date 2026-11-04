import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { CommunityError } from '../community/http.mjs';
import { maxInputPixels, withDecodeSlot } from '../community/images.mjs';

export const photoPath = (place, photo) => `/api/place-reviews/${place}/photos/${photo.id}?v=${photo.digest.slice(0, 12)}`;
/** Decode only bounded raster images; rotate and re-encode to remove metadata, including GPS. */
export async function reviewPhotos(value, place) {
  if (value === undefined) return undefined; // Older clients preserve existing photos when editing text.
  if (!Array.isArray(value) || value.length > 3) throw new CommunityError(400, 'Add up to 3 photos.');
  /** @type {Array<{ keep: string } | { keep?: undefined, id: string, bytes: Buffer, digest: string }>} */
  const result = [];
  for (const uri of value) {
    if (typeof uri !== 'string') throw new CommunityError(400, 'Choose a valid photo.');
    if (uri.startsWith(`/api/place-reviews/${place}/photos/`) && uri.length < 240) { result.push({ keep: uri }); continue; }
    result.push(await memberPhoto(uri));
  }
  return result;
}
/**
 * A member's photo from the app (a JPG, PNG or WebP data URI under 1 MB) as a new id, metadata-free JPEG bytes (at most
 * 1280 px and 450 KB) and their SHA-256. Shared by place reviews and cooked photos.
 */
export async function memberPhoto(uri) {
  if (typeof uri !== 'string' || uri.length > 1400000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) throw new CommunityError(400, 'Use a JPG, PNG or WebP photo under 1 MB.');
  const base64 = uri.slice(uri.indexOf(',') + 1), input = Buffer.from(base64, 'base64');
  try {
    if (!input.length || input.length > 1048576 || input.toString('base64') !== base64) throw Error();
    const bytes = await withDecodeSlot(() => sharp(input, { limitInputPixels: maxInputPixels, failOn: 'error', animated: false }).rotate()
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toBuffer());
    if (bytes.length > 450000) throw new CommunityError(400, 'That photo is too detailed. Choose a smaller photo.');
    return { id: randomUUID(), bytes, digest: createHash('sha256').update(bytes).digest('hex') };
  } catch (error) {
    if (error instanceof CommunityError) throw error;
    throw new CommunityError(400, 'That photo could not be read. Choose another photo.');
  } finally { input.fill(0); }
}
const thumbs = new Map(), making = new Map(), thumbLimit = 300, thumbSlots = 2, thumbQueue = 400, waiting = [];
let active = 0;
/**
 * Runs one thumbnail at a time per slot, in its own queue: a page of new thumbnails waits its turn instead of failing, and
 * never takes the upload decode slots, so members can still save reviews while a gallery fills in.
 */
async function withThumbSlot(work) {
  if (active < thumbSlots) active += 1;
  else {
    if (waiting.length >= thumbQueue) throw new CommunityError(503, 'Photos are busy. Try again shortly.');
    await new Promise(resolve => waiting.push(resolve));
  }
  try { return await work(); }
  finally { const next = waiting.shift(); if (next) next(); else active -= 1; }
}
/**
 * A 480 px square of a stored review photo, cropped around its busiest part, so every grid tile has the same shape whatever
 * the member uploaded. Kept in memory by photo id and digest (the bytes never change under one id), at most 300 at a time;
 * requests for a thumbnail already being made share that one decode.
 */
export async function squareThumb({ id, digest, bytes }) {
  const key = id + ':' + digest, kept = thumbs.get(key);
  if (kept) { thumbs.delete(key); thumbs.set(key, kept); return kept; }
  if (making.has(key)) return making.get(key);
  const job = withThumbSlot(() => sharp(bytes, { limitInputPixels: maxInputPixels, failOn: 'error' })
    .resize({ width: 480, height: 480, fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 78, mozjpeg: true }).toBuffer())
    .then(thumb => {
      thumbs.set(key, thumb);
      if (thumbs.size > thumbLimit) thumbs.delete(thumbs.keys().next().value);
      return thumb;
    }).finally(() => making.delete(key));
  making.set(key, job);
  return job;
}
