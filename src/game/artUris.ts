import { Asset } from "expo-asset";
import { GAME_ART } from "./art";
import { apiUrl } from "../utils/api-url";
import { inExpoClient } from "../utils/expo-go";

/** The app's Nunito weights, passed into the game webview, which cannot see fonts loaded by expo-font. */
const FONTS: Record<string, number> = {
  "font-nunito-800": require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
  "font-nunito-700": require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
};

/** Where the web app serves the exported game page (CI copies Expo's DOM export there; server/index.mjs serves it). */
export const GAME_PAGE_PATH = "/game-dom/rush-hour.html";

/**
 * The web origin to load the game from, or null to use the page Expo packages with the app.
 *
 * Expo Go running a production bundle (the VPS preview) has no packaged copy of the game page: Expo looks for it at
 * file:///android_asset/www.bundle, which exists only in an installed build. There the page, its art and its fonts
 * come from the web app instead, all from one origin so the WebGL canvas can use the images. Development (the local
 * dev server serves the page) and installed builds (the page is packaged) keep Expo's default.
 */
export function gameHost(): string | null {
  if ((typeof __DEV__ !== "undefined" && __DEV__) || !inExpoClient()) return null;
  try {
    const url = new URL(process.env.EXPO_PUBLIC_API_URL ?? "");
    return url.protocol === "https:" && !url.username && !url.password ? url.origin : null;
  } catch { return null; }
}

/**
 * The web export names each file /assets/<project-relative folder>/<name>.<content hash>.<type>. The preview server
 * gives the app either that folder in the URL path or, from Metro, `/assets/?unstable_path=./<folder>/<file>`; both
 * map to the same web file. Anything else keeps the app's own URL.
 */
export function hostedUri(asset: Pick<Asset, "hash" | "name" | "type" | "uri">, host: string): string | null {
  if (!asset.hash || !asset.name || !asset.type || !asset.uri) return null;
  let folder: string;
  try {
    const url = new URL(asset.uri), rel = url.searchParams.get("unstable_path");
    if (rel !== null) {
      const file = rel.split("?")[0].replace(/^\.\//, "");
      if (!file.includes("/") || file.includes("..")) return null;
      folder = "/assets/" + file.slice(0, file.lastIndexOf("/"));
    } else folder = url.pathname.slice(0, url.pathname.lastIndexOf("/"));
  } catch { return null; }
  if (!folder.startsWith("/assets/")) return null;
  return host + folder.split("/").map(encodeURIComponent).join("/") + "/" + encodeURIComponent(asset.name) + "." + asset.hash + "." + asset.type;
}

/**
 * The art map plus a recipe level's approved pictures (`/api/game-art/<sha256>.webp` from `GET /api/game/packs/:hash`),
 * made absolute against the API. Built-in art always wins; anything still missing plays as a Sketch card (dom/sketch.ts).
 */
export function withPictures(art: Record<string, string>, pictures: Record<string, string>) {
  const out = { ...art };
  for (const [key, path] of Object.entries(pictures)) {
    if (out[key] || !/^\/api\/game-art\/[a-f0-9]{64}\.webp$/.test(path)) continue;
    try { out[key] = apiUrl(path); } catch { /* no API address: the key stays a Sketch card */ }
  }
  return out;
}

let cache: Record<string, string> | null = null;
/** Game art and fonts as URLs for the Phaser DOM component: the web app's copies in Expo Go, otherwise the app's own. */
export function gameArtUris(): Record<string, string> {
  if (cache) return cache;
  const host = gameHost(), out: Record<string, string> = {};
  for (const [key, mod] of Object.entries({ ...GAME_ART, ...FONTS })) {
    try {
      const asset = Asset.fromModule(mod as number), uri = (host && hostedUri(asset, host)) || asset.uri;
      if (uri) out[key] = uri;
    } catch { /* a missing asset leaves its sprite blank */ }
  }
  cache = out;
  return out;
}
