import { createReadStream, existsSync } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { logger } from '../config.mjs';
import { GeminiError, generate } from './gemini.mjs';
import { recipeSchema, verifyPrompt, verifySystem, videoPrompt, videoSystem } from './prompts.mjs';
import { loadVideo, parseLink } from './video.mjs';
import { deleteFile, storeFile } from './files.mjs';
import { canDownload, downloadVideo } from './download.mjs';
import { framesAvailable } from './frames.mjs';
import { framesFor } from './photos.mjs';
import { clip, parseUpload, toRecipe } from './recipe.mjs';
import { jobDir, removeDir, uploadPath } from './work.mjs';

/**
 * A video job: get the video (member upload, yt-dlp download, or YouTube by link), write the recipe, check it against
 * the whole video a second time, then choose the video frame for every step the server has the file for. The frames are
 * only references: QT Gamer makes every step's published picture after saving (drawings.mjs). `progress` updates the
 * member's request card.
 */

async function youtubeDetails(link) {
  try {
    const response = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(link.canonical), { redirect: 'error', signal: AbortSignal.timeout(10000) });
    const info = /** @type {{ author_name?: string, title?: string }} */ (response.ok ? await response.json() : {});
    return { creator: clip(info.author_name, 80), caption: clip(info.title, 300) };
  } catch { return { creator: '', caption: '' }; }
}

/** The job's video: a member upload, a download into `dir`, or (YouTube, or no downloader) the link alone. */
export async function obtain(job, dir, signal, progress) {
  const upload = parseUpload(job.input);
  if (upload) {
    let link = null;
    try { link = upload.link ? parseLink(upload.link) : null; } catch { link = null; }
    const file = uploadPath(upload.name);
    if (!file) throw new GeminiError(422, 'This upload came from an older version of the app. Upload the video again.');
    if (!existsSync(file)) throw new GeminiError(410, 'The uploaded video is no longer on the server. Upload it again.');
    return { link, local: { path: file, mimeType: upload.mimeType, size: (await stat(file)).size }, creator: '', caption: '', upload: file };
  }
  const link = parseLink(job.input);
  if (link.platform === 'youtube') return { link, local: null, ...await youtubeDetails(link) };
  if (!canDownload(link)) return { link, local: null, inline: await loadVideo(link, signal), creator: '', caption: '' };
  await progress('Downloading the video…');
  const download = await downloadVideo(link, dir, signal);
  return { link, local: download, creator: download.creator, caption: download.caption };
}

export async function fromVideo(job, signal, usage, progress) {
  const dir = await jobDir(job.id);
  let stored = null, upload = null;
  try {
    const got = await obtain(job, dir, signal, progress);
    upload = got.upload ?? null;
    let part;
    if (got.local) {
      await progress('Sending the video to the AI…');
      usage.bytes = got.local.size;
      stored = await storeFile({ body: createReadStream(got.local.path), size: got.local.size, mimeType: got.local.mimeType, displayName: 'recipe-video', signal });
      part = { file_data: { file_uri: stored.uri, mime_type: stored.mimeType } };
    } else if (got.inline) { part = got.inline.part; usage.bytes = got.inline.bytes; }
    else part = { file_data: { file_uri: got.link.fileUri } };
    const context = (got.caption ? "\n\nThe creator's caption (it may hold the written recipe; use it together with the video):\n" + got.caption : '')
      + (got.creator ? '\nCreator: ' + got.creator : '');
    await progress('Writing the recipe…');
    const draft = await generate({ parts: [part, { text: videoPrompt + context }], schema: recipeSchema, system: videoSystem, signal });
    usage.calls.push(draft.usage);
    let checked = draft.data;
    await progress('Checking every step against the video…');
    try {
      const verified = await generate({ parts: [part, { text: verifyPrompt(draft.data) + context }], schema: recipeSchema, system: verifySystem, signal });
      usage.calls.push(verified.usage);
      if (verified.data?.isRecipe !== false && verified.data?.steps?.length) checked = verified.data;
    } catch (error) { logger.warn({ event: 'ai_recipes_verify_failed', detail: String(error?.message ?? error).slice(0, 160) }); }
    const recipe = toRecipe(checked, { source: { kind: 'video', platform: got.link?.platform ?? 'upload', ...(got.link ? { url: got.link.canonical } : {}),
      // The platform's own channel or uploader name wins over the model's reading of the video.
      creator: clip(got.creator || checked.creator, 80) } });
    await progress('Choosing a photo for each step…');
    // The frames are references for QT Gamer's clean pictures, made once the recipe is saved (drawings.mjs).
    let photos = null;
    try {
      if (got.local && framesAvailable()) photos = await framesFor(got.local.path, recipe, usage);
    } catch (error) { logger.warn({ event: 'ai_recipes_frames_failed', detail: String(error?.message ?? error).slice(0, 160) }); }
    return { recipe, photos };
  } finally {
    if (stored) await deleteFile(stored.name);
    await removeDir(dir);
    if (upload) await rm(upload, { force: true }).catch(() => {});
  }
}
