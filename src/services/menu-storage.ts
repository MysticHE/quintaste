import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MenuDetail, MenuSummary } from "../types/menus";
import { utf8Bytes } from "../state/food-capacity";
import { readMenuCatalogue } from "../utils/menu-catalogue";

export const menuIndexCacheKey = "quintaste:menu-index:v2";
// A sanity bound for the index (packaged and staff-created places); AsyncStorage on Android breaks above about 2 MB per value, and a real index is far below it.
export const menuIndexByteLimit = 4_000_000;
export const menuDetailByteLimit = 2_000_000;
export const menuOfflineEntryLimit = 400_000;
export const menuOfflineByteLimit = 1_200_000;
export const menuOfflineEntryCount = 5;
const prefix = "quintaste:menu-detail:v2:", metadataKey = "quintaste:menu-cache:v2";
type Entry = { id: string; bytes: number; savedAt: number };
let queue = Promise.resolve();

export function readMenuDetail(value: unknown, summary: MenuSummary, cached = false): MenuDetail {
  const parsed = readMenuCatalogue(value, Date.now(), cached);
  if (!value || typeof value !== "object" || !("fingerprint" in value) || value.fingerprint !== summary.fingerprint
    || parsed.venues.length !== 1 || parsed.venues[0].id !== summary.id)
    throw new Error("Menu changed. Please refresh.");
  return { ...parsed, fingerprint: summary.fingerprint };
}

export async function cachedMenuDetail(summary: MenuSummary) {
  const text = await AsyncStorage.getItem(prefix + summary.id);
  if (!text) return null;
  if (utf8Bytes(text) > menuOfflineEntryLimit) throw new Error("Invalid saved menu");
  return readMenuDetail(JSON.parse(text), summary, true);
}

function readEntries(text: string | null): Entry[] {
  if (!text || text.length > 10000) return [];
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value) || value.length > menuOfflineEntryCount) return [];
    return value.filter((entry): entry is Entry => !!entry && typeof entry === "object"
      && typeof entry.id === "string" && /^[a-z0-9][a-z0-9-]{2,119}$/.test(entry.id) && Number.isSafeInteger(entry.bytes)
      && entry.bytes > 0 && entry.bytes <= menuOfflineEntryLimit && Number.isSafeInteger(entry.savedAt));
  } catch { return []; }
}

export function saveMenuDetail(detail: MenuDetail) {
  const task = queue.then(async () => {
    const id = detail.venues[0].id, text = JSON.stringify(detail), bytes = utf8Bytes(text);
    if (bytes > menuOfflineEntryLimit) throw new Error("Menu too large for offline storage");
    let entries = readEntries(await AsyncStorage.getItem(metadataKey)).filter(entry => entry.id !== id);
    entries.sort((a, b) => b.savedAt - a.savedAt);
    entries = [{ id, bytes, savedAt: Date.now() }, ...entries];
    while (entries.length > menuOfflineEntryCount || entries.reduce((sum, entry) => sum + entry.bytes, 0) > menuOfflineByteLimit)
      entries.pop();
    const keep = new Set(entries.map(entry => prefix + entry.id));
    const obsolete = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix) && !keep.has(key));
    if (obsolete.length) await AsyncStorage.multiRemove(obsolete);
    await AsyncStorage.setItem(prefix + id, text);
    await AsyncStorage.setItem(metadataKey, JSON.stringify(entries));
  });
  queue = task.catch(() => {});
  return task;
}

export function removeMenuDetail(id: string) {
  const task = queue.then(async () => {
    const entries = readEntries(await AsyncStorage.getItem(metadataKey)).filter(entry => entry.id !== id);
    await AsyncStorage.removeItem(prefix + id);
    await AsyncStorage.setItem(metadataKey, JSON.stringify(entries));
  });
  queue = task.catch(() => {});
  return task;
}
