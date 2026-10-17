import sharp from 'sharp';
import { CommunityError } from './http.mjs';

// Decoded pixels are large; never keep them in sharp's cache between requests.
sharp.cache(false);
/** 4096 × 3072: admits 12 MP phone photos (4032 × 3024) and refuses larger decodes. */
export const maxInputPixels = 4096 * 3072;
const slots = 2, queueLimit = 20, waiting = [];
let active = 0;

/** Runs one user photo decode at a time per slot, so concurrent uploads cannot exhaust memory. */
export async function withDecodeSlot(work) {
  if (active < slots) active += 1;
  else {
    if (waiting.length >= queueLimit) throw new CommunityError(503, 'Photo uploads are busy. Try again shortly.');
    await new Promise(resolve => waiting.push(resolve));
  }
  try { return await work(); }
  finally {
    const next = waiting.shift();
    if (next) next(); else active -= 1;
  }
}
