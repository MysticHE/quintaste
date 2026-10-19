import dns from 'node:dns/promises';
import net from 'node:net';
import { GeminiError } from './gemini.mjs';

/**
 * Turns a pasted link into something the model can watch. YouTube links go to Gemini by URL (nothing is downloaded).
 * TikTok, Instagram and Facebook posts are read from their public page to find the MP4, which is fetched inline
 * (20 MB cap). Any fetch is https-only, follows at most 5 redirects and refuses private addresses.
 */
export const MAX_BYTES = 20 * 1024 * 1024;
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const PAGE_HOSTS = /(^|\.)(tiktok\.com|instagram\.com|facebook\.com|fb\.watch|fb\.com)$/i;

export function parseLink(input) {
  let url;
  try { url = new URL(String(input ?? '').trim()); } catch { throw new GeminiError(400, 'Paste a full link, starting with https://.'); }
  if (url.protocol !== 'https:') throw new GeminiError(400, 'Only https links are accepted.');
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\.|^mobile\./, '');
  let id = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'music.youtube.com') {
    id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)?.[1] || null;
  }
  if (id !== null) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new GeminiError(400, 'That YouTube link has no video id.');
    return { platform: 'youtube', canonical: 'https://www.youtube.com/watch?v=' + id, fileUri: 'https://www.youtube.com/watch?v=' + id };
  }
  if (PAGE_HOSTS.test(host)) {
    const platform = /tiktok/.test(host) ? 'tiktok' : /instagram/.test(host) ? 'instagram' : 'facebook';
    url.search = ''; url.hash = '';
    return { platform, canonical: url.toString() };
  }
  if (/\.mp4(\?|$)/i.test(url.pathname + url.search)) return { platform: 'direct', canonical: url.toString(), media: url.toString() };
  throw new GeminiError(400, 'Paste a YouTube, TikTok, Instagram or Facebook video link.');
}

async function publicAddress(hostname) {
  const { address } = await dns.lookup(hostname).catch(() => { throw new GeminiError(400, 'That link could not be resolved.'); });
  const v4 = net.isIPv4(address) ? address : address.startsWith('::ffff:') ? address.slice(7) : null;
  if (v4) {
    const [a, b] = v4.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a >= 224) throw new GeminiError(400, 'That link is not public.');
  } else if (/^(::1$|fc|fd|fe80)/i.test(address)) throw new GeminiError(400, 'That link is not public.');
}

async function fetchPublic(url, { accept, limit, signal, referer = null }) {
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const target = new URL(current);
    if (target.protocol !== 'https:') throw new GeminiError(400, 'Only https links are accepted.');
    await publicAddress(target.hostname);
    const response = await fetch(target, { redirect: 'manual', signal, headers: { 'user-agent': UA, accept, ...(referer ? { referer } : {}), 'accept-language': 'en-SG,en;q=0.9' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get('location');
      if (!next) throw new GeminiError(502, 'The platform redirected without a destination.');
      current = new URL(next, target).toString();
      continue;
    }
    if (!response.ok) throw new GeminiError(502, `The platform answered ${response.status}; the post may be private or removed.`);
    const length = Number(response.headers.get('content-length') || 0);
    if (length > limit) throw new GeminiError(413, 'That video is larger than 20 MB. Try a shorter clip or YouTube.');
    const chunks = []; let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > limit) throw new GeminiError(413, 'That video is larger than 20 MB. Try a shorter clip or YouTube.');
      chunks.push(chunk);
    }
    return { url: target.toString(), type: response.headers.get('content-type') || '', bytes: Buffer.concat(chunks) };
  }
  throw new GeminiError(502, 'Too many redirects.');
}

const unescape = s => s.replace(/\\u002F/g, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&');
/** Finds the MP4 address in a platform page: TikTok's rehydration data, Instagram's and Facebook's embedded media JSON. */
function mediaFromPage(html, platform) {
  const patterns = platform === 'tiktok'
    ? [/"playAddr":"([^"]+)"/, /"downloadAddr":"([^"]+)"/]
    : platform === 'instagram'
      ? [/"video_url":"([^"]+)"/, /<meta property="og:video" content="([^"]+)"/, /"contentUrl":"([^"]+\.mp4[^"]*)"/]
      : [/"playable_url_quality_hd":"([^"]+)"/, /"playable_url":"([^"]+)"/, /"browser_native_hd_url":"([^"]+)"/, /"browser_native_sd_url":"([^"]+)"/, /<meta property="og:video(?::url)?" content="([^"]+)"/];
  for (const pattern of patterns) {
    const hit = pattern.exec(html);
    if (hit?.[1]) return unescape(hit[1]);
  }
  return null;
}

/** The model input for a link: a YouTube file_data part, or inline MP4 bytes fetched from the platform. */
export async function loadVideo(link, signal) {
  if (link.platform === 'youtube') return { part: { file_data: { file_uri: link.fileUri } }, bytes: 0 };
  let media = link.media;
  if (!media) {
    const page = await fetchPublic(link.canonical, { accept: 'text/html,application/xhtml+xml', limit: 6 * 1024 * 1024, signal });
    media = mediaFromPage(page.bytes.toString('utf8'), link.platform);
    if (!media) throw new GeminiError(422, 'The platform did not expose this video publicly. Save the video and share the file instead, or use a YouTube link.');
  }
  const file = await fetchPublic(media, { accept: 'video/mp4,video/*;q=0.9,*/*;q=0.5', limit: MAX_BYTES, signal, referer: link.canonical });
  const type = /video\/(mp4|quicktime|webm)/.exec(file.type)?.[0] ?? (file.bytes.subarray(4, 8).toString() === 'ftyp' ? 'video/mp4' : null);
  if (!type) throw new GeminiError(422, 'The platform returned something other than a video.');
  return { part: { inline_data: { mime_type: type === 'video/quicktime' ? 'video/mov' : type, data: file.bytes.toString('base64') } }, bytes: file.bytes.length };
}
