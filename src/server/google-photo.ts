import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { LivePlace } from "../types/discovery";
import { reserveGoogleRequest } from "./google-allowance";
import { object, placesKey } from "./google-provider";
import { developmentPhoto as parseDevelopmentPhoto, type DevelopmentPhoto } from "./development-photo-credits";
import { developmentPhotoStorageEnabled, readDevelopmentPhoto, saveDevelopmentPhoto, type PhotoImage } from "./development-photo-cache";

const photoPattern = /^places\/[A-Za-z0-9_-]{10,200}\/photos\/[A-Za-z0-9_-]{10,2400}$/;
const lifetime = 5 * 60 * 1000;
function signature(payload: string) { return createHmac("sha256", placesKey()).update("quintaste-photo-v1:" + payload).digest("base64url"); }
function assetHash(name: string) { return createHash("sha256").update(name).digest("hex"); }
export function photoUrl(name: string, now: number, development?: DevelopmentPhoto) {
  if (!photoPattern.test(name)) return;
  const bytes = Buffer.from(JSON.stringify({ name, expires: now + lifetime, development }));
  let payload = bytes.toString("base64url");
  if (payload.length > 3900 && development) payload = deflateRawSync(bytes).toString("base64url");
  if (payload.length > 3900) return;
  return "/api/place-photo?token=" + payload + "." + signature(payload);
}
export function photoRequest(token: string, now: number) {
  if (token.length > 4000 || !/^[A-Za-z0-9_.-]+$/.test(token)) return;
  const [payload, digest, extra] = token.split(".");
  if (!payload || !digest || extra) return;
  const expected = Buffer.from(signature(payload)), received = Buffer.from(digest);
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) return;
  try {
    const bytes = Buffer.from(payload, "base64url");
    let value: unknown;
    try { value = JSON.parse(bytes.toString()); }
    catch { value = JSON.parse(inflateRawSync(bytes, { maxOutputLength: 65536 }).toString()); }
    if (!object(value) || typeof value.name !== "string" || !photoPattern.test(value.name)
      || typeof value.expires !== "number" || !Number.isFinite(value.expires) || value.expires <= now || value.expires > now + lifetime) return;
    const development = value.development === undefined ? undefined : parseDevelopmentPhoto(value.development, value.name);
    if (value.development !== undefined && !development) return;
    return { name: value.name, development };
  } catch { return; }
}

async function downloadPhoto(name: string) {
  await reserveGoogleRequest("placePhotos");
  const response = await fetch("https://places.googleapis.com/v1/" + name + "/media?maxWidthPx=800&skipHttpRedirect=true", {
    headers: { "X-Goog-Api-Key": placesKey() }, signal: AbortSignal.timeout(15000), redirect: "error",
  });
  if (!response.ok) throw new Error("Photo unavailable.");
  const body: unknown = await response.json();
  if (!object(body) || typeof body.photoUri !== "string") throw new Error("Invalid photo response.");
  const url = new URL(body.photoUri);
  if (url.protocol !== "https:" || !/(^|\.)googleusercontent\.com$/.test(url.hostname) || url.username || url.password) throw new Error("Invalid photo host.");
  const image = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "error" });
  const type = image.headers.get("content-type")?.split(";")[0] ?? "";
  if (!image.ok || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type) || !image.body) throw new Error("Photo unavailable.");
  const reader = image.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 8 * 1024 * 1024) throw new Error("Photo too large."); chunks.push(value); }
  } finally { await reader.cancel(); reader.releaseLock(); }
  return { bytes: Buffer.concat(chunks), type };
}

const pending = new Map<string, Promise<PhotoImage>>();
export async function requestPhoto(name: string, development?: DevelopmentPhoto) {
  if (development && !await developmentPhotoStorageEnabled()) throw new Error("Refresh this place to load its photo.");
  const identity = development?.identity ?? name, saved = await readDevelopmentPhoto(identity);
  if (saved && (!development || saved.assetHash === development.assetHash)) return saved;
  if (development?.snapshot) throw new Error("Refresh this place to load its photo.");
  let task = pending.get(name);
  if (!task) {
    task = downloadPhoto(name).then(async image => {
      await saveDevelopmentPhoto(identity, image, development ? { photo: development.photo, assetHash: development.assetHash } : undefined);
      return image;
    }).finally(() => { pending.delete(name); });
    pending.set(name, task);
  }
  return task;
}
export async function developmentPhotoSnapshots(places: LivePlace[]): Promise<LivePlace[]> {
  if (!await developmentPhotoStorageEnabled()) return places;
  return Promise.all(places.map(async place => ({
    ...place,
    photos: await Promise.all(place.photos.map(async (photo, index) => {
      const request = photoRequest(new URL(photo.url, "http://localhost").searchParams.get("token") ?? "", Date.now());
      if (!request) return photo;
      const identity = "place/" + place.placeId + "/photos/" + index, saved = await readDevelopmentPhoto(identity);
      const snapshot = !!saved?.photo && !!saved.assetHash;
      const development: DevelopmentPhoto = { identity, assetHash: snapshot ? saved.assetHash! : assetHash(request.name), snapshot,
        photo: snapshot ? saved.photo! : { authors: photo.authors, sourceUri: photo.sourceUri } };
      const url = photoUrl(request.name, place.fetchedAt, development);
      return url ? { ...development.photo, url } : photo;
    })),
  })));
}
