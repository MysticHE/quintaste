import { caseTopics, localPhotoLimit } from "../../config/explore-local";
import type { CaseDraft } from "../../types/explore-local";
import { LocalServiceError } from "./store";
import { caseContentProblem, readMenuChange } from "../../utils/menu-correction";

export const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function text(value: unknown, maximum: number, required = true) {
  if (typeof value !== "string" || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || required && !value.trim())
    throw new LocalServiceError(400, "Check the submitted information.");
  return value.trim();
}
export function photoData(value: unknown) {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || value.length > 700000) throw new LocalServiceError(413, "Choose a smaller photo.");
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new LocalServiceError(400, "Choose a JPEG, PNG or WebP photo.");
  const data = Buffer.from(match[2], "base64");
  if (data.length > localPhotoLimit || data.toString("base64") !== match[2]) throw new LocalServiceError(413, "Choose a smaller photo.");
  const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255;
  const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
  if (!(match[1] === "jpeg" && jpeg || match[1] === "png" && png || match[1] === "webp" && webp))
    throw new LocalServiceError(400, "This photo could not be read.");
  return value;
}
export function caseDraft(value: unknown): CaseDraft {
  if (!object(value) || value.kind !== "correction" && value.kind !== "report") throw new LocalServiceError(400, "Choose a correction or report.");
  const kind = value.kind as CaseDraft["kind"], category = text(value.category, 40);
  if (!caseTopics(kind).some(topic => topic === category)) throw new LocalServiceError(400, "Choose a topic.");
  const id = text(value.id, 100), placeId = text(value.placeId, 200), observedOn = text(value.observedOn, 10);
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(id) || !/^[A-Za-z0-9_-]{10,200}$/.test(placeId)
    || !/^\d{4}-\d{2}-\d{2}$/.test(observedOn) || !Number.isFinite(Date.parse(observedOn))
    || new Date(observedOn).toISOString().slice(0, 10) !== observedOn || observedOn > new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10))
    throw new LocalServiceError(400, "Check the place and observation date.");
  const now = Date.now(), details = text(value.details, 2000, false);
  const menuChange = kind === "correction" && category === "Menu" ? readMenuChange(value.menuChange) : undefined;
  const menuVenueId = value.menuVenueId === undefined ? undefined : text(value.menuVenueId, 120);
  if (menuVenueId && !/^[a-z0-9][a-z0-9-]{2,119}$/.test(menuVenueId)
    || menuVenueId && menuChange?.venueId && menuVenueId !== menuChange.venueId)
    throw new LocalServiceError(400, "Check the menu branch.");
  if (value.menuChange !== undefined && (!menuChange || category !== "Menu" || kind !== "correction"))
    throw new LocalServiceError(400, "Check the menu change.");
  const problem = caseContentProblem({ kind, category, details, menuChange });
  if (problem) throw new LocalServiceError(400, problem);
  return { id, placeId, target: text(value.target, 300), kind, category,
    details, source: text(value.source ?? "", 300, false), observedOn, menuChange, menuVenueId,
    photoUri: photoData(value.photoUri), createdAt: now, updatedAt: now, delivery: "draft" };
}
