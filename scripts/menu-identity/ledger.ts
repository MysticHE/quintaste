import { appendFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isRecord, validPlaceId, writeResearchFile } from "../menu-research-files";
import { IDENTITY_FIELDS, IDENTITY_REQUEST_CAP } from "./types";
import type { LedgerEvent, Reservation, Resolution } from "./types";

export class IdentityLedger {
  readonly results = new Map<string, Resolution>();
  requestCount = 0;
  private writes: Promise<void> = Promise.resolve();
  private constructor(readonly root: string, readonly path: string) {}

  static async open(root: string) {
    const ledger = new IdentityLedger(root, resolve(root, ".local/menu-identity-request-ledger.jsonl"));
    await mkdir(resolve(root, ".local"), { recursive: true });
    await appendFile(ledger.path, "", { encoding: "utf8" });
    const raw = await readFile(ledger.path, "utf8");
    for (const line of raw.split("\n").filter(Boolean)) ledger.replay(JSON.parse(line));
    if (ledger.requestCount > IDENTITY_REQUEST_CAP) throw new Error("Identity request budget is already exceeded.");
    return ledger;
  }

  private replay(event: unknown) {
    if (!isRecord(event)) throw new Error("Invalid request ledger; refusing to reset its budget.");
    if (event.event === "request" && validPlaceId(event.placeId) && Number.isFinite(Date.parse(String(event.at)))
      && event.number === this.requestCount + 1) this.requestCount += 1;
    else if (event.event === "complete" && isRecord(event.result) && validPlaceId(event.result.placeId)
      && Array.isArray(event.result.candidates) && Number.isSafeInteger(event.result.requestNumber)
      && Number(event.result.requestNumber) <= this.requestCount) {
      this.results.set(event.result.placeId, event.result as unknown as Resolution);
    } else throw new Error("Invalid identity request event; existing budget is preserved.");
  }

  private append(event: LedgerEvent) {
    const work = this.writes.then(() => appendFile(this.path, JSON.stringify(event) + "\n", { encoding: "utf8", flush: true }));
    this.writes = work;
    return work;
  }

  async reserve(placeId: string): Promise<Reservation> {
    if (this.requestCount >= IDENTITY_REQUEST_CAP) throw new Error("Identity request hard cap reached.");
    const event: Reservation = { event: "request", placeId, at: new Date().toISOString(), number: ++this.requestCount };
    await this.append(event);
    return event;
  }

  async complete(result: Resolution) {
    await this.append({ event: "complete", result });
    this.results.set(result.placeId, result);
  }

  async snapshot(directoryIds: string[]) {
    await this.writes;
    const results = [...this.results.values()];
    const counts: Record<string, number> = {};
    for (const row of results) counts[row.status] = (counts[row.status] ?? 0) + 1;
    const duplicatePlaceIds = new Map<string, Set<string>>();
    for (const row of results) for (const candidate of row.candidates) {
      const key = JSON.stringify([candidate.leadFile, candidate.leadId]);
      const ids = duplicatePlaceIds.get(key) ?? new Set<string>();
      ids.add(candidate.placeId); duplicatePlaceIds.set(key, ids);
    }
    const report = { version: 1, checkedAt: new Date().toISOString(), fieldMask: IDENTITY_FIELDS,
      requestCap: IDENTITY_REQUEST_CAP, requestsReserved: this.requestCount,
      totalIds: directoryIds.length, completedIds: results.length,
      remainingIds: directoryIds.filter(id => !this.results.has(id)).length, counts,
      note: "Google names, addresses, coordinates, categories and response bodies are transient. Candidate display facts come only from existing independent source leads. Candidates require explicit branch review.",
      duplicateLeadAssignments: [...duplicatePlaceIds].filter(([, ids]) => ids.size > 1)
        .map(([lead, ids]) => ({ lead: JSON.parse(lead), placeIds: [...ids] })), results };
    await writeResearchFile(resolve(this.root, ".local/menu-identity-receipts.json"), JSON.stringify(report, null, 2) + "\n");
    return { ...report, results: undefined, duplicateLeadAssignments: report.duplicateLeadAssignments.length };
  }
}
