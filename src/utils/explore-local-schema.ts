import { areas } from "../data/areas";
import { readMenuChange } from "./menu-correction";
import { caseStatuses, caseTopics, participationAudiences, participationCategories } from "../config/explore-local";
import { emptyExploreLocal, type CaseDraft, type CaseReceipt, type AreaParticipation, type ExploreLocalDocument, type ParticipationSnapshot } from "../types/explore-local";

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, maximum: number) => typeof value === "string" && value.length <= maximum ? value : "";
const time = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
const unique = <T>(values: T[], key: (value: T) => string) => [...new Map(values.map(value => [key(value), value])).values()];
export function readCaseDraft(value: unknown): CaseDraft | null {
  const v = record(value);
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(String(v.id)) || !/^[A-Za-z0-9_-]{10,200}$/.test(String(v.placeId))
    || v.kind !== "correction" && v.kind !== "report" || !text(v.target, 300)) return null;
  if (v.menuChange !== undefined && !readMenuChange(v.menuChange)) return null;
  return { id: String(v.id), placeId: String(v.placeId), target: String(v.target), kind: v.kind,
    category: caseTopics(v.kind).some(topic => topic === v.category) ? String(v.category) : caseTopics(v.kind)[0],
    details: text(v.details, 2000), source: text(v.source, 300), observedOn: text(v.observedOn, 10),
    menuChange: v.kind === "correction" && v.category === "Menu" ? readMenuChange(v.menuChange) : undefined,
    menuVenueId: typeof v.menuVenueId === "string" && /^[a-z0-9][a-z0-9-]{2,119}$/.test(v.menuVenueId) ? v.menuVenueId : undefined,
    photoUri: typeof v.photoUri === "string" && v.photoUri.length <= 700000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v.photoUri) ? v.photoUri : undefined,
    createdAt: time(v.createdAt), updatedAt: time(v.updatedAt), delivery: v.delivery === "queued" ? "queued" : "draft" };
}
export function readCaseReceipt(value: unknown): CaseReceipt | null {
  const v = record(value), draft = readCaseDraft(v);
  if (!draft || !/^[a-f0-9]{24}$/.test(String(v.caseId)) || !/^QT-L-[A-F0-9]{10}$/.test(String(v.reference))
    || !caseStatuses.some(status => status === v.status) || !Number.isInteger(v.revision) || Number(v.revision) < 1
    || !Array.isArray(v.history) || v.history.length > 30) return null;
  const history = v.history.map(record);
  if (history.some(event => !caseStatuses.some(status => status === event.status) || typeof event.reason !== "string" || event.reason.length > 2000 || !time(event.at))) return null;
  const { delivery: _delivery, photoUri: _photo, ...base } = draft;
  return { ...base, caseId: String(v.caseId), reference: String(v.reference), status: v.status as CaseReceipt["status"],
    reason: text(v.reason, 1000), revision: Number(v.revision), history: history as CaseReceipt["history"],
    hasPhoto: v.hasPhoto === true, reviewer: text(v.reviewer, 100) };
}
function readLayer(value: unknown, layer: "home" | "work"): AreaParticipation | null {
  const v = record(value);
  if (v.layer !== layer || !areas.some(area => area.id === v.areaId && area.id !== "singapore")
    || !participationCategories.some(item => item === v.category) || !participationAudiences.some(item => item === v.audience)) return null;
  return { layer, areaId: String(v.areaId), category: v.category as AreaParticipation["category"], audience: v.audience as AreaParticipation["audience"], joinedAt: time(v.joinedAt) };
}
export function readParticipation(value: unknown): ParticipationSnapshot | null {
  const v = record(value);
  if (v.mode !== "local-development" || !time(v.snapshotAt) || v.home !== null && !readLayer(v.home, "home")
    || v.work !== null && !readLayer(v.work, "work")) return null;
  return { home: readLayer(v.home, "home"), work: readLayer(v.work, "work"), snapshotAt: Number(v.snapshotAt), mode: "local-development",
    counts: [{ layer: "home", count: null, suppressed: true }, { layer: "work", count: null, suppressed: true }] };
}
export function readExploreLocal(value: unknown): ExploreLocalDocument {
  const v = record(value), list = (value: unknown) => Array.isArray(value) ? value.slice(0, 100) : [];
  return { ...emptyExploreLocal(),
    drafts: unique(list(v.drafts).map(readCaseDraft).filter((item): item is CaseDraft => !!item), item => item.id),
    receipts: unique(list(v.receipts).map(readCaseReceipt).filter((item): item is CaseReceipt => !!item), item => item.caseId),
    labels: Object.fromEntries(Object.entries(record(v.labels)).filter(([id, label]) => /^(?:google-[A-Za-z0-9_-]{10,200}|catalogue-[a-z0-9-]{3,120})$/.test(id) && !!text(label, 80).trim()).slice(0, 500).map(([id, label]) => [id, String(label).trim()])),
    participation: readParticipation(v.participation),
    pendingWithdrawals: ["home", "work"].filter(item => Array.isArray(v.pendingWithdrawals) && v.pendingWithdrawals.includes(item)) as ("home" | "work")[] };
}
export class ExploreCapacityError extends Error {}
export function mergeExploreLocal(profile: ExploreLocalDocument, guest: ExploreLocalDocument) {
  if (new Set([...profile.drafts, ...guest.drafts].map(item => item.id)).size > 100)
    throw new ExploreCapacityError("The combined place drafts exceed 100. Remove a draft before copying.");
  const labels = { ...guest.labels, ...profile.labels };
  if (Object.keys(labels).length > 500)
    throw new ExploreCapacityError("The combined private labels exceed 500. Remove a label before copying.");
  const drafts = unique<CaseDraft>([...guest.drafts.map(item => ({ ...item, delivery: "draft" as const })), ...profile.drafts], item => item.id);
  return readExploreLocal({ ...profile, labels, drafts });
}
