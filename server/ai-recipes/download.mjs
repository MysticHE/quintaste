import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { logger } from '../config.mjs';
import { GeminiError } from './gemini.mjs';
import { VIDEO_TYPES, storeFile } from './files.mjs';

/**
 * Downloads a public TikTok, Instagram or Facebook video with yt-dlp (pinned release in the app image, run without
 * a shell, config files, cache or cookies), uploads it to Gemini file storage and removes the local copy. The
 * caption and uploader come back too: captions often hold the written recipe and the credit.
 */
const BIN = process.env.YT_DLP_BIN || '/usr/local/bin/yt-dlp';
const MAX_SECONDS = 20 * 60;
export const downloaderAvailable = () => existsSync(BIN);

const blocked = {
  tiktok: 'TikTok does not let our server open its videos. Save the video on your phone, then tap Upload Video.',
  instagram: 'Instagram needs a signed-in account to open this video. Save it on your phone, then tap Upload Video.',
  facebook: 'Facebook would not open this video for our server. Save it on your phone, then tap Upload Video.',
};
function explain(stderr, platform) {
  if (/is longer than|does not pass filter|duration/i.test(stderr)) return 'That video is longer than 20 minutes. Pick a shorter one.';
  if (/larger than max-filesize|File is larger/i.test(stderr)) return 'That video is too large to read. Try a shorter clip.';
  if (/private|removed|not available|unavailable|404/i.test(stderr)) return 'That video is private, removed or not available in Singapore.';
  return blocked[platform] ?? 'We could not open that video. Save it on your phone, then tap Upload Video.';
}

function run(args, signal, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(BIN, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: '/usr/local/bin:/usr/bin:/bin', HOME: os.tmpdir(), LANG: 'C.UTF-8' } });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    child.stdout.resume();
    const kill = () => child.kill('SIGKILL');
    const timer = setTimeout(kill, timeoutMs);
    signal?.addEventListener('abort', kill, { once: true });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); signal?.removeEventListener('abort', kill); resolve({ code, stderr }); });
  });
}

/** Downloads `link` and stores it at Gemini; returns the stored file plus caption metadata. Always cleans up. */
export async function downloadToGemini(link, signal) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'qt-ai-'));
  try {
    // Downloads land on the 64 MB /tmp of the read-only app container, so they stay well under it; uploads stream straight through.
    const megabytes = 40;
    const { code, stderr } = await run(['--ignore-config', '--no-cache-dir', '--no-playlist', '--no-warnings', '--no-progress', '--no-part',
      '--socket-timeout', '20', '--retries', '2', '--max-filesize', megabytes + 'M', '--match-filter', 'duration <= ' + MAX_SECONDS,
      '-f', 'b[ext=mp4][height<=720]/b[ext=mp4]/b[height<=720]/b', '--write-info-json', '-o', path.join(dir, 'video.%(ext)s'), '--', link.canonical],
    signal, 180000);
    const files = await readdir(dir);
    const video = files.find(name => /^video\.(mp4|mov|webm|3gp|mkv)$/i.test(name));
    if (code !== 0 || !video) {
      logger.warn({ event: 'ai_recipes_download_failed', platform: link.platform, code, stderr: stderr.replace(/https?:\/\/\S+/g, '[url]').slice(-300) });
      throw new GeminiError(422, explain(stderr, link.platform));
    }
    const info = JSON.parse(await readFile(path.join(dir, 'video.info.json'), 'utf8').catch(() => '{}'));
    const ext = path.extname(video).slice(1).toLowerCase();
    const mimeType = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp', mkv: 'video/x-matroska' }[ext] ?? 'video/mp4';
    if (!VIDEO_TYPES.includes(mimeType)) throw new GeminiError(415, 'That video format cannot be read.');
    const file = path.join(dir, video), size = (await stat(file)).size;
    const stored = await storeFile({ body: createReadStream(file), size, mimeType, displayName: link.platform + '-video', signal });
    return { file: stored, bytes: size, creator: String(info.uploader ?? info.channel ?? '').slice(0, 80),
      caption: String(info.description ?? info.title ?? '').slice(0, 4000) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
