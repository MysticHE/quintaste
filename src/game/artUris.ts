import { Asset } from "expo-asset";
import { GAME_ART } from "./art";

/** The app's Nunito weights, passed into the game webview, which cannot see fonts loaded by expo-font. */
const FONTS: Record<string, number> = {
  "font-nunito-800": require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
  "font-nunito-700": require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
};

let cache: Record<string, string> | null = null;
/** Bundled game art as URLs for the Phaser DOM component (file:// in release builds, the dev server in development). */
export function gameArtUris(): Record<string, string> {
  if (cache) return cache;
  const out: Record<string, string> = {};
  for (const [key, mod] of Object.entries({ ...GAME_ART, ...FONTS })) {
    try { const uri = Asset.fromModule(mod as number).uri; if (uri) out[key] = uri; } catch { /* a missing asset leaves its sprite blank */ }
  }
  cache = out;
  return out;
}
