import { randomBytes, createHash } from "node:crypto";
import { caseStatuses } from "../../config/explore-local";
import type { CaseReceipt, CaseStatus } from "../../types/explore-local";
import { ownerIdentity } from "./http";
import { caseDraft, object } from "./validation";
import { withLocalStore, LocalServiceError, type StoredCase } from "./store";

export function caseReceipt(record: StoredCase): CaseReceipt {
  const { owner: _owner, fingerprint: _fingerprint, photoUri, ...receipt } = record;
  return { ...receipt, hasPhoto: !!photoUri };
}
export async function ownCases(request: Request) {
  return withLocalStore(store => {
    const owner = ownerIdentity(request, store);
    return Object.values(store.cases).filter(item => item.owner === owner).map(caseReceipt).sort((a, b) => b.updatedAt - a.updatedAt);
  }, false);
}
export async function submitCase(request: Request, value: unknown) {
  const draft = caseDraft(value);
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...draft, createdAt: 0, updatedAt: 0, delivery: "draft" })).digest("hex");
  return withLocalStore(store => {
    const owner = ownerIdentity(request, store), own = Object.values(store.cases).filter(item => item.owner === owner);
    const previous = own.find(item => item.id === draft.id);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new LocalServiceError(409, "This submission was already received. Refresh your cases.");
      return caseReceipt(previous);
    }
    if (own.length >= 100 || Object.keys(store.cases).length >= 2000) throw new LocalServiceError(507, "Local review is full.");
    const caseId = randomBytes(12).toString("hex"), reference = "QT-L-" + caseId.slice(0, 10).toUpperCase();
    const { delivery: _delivery, ...payload } = draft;
    const record: StoredCase = { ...payload, caseId, reference, owner, fingerprint, status: "submitted", reason: "",
      revision: 1, history: [{ status: "submitted", reason: "Received by local review", at: Date.now() }],
      hasPhoto: !!draft.photoUri, reviewer: "" };
    store.cases[caseId] = record;
    return caseReceipt(record);
  });
}
export async function caseDetails(request: Request, id: string) {
  return withLocalStore(store => {
    const owner = ownerIdentity(request, store), record = store.cases[id];
    if (!record || record.owner !== owner) throw new LocalServiceError(404, "Case unavailable.");
    return { ...caseReceipt(record), photoUri: record.photoUri };
  }, false);
}
export async function addInformation(request: Request, id: string, value: unknown) {
  if (!object(value) || typeof value.details !== "string" || value.details.trim().length < 3 || value.details.length > 2000
    || !Number.isInteger(value.revision)) throw new LocalServiceError(400, "Add the requested information.");
  const details = value.details.trim();
  return withLocalStore(store => {
    const owner = ownerIdentity(request, store), record = store.cases[id];
    if (!record || record.owner !== owner) throw new LocalServiceError(404, "Case unavailable.");
    if (record.status !== "needs-information" || record.revision !== value.revision) throw new LocalServiceError(409, "This case changed. Refresh before replying.");
    if (record.history.length >= 30) throw new LocalServiceError(409, "This case has reached its update limit.");
    record.status = "submitted"; record.reason = ""; record.revision++; record.updatedAt = Date.now();
    record.history.push({ status: "submitted", reason: details, at: record.updatedAt });
    return caseReceipt(record);
  });
}
export async function reviewCases() {
  return withLocalStore(store => Object.values(store.cases).map(caseReceipt).sort((a, b) =>
    Number(["Food safety", "Closed or moved"].includes(b.category)) - Number(["Food safety", "Closed or moved"].includes(a.category))
    || b.updatedAt - a.updatedAt), false);
}
export async function reviewCase(value: unknown) {
  if (!object(value) || typeof value.caseId !== "string" || typeof value.reason !== "string" || value.reason.trim().length < 3
    || value.reason.length > 1000 || !caseStatuses.some(status => status === value.status) || !Number.isInteger(value.revision))
    throw new LocalServiceError(400, "Choose a status and give a reason.");
  const reason = value.reason.trim();
  return withLocalStore(store => {
    const record = store.cases[value.caseId as string];
    if (!record) throw new LocalServiceError(404, "Case unavailable.");
    if (record.revision !== value.revision) throw new LocalServiceError(409, "This case changed. Refresh before reviewing.");
    if (record.history.length >= 30) throw new LocalServiceError(409, "This case has reached its update limit.");
    record.status = value.status as CaseStatus; record.reason = reason;
    record.reviewer = "Local reviewer"; record.revision++; record.updatedAt = Date.now();
    record.history.push({ status: record.status, reason: record.reason, at: record.updatedAt });
    return caseReceipt(record);
  });
}

export async function reviewCaseDetails(id: string) {
  return withLocalStore(store => {
    const record = /^[a-f0-9]{24}$/.test(id) ? store.cases[id] : undefined;
    if (!record) throw new LocalServiceError(404, "Case unavailable.");
    return { ...caseReceipt(record), photoUri: record.photoUri };
  }, false);
}
