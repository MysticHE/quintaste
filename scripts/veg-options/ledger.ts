import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { isRecord } from "../menu-research-files";

// Owner-approved spend, 19 Oct 2026: Place Details Enterprise + Atmosphere for the whole 3,574-place queue
// (about US$65). About 980 calls are inside the monthly free cap; the rest bill at US$25 per 1,000.
export const CAPS = { details: 3600, search: 1000, identity: 4000 } as const;
// identity: Place Details Pro (name and postcode as a lookup key). Owner approved the full queue (~US$17 past
// October's 5,000 free Pro calls, which the 16 Oct identity pass partly used).
export type Sku = keyof typeof CAPS;
type Event = { event: "request"; sku: Sku; key: string; at: string; number: number };

export class SpendLedger {
  private counts: Record<Sku, number> = { details: 0, search: 0, identity: 0 };
  private writes: Promise<void> = Promise.resolve();
  private constructor(private readonly path: string) {}

  static async open(path: string) {
    const ledger = new SpendLedger(path);
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, "", "utf8");
    for (const line of (await readFile(path, "utf8")).split("\n").filter(Boolean)) {
      const row: unknown = JSON.parse(line);
      if (!isRecord(row) || row.event !== "request" || typeof row.sku !== "string" || !(row.sku in CAPS)
        || row.number !== ledger.counts[row.sku as Sku] + 1) throw new Error("Spend ledger is invalid; refusing to reset its budget.");
      ledger.counts[row.sku as Sku] += 1;
    }
    return ledger;
  }

  used(sku: Sku) { return this.counts[sku]; }
  left(sku: Sku) { return CAPS[sku] - this.counts[sku]; }

  /** Counted before the request is sent, so an interrupted run never under-counts spend. */
  async reserve(sku: Sku, key: string) {
    if (this.left(sku) <= 0) throw new Error("Hard cap reached for " + sku + " (" + CAPS[sku] + ").");
    const event: Event = { event: "request", sku, key, at: new Date().toISOString(), number: ++this.counts[sku] };
    this.writes = this.writes.then(() => appendFile(this.path, JSON.stringify(event) + "\n", { encoding: "utf8", flush: true }));
    await this.writes;
  }
}
