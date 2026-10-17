import { createHash } from "node:crypto";
import pg from "pg";
import pino from "pino";
import aliases from "../../data/menus/catalogue-aliases.json";
import type { StaffContent, StaffItem } from "../types/staff-content";

const empty: StaffContent = { revision: "0".repeat(64), items: new Map() };
const state = globalThis as typeof globalThis & { operationsPool?: pg.Pool; staffCache?: { at: number; value: StaffContent }; staffPending?: Promise<StaffContent> };
const logger = pino({ base: undefined });

function pool() {
  if (!process.env.DATABASE_URL) throw new Error("Operations database unavailable");
  if (!state.operationsPool) {
    state.operationsPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2,
      statement_timeout: 5000, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 });
    state.operationsPool.on("error", () => logger.error({ event: "operations_database_error" }));
  }
  return state.operationsPool;
}
/** Staff edits, hides and staff-created items, re-read at most every 10 seconds. A failed read reuses the last copy for 5 minutes. */
export async function staffContent(): Promise<StaffContent> {
  if (process.env.OPERATIONS_ENABLED !== "true") return empty;
  const cached = state.staffCache;
  if (cached && Date.now() - cached.at < 10000) return cached.value;
  state.staffPending ??= pool().query<StaffItem>(`SELECT kind,id,origin,hidden,data,version,to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
    FROM content.item ORDER BY kind,id`)
    .then(({ rows }) => {
      const revision = createHash("sha256").update(JSON.stringify(rows.map(r => [r.kind, r.id, r.version, r.hidden, r.updated_at]))).digest("hex");
      const value = { revision, items: new Map(rows.map(row => [row.kind + ":" + row.id, row])) };
      state.staffCache = { at: Date.now(), value }; return value;
    })
    .catch(error => {
      if (cached && Date.now() - cached.at < 300000) { logger.warn({ event: "staff_content_stale" }); return cached.value; }
      throw error;
    })
    .finally(() => { state.staffPending = undefined; });
  return state.staffPending;
}
/** Hidden places, which also hide their menus and reviews. */
export function hiddenPlaces(content: StaffContent) {
  const hidden = new Set([...content.items.values()].filter(item => item.kind === "place" && item.hidden).map(item => item.id));
  for (const alias of aliases.entries) if (hidden.has(alias.canonicalId)) hidden.add(alias.aliasId);
  return hidden;
}
