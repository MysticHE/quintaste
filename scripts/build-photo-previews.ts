import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";
import photos from "../data/menus/catalogue-photos.json";

/**
 * ThumbHash previews (about 25 bytes each) for the packaged catalogue photos, keyed by the photo's SHA-256. The catalogue API adds
 * them to each photo after the editorial and staff overlays are applied, so the catalogue index (and the bot overlays tied to its
 * exact venue hashes) stays unchanged. Rerun with --write after adding photos; --check fails when the file is stale.
 */
async function preview(bytes: Buffer) {
  const { data, info } = await sharp(bytes).resize(100, 100, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return Buffer.from(rgbaToThumbHash(info.width, info.height, data)).toString("base64");
}
async function main() {
  const previews: Record<string, string> = {};
  // Photos that came from Google Maps get no derived preview (no stored derivatives of Google content).
  const google = new Set(photos.entries.filter(entry => (entry.photo as { provider?: string }).provider === "Google Maps").map(entry => entry.sha256));
  for (const sha of [...new Set(photos.entries.map(entry => entry.sha256))].filter(sha => !google.has(sha)).sort()) {
    if (!/^[a-f0-9]{64}$/.test(sha)) throw new Error("Invalid photo hash");
    const bytes = await readFile(`server-assets/catalogue/${sha}.jpg`);
    if (createHash("sha256").update(bytes).digest("hex") !== sha) throw new Error("Photo asset integrity mismatch");
    previews[sha] = await preview(bytes);
  }
  const data = JSON.stringify({ version: 1, previews }, null, 1) + "\n", file = "data/menus/catalogue-photo-previews.json";
  if (process.argv[2] === "--check") {
    if (await readFile(file, "utf8").catch(() => "") !== data) throw new Error("Photo previews need regeneration after photo changes");
  } else if (process.argv[2] === "--write") await writeFile(file, data, "utf8");
  else throw new Error("Use --write or --check");
  console.log(JSON.stringify({ action: process.argv[2], photos: Object.keys(previews).length, bytes: Buffer.byteLength(data) }));
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
