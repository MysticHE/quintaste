import { Buffer } from 'node:buffer';
import { createCipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { logger } from '../config.mjs';
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
/** A live selfie for staff to compare with the main photo: 1024-pixel JPEG, never shown to other members. */
export async function selfiePhoto(uri) {
  const input = decode(uri, 2097152, 'Take a clear selfie.');
  try {
    return await withDecodeSlot(async () => {
      const meta = await reader(input).metadata();
      if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 256) throw new CommunityError(400, 'That selfie is too small. Take it again.');
      return await reader(input).rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    });
  } catch (error) {
    if (error instanceof CommunityError) throw error;
    throw new CommunityError(400, 'That selfie could not be read. Take it again.');
  } finally { input.fill(0); }
}

let selfieKey;
/**
 * The selfie key: derived from the provider-secret-key file (32 bytes, hex) that only the app and admin containers mount,
 * with its own HKDF label so it never equals the provider-key encryption key. The admin console derives the same key.
 */
function keyMaterial() {
  if (selfieKey !== undefined) return selfieKey;
  try {
    const hex = readFileSync(process.env.PROVIDER_SECRET_KEY_FILE || '', 'utf8').trim();
    selfieKey = /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hkdfSync('sha256', Buffer.from(hex, 'hex'), Buffer.alloc(0), 'quintaste social selfie v1', 32)) : null;
  } catch { selfieKey = null; }
  if (!selfieKey) logger.warn({ event: 'social_selfie_key_missing' });
  return selfieKey;
}
/** iv(12) || tag(16) || data, bound to the member so a selfie cannot be moved to another account. */
export function sealSelfie(userId, bytes) {
  const key = keyMaterial();
  if (!key) throw new CommunityError(503, 'Photo checks are unavailable right now. Try again later.');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('selfie:' + userId));
  const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}
