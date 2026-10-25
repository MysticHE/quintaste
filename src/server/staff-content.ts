import aliases from "../../data/menus/catalogue-aliases.json";
import type { StaffContent, StaffItem } from "../types/staff-content";
import { emptyStaffContent, staffContentLoader, staffContentQuery } from "../../server/staff-content-core.mjs";
import { localDatabase } from "./local-database";

const state = globalThis as typeof globalThis & { quintasteStaffContent?: () => Promise<StaffContent>; localStaffContent?: () => Promise<StaffContent> };
/** The production server (server/staff-content.mjs) shares its loader; a standalone Expo dev server gets its own. */
function loader() {
  if (state.quintasteStaffContent) return state.quintasteStaffContent;
  if (!state.localStaffContent) {
    const { pool, logger } = localDatabase();
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
