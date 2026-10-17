import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { photoCredits, type PhotoCredits } from "./development-photo-credits";

export type PhotoImage = { bytes: Buffer; type: string; photo?: PhotoCredits; assetHash?: string };
export type PhotoSnapshot = { photo: PhotoCredits; assetHash: string };
const lifetime = 24 * 60 * 60 * 1000, maxImage = 5 * 1024 * 1024, maxStorage = 64 * 1024 * 1024;
const maxHeader = 65536;
const types = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const filename = /^[a-f0-9]{64}\.image$/;
let writes: Promise<void> = Promise.resolve(), warned = false;

function warn() {
  if (!warned) { warned = true; process.emitWarning("Development photo storage is unavailable; live photos will load directly."); }
}
async function cacheRoot() {
  if (process.env.NODE_ENV !== "development") return;
  try {
    const config: unknown = JSON.parse(await readFile(resolve(process.cwd(), ".local/places-allowance.json"), "utf8"));
    if (config && typeof config === "object" && "developmentPhotoCache" in config && config.developmentPhotoCache === true)
      return resolve(process.cwd(), ".local/dev-place-photos");
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") warn(); }
}
export async function developmentPhotoStorageEnabled() { return !!await cacheRoot(); }
function photoKey(name: string) { return createHash("sha256").update(name + "|maxWidthPx=800").digest("hex") + ".image"; }
async function discard(path: string) {
  try { await unlink(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}
export async function readDevelopmentPhoto(name: string): Promise<PhotoImage | undefined> {
  const root = await cacheRoot();
  if (!root) return;
  const path = resolve(root, photoKey(name));
  try {
    const info = await stat(path);
    if (!info.size || info.size > maxImage + maxHeader) { await discard(path); return; }
    const data = await readFile(path), end = data.indexOf(10);
    if (end < 1 || end >= maxHeader) { await discard(path); return; }
    const header: unknown = JSON.parse(data.subarray(0, end).toString("utf8"));
    if (!header || typeof header !== "object" || !("savedAt" in header) || !("type" in header)
      || typeof header.savedAt !== "number" || !Number.isFinite(header.savedAt) || header.savedAt > Date.now() + 30000
      || Date.now() - header.savedAt >= lifetime || typeof header.type !== "string" || !types.has(header.type)
      || data.length <= end + 1 || data.length - end - 1 > maxImage) {
      await discard(path); return;
    }
    const credits = "photo" in header ? photoCredits(header.photo) : undefined;
    const assetHash = "assetHash" in header && typeof header.assetHash === "string" && /^[a-f0-9]{64}$/.test(header.assetHash) ? header.assetHash : undefined;
    if ("photo" in header && (!credits || !assetHash)) { await discard(path); return; }
    return { bytes: data.subarray(end + 1), type: header.type, ...(credits ? { photo: credits, assetHash } : {}) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") { warn(); await discard(path).catch(warn); }
  }
}
async function prune(root: string, required: number) {
  const entries = await readdir(root, { withFileTypes: true });
  const temporary = /^[a-f0-9]{64}\.image\.[a-f0-9-]{36}\.tmp$/;
  const files = await Promise.all(entries.filter(item => item.isFile() && (filename.test(item.name) || temporary.test(item.name)))
    .map(async item => { const path = resolve(root, item.name); return { path, temporary: temporary.test(item.name), ...await stat(path) }; }));
  files.sort((a, b) => a.mtimeMs - b.mtimeMs);
  let size = files.reduce((sum, item) => sum + item.size, 0), count = files.filter(item => !item.temporary).length;
  for (const item of files) {
    if (!item.temporary || Date.now() - item.mtimeMs < 60000) continue;
    await discard(item.path); size -= item.size;
  }
  for (const item of files) {
    if (item.temporary) continue;
    if (Date.now() - item.mtimeMs < lifetime && size + required <= maxStorage && count < 100) continue;
    await discard(item.path); size -= item.size; count -= 1;
  }
  if (size + required > maxStorage) throw new Error("Development photo storage is busy.");
}
async function persist(root: string, name: string, image: PhotoImage, snapshot?: PhotoSnapshot) {
  await mkdir(root, { recursive: true });
  const key = photoKey(name), path = resolve(root, key), temp = resolve(root, key + "." + randomUUID() + ".tmp");
  const header = Buffer.from(JSON.stringify({ type: image.type, savedAt: Date.now(), ...snapshot }) + "\n");
  if (header.length > maxHeader) return;
  const data = Buffer.concat([header, image.bytes]);
  await prune(root, data.length);
  try { await writeFile(temp, data, { flag: "wx" }); await rename(temp, path); }
  finally { await discard(temp); }
}
export async function saveDevelopmentPhoto(name: string, image: PhotoImage, snapshot?: PhotoSnapshot) {
  const root = await cacheRoot();
  if (!root || !types.has(image.type) || !image.bytes.length || image.bytes.length > maxImage) return;
  const task = writes.then(() => persist(root, name, image, snapshot));
  writes = task.catch(warn);
  await writes;
}
