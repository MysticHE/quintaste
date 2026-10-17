import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
type Sku = "textSearchEnterprise" | "nearbySearchEnterprise" | "placeDetailsAtmosphere" | "placePhotos";
const localCaps: Record<Sku, number> = { textSearchEnterprise: 100, nearbySearchEnterprise: 100, placeDetailsAtmosphere: 100, placePhotos: 600 };
export class AllowanceError extends Error {}
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function billingMonth() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return parts.find(part => part.type === "year")!.value + "-" + parts.find(part => part.type === "month")!.value;
}
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";
async function usageLock(root: string) {
  const lock = root + "/google-usage.lock";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { return await open(lock, "wx"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      // A holder finishes in milliseconds; a lock older than 10 seconds was left by a crashed process, so reclaim it.
      try { if (Date.now() - (await stat(lock)).mtimeMs > 10000) { await unlink(lock); continue; } }
      catch (problem) { if (!missing(problem)) throw problem; continue; }
      await delay(25 + attempt % 5 * 5);
    }
  }
  throw new AllowanceError("Live search is busy. Please retry in a moment.");
}
export async function reserveGoogleRequest(sku: Sku) {
  const root = resolve(process.cwd(), ".local");
  await mkdir(root, { recursive: true });
  let lock;
  try { lock = await usageLock(root); }
  catch (error) { if (error instanceof AllowanceError) throw error; throw new AllowanceError("Live search is busy. Please retry in a moment."); }
  try {
    const config = JSON.parse(await readFile(root + "/places-allowance.json", "utf8")) as {
      month: string; limits: Record<Sku, number>; observedUsage: Record<Sku, number>;
    };
    if (!plain(config) || !plain(config.limits) || !plain(config.observedUsage)) throw new AllowanceError("Live listing allowance could not be checked.");
    const limit = config.limits[sku], baseline = config.observedUsage[sku];
    if (config.month !== billingMonth() || !Number.isInteger(limit) || limit < 1 || limit > localCaps[sku]
      || !Number.isInteger(baseline) || baseline < 0 || baseline + limit > 900) {
      throw new AllowanceError("Live listings need an updated free-allowance check. You can still open Google Maps.");
    }
    let ledger: { month: string; counts: Partial<Record<Sku, number>> };
    try { ledger = JSON.parse(await readFile(root + "/google-usage.json", "utf8")); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      ledger = { month: config.month, counts: {} };
    }
    if (!plain(ledger) || ledger.month !== config.month || !plain(ledger.counts)) {
      throw new AllowanceError("Live listing usage needs review before another request.");
    }
    const count = ledger.counts[sku] ?? 0;
    if (!Number.isInteger(count) || count < 0) throw new AllowanceError("Live listing usage could not be checked.");
    if (count >= limit) throw new AllowanceError("This preview's live search limit has been reached. Open Google Maps to keep browsing.");
    ledger.counts[sku] = count + 1;
    await writeFile(root + "/google-usage.json.tmp", JSON.stringify(ledger, null, 2) + "\n");
    await rename(root + "/google-usage.json.tmp", root + "/google-usage.json");
  } catch (error) {
    if (error instanceof AllowanceError) throw error;
    throw new AllowanceError("Live listing usage could not be checked. Please retry later or open Google Maps.");
  } finally {
    await lock.close().catch(() => undefined);
    await unlink(root + "/google-usage.lock").catch(error => { if (!missing(error)) throw error; });
  }
}
