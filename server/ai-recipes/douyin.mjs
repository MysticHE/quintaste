import { createWriteStream } from 'node:fs';
import { rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { logger } from '../config.mjs';
import { GeminiError } from './gemini.mjs';
import { framesAvailable, hasAudio } from './frames.mjs';
import { MAX_VIDEO_SECONDS } from './limits.mjs';
import { loadProviderKey } from './secret.mjs';
import { publicAddress } from './video.mjs';

/**
 * Douyin links, read through the self-hosted downloader on the VPS (Douyin_TikTok_Download_API 5.1.8 at /docker/dtk, owner
 * decision 31 Oct 2026; yt-dlp needs fresh signed-in cookies for Douyin). It answers only on the app's private network as
 * `dtk`; its API key is the `dtk` row of ops.provider_secret. The parse gives the post's caption, author and its MP4
 * streams; the smallest stream that still reads well and has sound is saved into the job folder like a yt-dlp download.
 * Time limits are generous so a slow answer is not mistaken for a failure (owner, 31 Oct 2026): 60 s per downloader call,
 * 150 s to read the post, 8 minutes for the file in all, and a copy that sends nothing for 60 s gives way to the next copy.
 */
const BASE = process.env.DTK_URL || 'http://dtk:8000';
const MAX_BYTES = 60 * 1024 * 1024, POLL_MS = 3000, CALL_SECONDS = 60, PARSE_SECONDS = 150, DOWNLOAD_SECONDS = 480, STALL_SECONDS = 60;
/** The job's own signal (if any) with a time limit of its own. */
const limited = (signal, seconds) => signal ? AbortSignal.any([signal, AbortSignal.timeout(seconds * 1000)]) : AbortSignal.timeout(seconds * 1000);

const failure = {
  CONTENT_UNAVAILABLE: 'That video is private, removed or not available.', NOT_FOUND: 'That video is private, removed or not available.',
  INVALID_URL: 'Paste a link to a public Douyin video.', UNSUPPORTED_CONTENT: 'That Douyin link is not a video.',
};
const busy = 'Douyin did not answer our server just now. Try again in a few minutes, or save the video and tap Upload Video.';

async function call(key, method, route, body, signal) {
  const response = await fetch(BASE + route, { method, signal: limited(signal, CALL_SECONDS), redirect: 'error',
    headers: { 'x-api-key': key, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const envelope = /** @type {any} */ (await response.json().catch(() => ({})));
  return { status: response.status, envelope };
}

/** The parsed post: waits for the downloader's task, at most PARSE_SECONDS. */
async function parse(url, signal) {
  const key = await loadProviderKey('dtk');
  if (!key) throw new GeminiError(503, busy);
  const deadline = Date.now() + PARSE_SECONDS * 1000;
  let { status, envelope } = await call(key, 'POST', '/api/v1/parse?wait=30', { url }, signal);
  while (status === 202 && envelope?.data?.task_id && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
    const polled = await call(key, 'GET', '/api/v1/tasks/' + encodeURIComponent(envelope.data.task_id), null, signal);
    const task = polled.envelope?.data;
    if (task?.state === 'done') return task.data;
    if (task?.state === 'failed') { status = 502; envelope = { error: task.error }; break; }
  }
  if (status === 200 && envelope?.success && envelope.data) return envelope.data;
  const code = envelope?.error?.code ?? (status === 202 ? 'TIMEOUT' : 'HTTP_' + status);
  logger.warn({ event: 'ai_recipes_douyin_parse_failed', code });
  throw new GeminiError(422, failure[code] ?? busy);
}

/** The streams worth saving, best first: MP4 at 1024 to 1920 pixels on the long side, then anything else that fits. */
function choose(media) {
  const all = [media?.video, ...(media?.streams ?? [])].filter(s => s && Array.isArray(s.urls) && s.urls.length && (!s.size_bytes || s.size_bytes <= MAX_BYTES));
  const edge = s => Math.max(Number(s.width) || 0, Number(s.height) || 0);
  const rank = s => (s.format === 'mp4' ? 0 : 2) + (edge(s) >= 1024 && edge(s) <= 1920 ? 0 : 1);
  return all.sort((a, b) => rank(a) - rank(b) || (a.size_bytes ?? Infinity) - (b.size_bytes ?? Infinity));
}

/**
 * Saves one https URL to `file` (public addresses only, at most 5 redirects, MAX_BYTES). A copy that sends nothing for
 * STALL_SECONDS is abandoned so the next copy can be tried.
 */
async function save(url, file, signal) {
  const stall = new AbortController();
  let timer = setTimeout(() => stall.abort(new Error('stalled')), STALL_SECONDS * 1000);
  const both = AbortSignal.any([signal, stall.signal]);
  try {
    let current = url;
    for (let hop = 0; hop < 6; hop++) {
      const target = new URL(current);
      if (target.protocol !== 'https:') throw new Error('not https');
      await publicAddress(target.hostname);
      const response = await fetch(target, { redirect: 'manual', signal: both, headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://www.douyin.com/' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = response.headers.get('location');
        if (!next) throw new Error('redirect without a destination');
        current = new URL(next, target).toString();
        continue;
      }
      if (!response.ok || !response.body) throw new Error('status ' + response.status);
      if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('too large');
      let total = 0;
      const counted = Readable.fromWeb(/** @type {any} */ (response.body), { signal: both }).on('data', chunk => {
        total += chunk.length;
        clearTimeout(timer);
        timer = setTimeout(() => stall.abort(new Error('stalled')), STALL_SECONDS * 1000);
        if (total > MAX_BYTES) counted.destroy(new Error('too large'));
      });
      await pipeline(counted, createWriteStream(file));
      return;
    }
    throw new Error('too many redirects');
  } finally { clearTimeout(timer); }
}

/** Downloads a Douyin video into `dir`; returns the same shape as a yt-dlp download. */
export async function downloadDouyin(link, dir, signal) {
  const post = await parse(link.canonical, signal);
  if (post.kind && post.kind !== 'video') throw new GeminiError(422, failure.UNSUPPORTED_CONTENT);
  if (Number(post.duration_ms) > MAX_VIDEO_SECONDS * 1000) throw new GeminiError(422, 'That video is longer than 20 minutes. Pick a shorter one.');
  const file = path.join(dir, 'video.mp4'), silent = path.join(dir, 'silent.mp4');
  const overall = limited(signal, DOWNLOAD_SECONDS), checkSound = framesAvailable();
  const result = async from => ({ path: file, mimeType: 'video/mp4', size: (await stat(from)).size, creator: String(post.author?.nickname ?? '').slice(0, 80),
    caption: String(post.description ?? post.title ?? '').slice(0, 4000) });
  let keptSilent = false;
  for (const stream of choose(post.media).slice(0, 3)) {
    for (const url of stream.urls.slice(0, 3)) {
      try {
        await save(url, file, overall);
        if (!(await stat(file)).size) continue;
        // Some Douyin renditions carry no sound; the narration often holds the amounts, so another copy is tried first.
        if (!checkSound || await hasAudio(file)) return result(file);
        if (!keptSilent) { await rename(file, silent); keptSilent = true; }
        break;
      } catch (error) {
        if (signal?.aborted) throw error;
        logger.warn({ event: 'ai_recipes_douyin_fetch_failed', detail: String(error?.message ?? error).slice(0, 80) });
        await rm(file, { force: true }).catch(() => {});
        if (overall.aborted) throw new GeminiError(422, busy);
      }
    }
  }
  if (keptSilent) {
    logger.warn({ event: 'ai_recipes_douyin_without_sound' });
    await rename(silent, file);
    return result(file);
  }
  throw new GeminiError(422, choose(post.media).length ? busy : 'That video is too large to read. Try a shorter clip.');
}
