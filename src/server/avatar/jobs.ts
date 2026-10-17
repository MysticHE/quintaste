import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers";
import { avatarStates, type AvatarJob, type AvatarFrames } from "../../types/avatar";
import { LocalServiceError, withLocalStore } from "../local-explore/store";
import { avatarConfig } from "./config";
import { reserveAvatar } from "./ledger";
import { renderAvatarFrame } from "./provider";
type Job = { owner: string; id: string; requestId: string; expires: number; controller: AbortController; result: AvatarJob };
const runtime = globalThis as typeof globalThis & { qtAvatarJobs?: Map<string, Job>; qtAvatarCancelled?: Map<string, number> };
const jobs = runtime.qtAvatarJobs ??= new Map<string, Job>();
const cancelled = runtime.qtAvatarCancelled ??= new Map<string, number>();
const lifetime = 15 * 60 * 1000;
function prune() {
  for (const [id, job] of jobs) if (job.expires <= Date.now()) { job.controller.abort(); jobs.delete(id); }
  for (const [key, expiry] of cancelled) if (expiry <= Date.now()) cancelled.delete(key);
}
function owned(owner: string, requestId: string) {
  prune();
  const job = [...jobs.values()].find(value => value.owner === owner && value.requestId === requestId);
  if (!job) throw new LocalServiceError(404, "Avatar preview expired or was not received. Your saved avatar is unchanged.");
  return job;
}
export function getAvatarJob(owner: string, requestId: string) { return owned(owner, requestId).result; }
export function discardAvatarJob(owner: string, requestId: string) {
  prune();
  const key = owner + ":" + requestId;
  // An active job must always be cancellable, even when the early-cancel cache is full.
  let removed = false;
  for (const [id, job] of jobs) if (job.owner === owner && job.requestId === requestId) {
    job.controller.abort(); jobs.delete(id); removed = true;
  }
  // Unapproved local sessions cannot fill the shared early-cancel cache.
  if (!avatarConfig().allowed.includes(owner)) return;
  if (!cancelled.has(key) && cancelled.size >= 500) {
    if (removed) return; // Its durable receipt also prevents a paid replay.
    throw new LocalServiceError(429, "Cancellation is busy. Try again shortly.");
  }
  // Remember cancellation when DELETE overtakes photo decoding or a lost POST response.
  cancelled.set(key, Date.now() + lifetime);
}
export function discardOwnerAvatars(owner: string) {
  for (const [id, job] of jobs) if (job.owner === owner) { job.controller.abort(); jobs.delete(id); }
}
async function stillAuthorized(owner: string) {
  const config = avatarConfig();
  return config.enabled && config.allowed.includes(owner) && await withLocalStore(store => !!store.owners[owner], false);
}
async function run(job: Job, photo: Buffer) {
  const frames = {} as AvatarFrames;
  let canonical: Buffer | undefined;
  const expiry = setTimeout(() => { job.controller.abort(); jobs.delete(job.id); }, lifetime);
  (expiry as unknown as NodeJS.Timeout).unref?.();
  try {
    for (const state of avatarStates) {
      if (!await stillAuthorized(job.owner) || job.controller.signal.aborted) throw new Error("Cancelled");
      const result = await renderAvatarFrame(state === "base" ? photo : canonical!, state, job.controller.signal);
      if (job.controller.signal.aborted || !jobs.has(job.id)) throw new Error("Cancelled");
      if (state === "base") { canonical = result.bytes; photo.fill(0); }
      frames[state] = result.uri; job.result = { id: job.id, status: "working", completed: Object.keys(frames).length };
    }
    job.result = { id: job.id, status: "complete", completed: 4,
      avatar: { id: job.id, frames, recipe: "standard-v2", createdAt: Date.now() } };
  } catch (error) {
    job.result = { id: job.id, status: job.controller.signal.aborted ? "cancelled" : "failed", completed: 0,
      message: error instanceof LocalServiceError ? error.message : "Generation stopped. Your saved avatar is unchanged." };
  } finally { photo.fill(0); canonical?.fill(0); }
}
export async function startAvatarJob(owner: string, requestId: string, photo: Buffer) {
  prune();
  if (cancelled.has(owner + ":" + requestId)) { photo.fill(0); throw new LocalServiceError(409, "This avatar request was cancelled."); }
  const existing = [...jobs.values()].find(job => job.owner === owner && job.requestId === requestId);
  if (existing) { photo.fill(0); return existing.result; }
  if ([...jobs.values()].some(job => job.owner === owner && job.result.status === "working") || jobs.size >= 5) {
    photo.fill(0); throw new LocalServiceError(429, "An avatar is already being created. Wait for it to finish.");
  }
  const id = randomUUID();
  const job: Job = { id, owner, requestId, expires: Date.now() + lifetime, controller: new AbortController(), result: { id, status: "working", completed: 0 } };
  // Claim the in-process slot before the asynchronous, durable budget reservation.
  jobs.set(id, job);
  try {
    const reserved = await reserveAvatar(owner, requestId, id);
    if (reserved !== id) throw new LocalServiceError(409, "This request was already submitted. Its preview has expired; it will not be charged again.");
    if (job.controller.signal.aborted || !await stillAuthorized(owner)) throw new LocalServiceError(409, "This avatar request was cancelled.");
    void run(job, photo); return job.result;
  } catch (error) { photo.fill(0); jobs.delete(id); throw error; }
}
