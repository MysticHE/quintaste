import sharp from "sharp";
import { Buffer } from 'node:buffer';
import { AvatarError } from "./config.mjs";
const photoLimit = 4 * 1024 * 1024;
export async function normalizeSelfie(value) {
  if (typeof value !== "string" || value.length > Math.ceil(photoLimit * 4 / 3) + 64) throw new AvatarError(413, "Choose a photo under 4 MB.");
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) throw new AvatarError(400, "Choose a JPEG, PNG or WebP photo.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > photoLimit || bytes.toString("base64") !== match[2]) throw new AvatarError(400, "The photo could not be read.");
  try {
    const input = sharp(bytes, { limitInputPixels: 25000000, failOn: "warning", animated: false });
    const info = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(info.format || "") || (info.pages || 1) > 1 || !info.width || !info.height || Math.min(info.width, info.height) < 128) throw new Error("invalid");
    return await input.rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  } catch { throw new AvatarError(400, "Choose a readable, still photo between 128 pixels and 25 megapixels."); }
  finally { bytes.fill(0); }
}
export async function avatarFrame(bytes) {
  try {
    const image = sharp(bytes, { limitInputPixels: 5000000, failOn: "warning", animated: false });
    const info = await image.metadata();
    if (!["png", "webp"].includes(info.format || "") || (info.pages || 1) > 1 || !info.width || info.width !== info.height || !info.hasAlpha) throw new Error("invalid");
    const stats = await image.stats();
    if (stats.isOpaque) throw new Error("missing transparency");
    const result = await image.resize(768, 768).webp({ quality: 82, effort: 4 }).toBuffer();
    if (result.length > 160000) throw new Error("oversize");
    return { bytes: result, uri: "data:image/webp;base64," + result.toString("base64") };
  } catch { throw new AvatarError(502, "The generated frame could not be used. Your saved avatar is unchanged."); }
}
