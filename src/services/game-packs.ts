/**
 * Recipe levels kept on this phone (GAME_CONTENT_PLAN §8 Offline): the last public levels played, so one can still be played offline,
 * as practice. Whenever the app is online it fetches the revocation list and drops any level staff hid. Private levels are never kept.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchRevoked, type PackResponse } from "./game-api";

const KEY = "@quintaste/game-packs", LIMIT = 20;
type Stored = Record<string, PackResponse & { at: number }>;

async function read(): Promise<Stored> {
  try {
    const value: unknown = JSON.parse(await AsyncStorage.getItem(KEY) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Stored : {};
  } catch { return {}; }
}
async function write(packs: Stored) {
  const kept = Object.entries(packs).sort(([, a], [, b]) => b.at - a.at).slice(0, LIMIT);
  await AsyncStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
}

/** Keeps a public level after it loaded online. */
export async function rememberPack(res: PackResponse) {
  if (res.private) return;
  // A full or failing store only means this level can't be played offline later.
  try { await write({ ...await read(), [res.hash]: { ...res, at: Date.now() } }); } catch { /* not kept */ }
}
/** A kept level, when it was not revoked since. */
export async function keptPack(hash: string): Promise<PackResponse | null> {
  return (await read())[hash] ?? null;
}
/** Drops every kept level on the revocation list. Offline, nothing changes. */
export async function pruneRevoked() {
  const packs = await read();
  if (!Object.keys(packs).length) return;
  try {
    const revoked = new Set((await fetchRevoked()).hashes);
    if (Object.keys(packs).some(h => revoked.has(h))) await write(Object.fromEntries(Object.entries(packs).filter(([h]) => !revoked.has(h))));
  } catch { /* offline: try again next time */ }
}
