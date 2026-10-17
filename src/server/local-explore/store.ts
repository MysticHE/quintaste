import type { AvatarLedger } from "../avatar/ledger";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import { join } from "node:path";
import { lock as acquireLock } from "proper-lockfile";
import type { PilotReview } from "../../types/pilot-catalogue";
import type { LocalOwner, CaseDetail, AreaParticipation } from "../../types/explore-local";

export class LocalServiceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type StoredCase = CaseDetail & { owner: string; fingerprint: string };
export type LocalStore = {
  version: 1; avatarLedger?: AvatarLedger; pilotReviews?: Record<string, PilotReview>; owners: Record<string, { scope: LocalOwner; createdAt: number }>;
  cases: Record<string, StoredCase>; participation: Record<string, AreaParticipation>;
};
export const localDirectory = () => join(process.cwd(), ".local", "explore-service");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const empty = (): LocalStore => ({ version: 1, owners: {}, cases: {}, participation: {} });
export async function localEnabled() {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const config = JSON.parse(await readFile(join(process.cwd(), ".local", "explore-services.json"), "utf8"));
    return config.enabled === true;
  } catch { return false; }
}
async function lock(target: string) {
  let compromised = false;
  try {
    const release = await acquireLock(target, { realpath: false, stale: 10000, update: 2000,
      retries: { retries: 30, minTimeout: 40, maxTimeout: 120, factor: 1.1 },
      onCompromised: () => { compromised = true; } });
    return { release, check: () => { if (compromised) throw new LocalServiceError(503, "Local review changed. Retry."); } };
  } catch { throw new LocalServiceError(503, "Local review is busy. Retry shortly."); }
}
async function readStoreSnapshot(target: string): Promise<LocalStore> {
  try {
    if ((await stat(target)).size > 32 * 1024 * 1024) throw new Error("oversize");
    const store: LocalStore = JSON.parse(await readFile(target, "utf8"));
    if (store.version !== 1 || !store.owners || !store.cases || !store.participation) throw new Error("invalid");
    return store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new LocalServiceError(503, "Local records could not be read.");
    return empty();
  }
}

// Writers atomically replace the complete file; public reads can use either complete revision without a write lease.
export async function readLocalStoreSnapshot<T>(action: (store: LocalStore) => T | Promise<T>): Promise<T> {
  return action(await readStoreSnapshot(join(localDirectory(), "records.json")));
}

export async function withLocalStore<T>(action: (store: LocalStore) => T | Promise<T>, save = true): Promise<T> {
  const directory = localDirectory(); await mkdir(directory, { recursive: true });
  const target = join(directory, "records.json"), lease = await lock(target);
  const temporary = join(directory, randomBytes(12).toString("hex") + ".tmp");
  try {
    const store = await readStoreSnapshot(target);
    lease.check();
    const result = await action(store);
    if (save) {
      const data = JSON.stringify(store);
      if (Buffer.byteLength(data) > 32 * 1024 * 1024) throw new LocalServiceError(507, "Local review storage is full.");
      const handle = await open(temporary, "wx", 0o600);
      try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
      lease.check(); await rename(temporary, target);
    }
    return result;
  } finally {
    try { await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; }); }
    finally { await lease.release(); }
  }
}
export async function localReviewerKey() {
  const directory = localDirectory(), file = join(directory, "reviewer.key");
  await mkdir(directory, { recursive: true }); const lease = await lock(file);
  try {
    try {
      const key = (await readFile(file, "utf8")).trim();
      if (!/^[a-f0-9]{64}$/.test(key)) throw new LocalServiceError(503, "Local review is unavailable.");
      return key;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const key = randomBytes(32).toString("hex"), handle = await open(file, "wx", 0o600);
      try { await handle.writeFile(key); await handle.sync(); } finally { await handle.close(); }
      lease.check(); return key;
    }
  } finally { await lease.release(); }
}
