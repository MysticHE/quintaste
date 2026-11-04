import { createHash } from 'node:crypto';
import sharp from 'sharp';

/**
 * A member's own photo as a place cover (owner, 4 Nov 2026: Phase 3 of place suggestions). Shared by the app server (Kaya-checked
 * listings, server/explore-work/worker.mjs) and the admin console (staff Add to Explore). Only photos the member said they took and
 * agreed may be the cover are used; the picture is resized and recompressed, never edited or enhanced.
 */
export const MEMBER_COVER = { author: 'QuinTaste member', license: 'Shared with QuinTaste by the member who took it', kind: 'member-cover-photo' };
/** The consent the suggestion form shows ("I took this photo. It can be the cover."); recorded with every suggestion that gives it. */
export const COVER_CONSENT = 'suggest-cover-v1';

/** Digests of the photos members agreed may be this suggestion's cover. @param {{ suggestions?: Array<{ coverPhoto?: string | null }> }} payload */
export const consentedCovers = payload => new Set((payload.suggestions ?? []).map(s => s.coverPhoto).filter(Boolean));

/**
 * The cover JPEG within every reader's limits (320 to 1600 wide, 240 to 1600 tall, at most 512 KB), or null when the photo is too
 * small to be a cover. The same input always gives the same bytes, so a retried publication matches the first.
 * @param {Buffer} bytes
 */
export async function coverImage(bytes) {
  const encode = (input, quality) => sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' }).rotate()
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  let out = await encode(bytes, 80);
  if (out.data.length > 512 * 1024) out = await encode(bytes, 64);
  if (out.data.length > 512 * 1024 || out.info.width < 320 || out.info.height < 240) return null;
  return { bytes: out.data, width: out.info.width, height: out.info.height, sha256: createHash('sha256').update(out.data).digest('hex') };
}
/** The listing's photo field for a member cover. @param {{ sha256: string, width: number, height: number }} image @param {string} sourceUrl @param {string} today */
export const coverPhoto = (image, sourceUrl, today) => ({ path: '/api/catalogue-photos/' + image.sha256 + '.jpg', width: image.width, height: image.height,
  author: MEMBER_COVER.author, sourceUrl, license: MEMBER_COVER.license, licenseUrl: null, capturedAt: null, checkedAt: today, changes: 'Resized for the cover; no other changes.' });
