import { logger } from '../config.mjs';
import { GeminiError, geminiConfig } from './gemini.mjs';

/**
 * Gemini file storage for videos too large to send inside a request (downloads and member uploads). Files are
 * uploaded with the resumable protocol, used once by reference and deleted after the job; Google also expires them
 * after 48 hours. Only available with the key stored in the staff console (direct mode).
 */
const API = 'https://generativelanguage.googleapis.com';
export const MAX_FILE_BYTES = 60 * 1024 * 1024;
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-matroska', 'video/mpeg'];

async function keyHeaders() {
  const config = await geminiConfig();
  if (config.mode !== 'direct') throw new GeminiError(503, 'Video uploads need the Gemini key stored in the staff console.');
  return config.headers;
}

/** Uploads `body` (a stream or bytes of exactly `size` bytes) and waits until Google has processed the video. */
export async function storeFile({ body, size, mimeType, displayName, signal = undefined }) {
  if (!(size > 0) || size > MAX_FILE_BYTES) throw new GeminiError(413, 'Videos can be up to 60 MB. Trim it or pick a shorter clip.');
  if (!VIDEO_TYPES.includes(mimeType)) throw new GeminiError(415, 'That file is not a video QuinTaste can read.');
  const headers = await keyHeaders();
  const start = await fetch(API + '/upload/v1beta/files', { method: 'POST', redirect: 'error', signal,
    headers: { ...headers, 'content-type': 'application/json', 'x-goog-upload-protocol': 'resumable', 'x-goog-upload-command': 'start',
      'x-goog-upload-header-content-length': String(size), 'x-goog-upload-header-content-type': mimeType },
    body: JSON.stringify({ file: { display_name: String(displayName).slice(0, 120) } }) });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  await start.body?.cancel();
  if (!start.ok || !uploadUrl?.startsWith(API + '/')) throw new GeminiError(502, 'The video could not be sent to the model.');
  const sent = await fetch(uploadUrl, { method: 'POST', redirect: 'error', signal, duplex: 'half', body,
    headers: { 'content-length': String(size), 'x-goog-upload-offset': '0', 'x-goog-upload-command': 'upload, finalize' } });
  const result = /** @type {{ file?: { name?: string, uri?: string, state?: string, mimeType?: string } }} */ (await sent.json().catch(() => ({})));
  const file = result.file;
  if (!sent.ok || typeof file?.name !== 'string' || !/^files\/[a-z0-9-]{1,64}$/.test(file.name)) {
    logger.warn({ event: 'ai_recipes_file_upload_failed', status: sent.status });
    throw new GeminiError(502, 'The video could not be sent to the model.');
  }
  return waitActive(file, headers, signal);
}

async function waitActive(file, headers, signal) {
  let current = file;
  for (let attempt = 0; current.state === 'PROCESSING' && attempt < 60; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (signal?.aborted) throw new GeminiError(499, 'Stopped.');
    const response = await fetch(API + '/v1beta/' + current.name, { headers, redirect: 'error', signal });
    if (response.ok) current = await response.json();
  }
  if (current.state !== 'ACTIVE') {
    await deleteFile(current.name);
    throw new GeminiError(422, current.state === 'FAILED' ? 'The model could not read this video file.' : 'The video took too long to process. Try a shorter clip.');
  }
  return { name: current.name, uri: current.uri, mimeType: current.mimeType };
}

/** Best effort; a file that is not deleted expires at Google after 48 hours. */
export async function deleteFile(name) {
  if (typeof name !== 'string' || !/^files\/[a-z0-9-]{1,64}$/.test(name)) return;
  try {
    const headers = await keyHeaders();
    const response = await fetch(API + '/v1beta/' + name, { method: 'DELETE', headers, redirect: 'error' });
    await response.body?.cancel();
  } catch { /* Expires on its own. */ }
}
