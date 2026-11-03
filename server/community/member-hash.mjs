import { createHmac } from 'node:crypto';

/**
 * Counting people without storing who they are: a keyed hash of a member's id, with a separate key per use (`label`), derived from
 * the app's auth secret. The same member always gives the same hash for one label; the hashes of two labels cannot be linked.
 */
export function memberHasher(label) {
  const key = createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? '').update(label).digest();
  return id => createHmac('sha256', key).update(String(id)).digest('hex');
}
