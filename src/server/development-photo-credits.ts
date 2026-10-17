import type { PhotoAuthor } from "../types/discovery";
import { object, safeHttps } from "./google-provider";

export type PhotoCredits = { authors: PhotoAuthor[]; sourceUri?: string };
export type DevelopmentPhoto = { identity: string; assetHash: string; snapshot: boolean; photo: PhotoCredits };
export function photoCredits(value: unknown): PhotoCredits | undefined {
  if (!object(value) || !Array.isArray(value.authors) || value.authors.length > 10) return;
  const authors: PhotoAuthor[] = [];
  for (const author of value.authors) {
    if (!object(author) || typeof author.name !== "string" || author.name.length > 200) return;
    if (author.uri !== undefined && !safeHttps(author.uri) || author.photoUri !== undefined && !safeHttps(author.photoUri)) return;
    authors.push({ name: author.name, uri: safeHttps(author.uri), photoUri: safeHttps(author.photoUri) });
  }
  if (value.sourceUri !== undefined && !safeHttps(value.sourceUri)) return;
  return { authors, sourceUri: safeHttps(value.sourceUri) };
}
export function developmentPhoto(value: unknown, name: string): DevelopmentPhoto | undefined {
  if (!object(value) || typeof value.identity !== "string" || typeof value.assetHash !== "string"
    || !/^[a-f0-9]{64}$/.test(value.assetHash) || typeof value.snapshot !== "boolean"
    || !/^place\/[A-Za-z0-9_-]{10,200}\/photos\/[0-2]$/.test(value.identity)
    || value.identity.split("/")[1] !== name.split("/")[1]) return;
  const photo = photoCredits(value.photo);
  if (photo) return { identity: value.identity, assetHash: value.assetHash, snapshot: value.snapshot, photo };
}
