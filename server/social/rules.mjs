import { CommunityError } from '../community/http.mjs';
import { dietLabels } from '../diet-labels.mjs';
import * as options from './options.mjs';

/** A practice before 20 Oct 2026, now the Vegetarian label. Stored profiles keep it in step for older app images. */
export const fivePungent = 'No five pungent';
/** Labels a person keeps or a class serves (server/diet-labels.mjs): Plant-Based alone, or Vegan and/or Vegetarian. */
export function readDiets(value) {
  const strict = Array.isArray(value) ? dietLabels.filter(label => label !== 'Plant-Based' && value.includes(label)) : [];
  return strict.length ? strict : ['Plant-Based'];
}
/** The old single `diet` column value that older app images read and write. */
export const legacyDiet = labels => labels.includes('Vegan') ? 'Vegan' : 'Vegetarian';
/** Stored practices also carry the old No five pungent practice whenever Vegetarian is kept, for older app images. */
export const storedPractices = (kept, labels) => labels.includes('Vegetarian') ? [...kept, fivePungent] : kept;
/** "YYYY-MM-DD HH:mm" Singapore wall-clock text for every Social time. */
export const sgText = column => `to_char(${column} AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD HH24:MI')`;
/** Up to three answered prompts from the bank, one answer each, 100 characters. */
export function readPrompts(value) {
  const seen = new Set(), out = [];
  for (const item of Array.isArray(value) ? value : []) {
    if (!item || typeof item !== 'object' || !options.prompts.includes(item.q) || seen.has(item.q)) continue;
    const a = typeof item.a === 'string' ? item.a.trim().slice(0, 100) : '';
    if (a) { seen.add(item.q); out.push({ q: item.q, a }); }
    if (out.length === 3) break;
  }
  return out;
}
/** A dinner or slot time: valid Singapore text, in the future and within two years. */
export function readFuture(value, field = 'Date and time') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) throw new CommunityError(400, `Choose a ${field.toLowerCase()}.`);
  const at = Date.parse(value.replace(' ', 'T') + ':00+08:00');
  if (!Number.isFinite(at)) throw new CommunityError(400, `Choose a valid ${field.toLowerCase()}.`);
  if (at <= Date.now()) throw new CommunityError(400, 'Choose a future date and time.');
  if (at - Date.now() > 2 * 365 * 86400000) throw new CommunityError(400, 'Choose a date within the next two years.');
  return new Date(at);
}
