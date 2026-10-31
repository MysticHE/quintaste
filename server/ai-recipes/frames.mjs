import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

/**
 * Still frames from a local video with ffmpeg (Debian package in the app image), run without a shell. Frames are
 * returned as JPEG bytes; `photoJpeg` makes the stored version (stripped metadata, bounded size) and `previewJpeg` the
 * small copy the reviewing model looks at.
 */
const FFMPEG = process.env.FFMPEG_BIN || '/usr/bin/ffmpeg', FFPROBE = process.env.FFPROBE_BIN || '/usr/bin/ffprobe';
export const framesAvailable = () => existsSync(FFMPEG) && existsSync(FFPROBE);

function run(bin, args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let size = 0;
    child.stdout.on('data', chunk => { size += chunk.length; if (size <= 8 * 1024 * 1024) chunks.push(chunk); });
    child.stderr.resume();
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, out: Buffer.concat(chunks) }); });
  });
}

/**
 * An MP4 copy the QT bots can send to their model (Hermes reads mp4, webm and mov and caps a video at about 37 MB):
 * 480 pixels high, 24 frames a second, mono audio. Returns the output path, or null when ffmpeg failed.
 */
export async function shrinkVideo(input, output) {
  const { code } = await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vf', 'scale=-2:min(480\\,ih),fps=24',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-c:a', 'aac', '-ac', '1', '-b:a', '64k', '-movflags', '+faststart', output], 300000);
  return code === 0 ? output : null;
}

/** Length of the video in seconds, or 0 when unknown. */
export async function videoSeconds(file) {
  const { out } = await run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const seconds = Number(String(out).trim());
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

/** One frame at `seconds` as JPEG bytes, or null when the video has no frame there. */
export async function frameAt(file, seconds) {
  const at = Math.max(0, Number(seconds) || 0).toFixed(2);
  const { code, out } = await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', at, '-i', file, '-frames:v', '1',
    '-vf', 'scale=min(1280\\,iw):-2', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-q:v', '3', 'pipe:1']);
  return code === 0 && out.length > 1000 ? out : null;
}

/** The stored photo: JPEG, longest edge 1280, metadata stripped, under the 600 KB the photo table accepts. */
export async function photoJpeg(input) {
  for (const quality of [80, 70, 60]) {
    const bytes = await sharp(input, { failOn: 'error' }).resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true }).toBuffer();
    if (bytes.length <= 590000) return bytes;
  }
  return null;
}

/** An AI-recipe step picture at the app's one mobile size: 4:3, 1200 x 900, centre-cropped (owner, 31 Oct 2026). */
export async function stepJpeg(input) {
  for (const quality of [82, 74, 66]) {
    const bytes = await sharp(input, { failOn: 'error' }).resize({ width: 1200, height: 900, fit: 'cover' }).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (bytes.length <= 590000) return bytes;
  }
  return null;
}

/** A small copy for the reviewing model (fewer tokens, same content). */
export const previewJpeg = input => sharp(input, { failOn: 'error' }).resize({ width: 512, height: 512, fit: 'inside' }).jpeg({ quality: 70 }).toBuffer();
