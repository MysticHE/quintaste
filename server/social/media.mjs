import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { CommunityError } from '../community/http.mjs';
import { maxInputPixels, withDecodeSlot } from '../community/images.mjs';

/** A phone photo as a bounded data URI: decoded, checked to round-trip and returned as bytes, or refused. */
function decode(uri, maxBytes, message) {
  if (typeof uri !== 'string' || uri.length > Math.ceil(maxBytes * 4 / 3) + 40 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) throw new CommunityError(400, message);
  const base64 = uri.slice(uri.indexOf(',') + 1), input = Buffer.from(base64, 'base64');
  if (!input.length || input.length > maxBytes || input.toString('base64') !== base64) { input.fill(0); throw new CommunityError(400, message); }
  return input;
}
const reader = input => sharp(input, { limitInputPixels: maxInputPixels, failOn: 'error', animated: false });

/** A profile photo: rotated and re-encoded (no metadata or GPS), 1280-pixel JPEG up to 450 KB, plus a 320-pixel square thumbnail. */
export async function profilePhoto(uri) {
  const input = decode(uri, 1048576, 'Use a JPG, PNG or WebP photo under 1 MB.');
  try {
    return await withDecodeSlot(async () => {
      const meta = await reader(input).metadata();
      if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 320) throw new CommunityError(400, 'That photo is too small. Choose a larger one.');
      const image = await reader(input).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toBuffer();
      if (image.length > 450000) throw new CommunityError(400, 'That photo is too detailed. Choose a smaller photo.');
      const thumb = await sharp(image).resize(320, 320, { fit: 'cover', position: 'attention' }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
      return { image, thumb, digest: createHash('sha256').update(image).digest('hex') };
    });
  } catch (error) {
    if (error instanceof CommunityError) throw error;
    throw new CommunityError(400, 'That photo could not be read. Choose another photo.');
  } finally { input.fill(0); }
}
