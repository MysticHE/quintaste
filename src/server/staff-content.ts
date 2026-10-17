import pg from "pg";
import pino from "pino";
import aliases from "../../data/menus/catalogue-aliases.json";
import type { StaffContent, StaffItem } from "../types/staff-content";
import { emptyStaffContent, staffContentLoader, staffContentQuery } from "../../server/staff-content-core.mjs";

const state = globalThis as typeof globalThis & { quintasteStaffContent?: () => Promise<StaffContent>; localStaffContent?: () => Promise<StaffContent> };
/** The production server (server/staff-content.mjs) shares its loader; a standalone Expo dev server gets its own. */
function loader() {
  if (state.quintasteStaffContent) return state.quintasteStaffContent;
  if (!state.localStaffContent) {
    if (!process.env.DATABASE_URL) throw new Error("Operations database unavailable");
    const logger = pino({ base: undefined }), pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2,
      statement_timeout: 5000, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 });
    pool.on("error", () => logger.error({ event: "operations_database_error" }));
    state.localStaffContent = staffContentLoader(() => pool.query<StaffItem>(staffContentQuery), event => logger.warn({ event })) as () => Promise<StaffContent>;
  }
  return state.localStaffContent;
}
/** Staff edits, hides and staff-created items (see server/staff-content-core.mjs for caching and failure rules). */
export async function staffContent(): Promise<StaffContent> {
  return process.env.OPERATIONS_ENABLED === "true" ? loader()() : emptyStaffContent as StaffContent;
}
/** Hidden places, which also hide their menus and reviews. */
export function hiddenPlaces(content: StaffContent) {
  const hidden = new Set([...content.items.values()].filter(item => item.kind === "place" && item.hidden).map(item => item.id));
  for (const alias of aliases.entries) if (hidden.has(alias.canonicalId)) hidden.add(alias.aliasId);
  return hidden;
}
