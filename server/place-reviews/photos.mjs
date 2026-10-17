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
  const result = [];
  for (const uri of value) {
    if (typeof uri !== 'string') throw new CommunityError(400, 'Choose a valid photo.');
    if (uri.startsWith(`/api/place-reviews/${place}/photos/`) && uri.length < 240) { result.push({ keep: uri }); continue; }
    if (uri.length > 1400000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) throw new CommunityError(400, 'Use a JPG, PNG or WebP photo under 1 MB.');
    const base64 = uri.slice(uri.indexOf(',') + 1), input = Buffer.from(base64, 'base64');
    try {
      if (!input.length || input.length > 1048576 || input.toString('base64') !== base64) throw Error();
      const bytes = await withDecodeSlot(() => sharp(input, { limitInputPixels: maxInputPixels, failOn: 'error', animated: false }).rotate()
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toBuffer());
      if (bytes.length > 450000) throw new CommunityError(400, 'That photo is too detailed. Choose a smaller photo.');
      result.push({ id: randomUUID(), bytes, digest: createHash('sha256').update(bytes).digest('hex') });
    } catch (error) {
      if (error instanceof CommunityError) throw error;
      throw new CommunityError(400, 'That photo could not be read. Choose another photo.');
    } finally { input.fill(0); }
  }
  return result;
}
