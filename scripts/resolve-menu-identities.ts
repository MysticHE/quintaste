import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { lock } from "proper-lockfile";
import { placesKey } from "./places-client";
import { identityInputs } from "./menu-identity/inputs";
import { IdentityLedger } from "./menu-identity/ledger";
import { lookupIdentity } from "./menu-identity/client";
import { matchIdentity } from "./menu-identity/match";
import { IdentityRequestGate } from "./menu-identity/rate-limit";

function options() {
  const args = process.argv.slice(2);
  if (![2, 3].includes(args.length) || args[0] !== "--limit" || !/^\d+$/.test(args[1])
    || (args.length === 3 && args[2] !== "--retry-errors"))
    throw new Error("Usage: resolve-menu-identities.ts --limit 50 (or 2315 to resume all) [--retry-errors].");
  const limit = Number(args[1]);
  if (limit < 1 || limit > 2315) throw new Error("Limit must be between 1 and 2315.");
  return { limit, retryErrors: args[2] === "--retry-errors" };
}

async function main() {
  const { limit, retryErrors } = options(), root = resolve(process.cwd());
  await mkdir(resolve(root, ".local"), { recursive: true });
  const release = await lock(resolve(root, ".local/menu-identity-pass"),
    { realpath: false, retries: 0, stale: 60000, update: 15000 });
  let stopped = false, next = 0, completed = 0;
  const clues: { placeId: string; name: string; address: string }[] = [];
  const stop = () => { stopped = true; };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    const ledger = await IdentityLedger.open(root);
    const { placeIds, leads } = await identityInputs(root);
    const key = await placesKey(root);
    const pending = placeIds.filter(id => {
      const result = ledger.results.get(id);
      const retryable = !!result && (["network-error", "invalid-response"].includes(result.status)
        || (result.status === "http-error" && [429, 500, 502, 503, 504].includes(result.httpStatus ?? 0)));
      return retryErrors ? retryable : !result;
    }).slice(0, limit);
    const gate = new IdentityRequestGate();
    console.info(JSON.stringify({ event: "start", requested: pending.length, independentLeads: leads.length,
      priorRequests: ledger.requestCount, priorCompletedIds: ledger.results.size, concurrency: 6,
      minimumRequestStartIntervalMs: 150, shared429CooldownMs: 60000, retryErrors }));
    const worker = async () => {
      while (!stopped && next < pending.length) {
        const placeId = pending[next++];
        try {
          const lookup = await lookupIdentity(key, placeId, ledger, () => stopped, gate);
          const candidates = lookup.place ? matchIdentity(placeId, lookup.place, leads, lookup.reservation.at) : [];
          await ledger.complete({ placeId, ...(lookup.place ? { observedPlaceId: lookup.place.id } : {}),
            queriedAt: lookup.reservation.at, completedAt: new Date().toISOString(), requestNumber: lookup.reservation.number,
            httpStatus: lookup.httpStatus, status: lookup.status ?? (candidates.length ? "candidate" : "unmatched"), candidates });
          if (lookup.place && !candidates.length && clues.length < 12) clues.push({ placeId,
            name: lookup.place.displayName?.text ?? "", address: lookup.place.formattedAddress ?? "" });
          completed += 1;
          if (completed % 50 === 0) {
            console.info(JSON.stringify({ event: "progress", completedThisRun: completed,
              summary: await ledger.snapshot(placeIds), transientUnmatchedClues: clues.splice(0) }));
          }
        } catch (error) { stopped = true; throw error; }
      }
    };
    const workers = await Promise.allSettled(Array.from({ length: 6 }, worker));
    console.info(JSON.stringify({ event: "finish", completedThisRun: completed,
      summary: await ledger.snapshot(placeIds), transientUnmatchedClues: clues.splice(0) }));
    const failure = workers.find(result => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    if (stopped && completed < pending.length) throw new Error("Identity pass interrupted; reserved requests remain counted.");
  } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); await release(); }
}

void main().catch(error => { console.error(error instanceof Error ? error.message : "Identity resolution failed."); process.exitCode = 1; });
