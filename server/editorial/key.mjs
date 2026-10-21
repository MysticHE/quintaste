import fs from 'node:fs';
import path from 'node:path';

/**
 * The HMAC key the QT bots sign with: editorial publications (/api/editorial/control/*) and AI recipe tasks
 * (/api/ai-recipes/bot/*). The signed path keeps the two uses apart. Cached for a minute so request paths do not read
 * the file each time; a rotated key is picked up within that minute. Empty when the file is missing.
 */
let cached = '', readAt = 0;
export function publisherKey() {
  if (Date.now() - readAt < 60000) return cached;
  readAt = Date.now();
  try {
    cached = fs.readFileSync(process.env.QT_EDITORIAL_KEY_FILE || path.resolve('.local/editorial-private/publisher.key'), 'utf8').trim();
  } catch { cached = ''; }
  return cached;
}
