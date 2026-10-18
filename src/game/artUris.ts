import { Asset } from "expo-asset";
import { GAME_ART } from "./art";

let cache: Record<string, string> | null = null;
/** Bundled game art as URLs for the Phaser DOM component (file:// in release builds, the dev server in development). */
export function gameArtUris(): Record<string, string> {
  if (cache) return cache;
  const out: Record<string, string> = {};
  for (const [key, mod] of Object.entries(GAME_ART)) {
    try { const uri = Asset.fromModule(mod as number).uri; if (uri) out[key] = uri; } catch { /* a missing asset leaves its sprite blank */ }
  }
  cache = out;
  return out;
}
