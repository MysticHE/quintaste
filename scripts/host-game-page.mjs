// Builds the Rush Hour page the web app serves to Expo Go (src/game/artUris.ts gameHost) from Expo's Android DOM export.
//
// Expo's page reads its props from window.ReactNativeWebView.injectedObjectJson() while the HTML is parsed. On Android,
// react-native-webview defines that function with evaluateJavascript only when a page starts or finishes loading, so a
// page fetched over the network is parsed before it exists and the game never mounts (a blank screen). This page waits
// for the props, then loads the game script. Usage: node scripts/host-game-page.mjs <android export dir> <output dir>
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROPS_SCRIPT = /<script>(?:(?!<\/script>)[\s\S])*injectedObjectJson\(\)(?:(?!<\/script>)[\s\S])*<\/script>/g;
const GAME_SCRIPT = /<script src="\.\/([0-9a-f]+\.js)" defer><\/script>/g;
const TIMEOUT_MS = 15000;

const STYLE = `<style>
:root { --game-cream:#fff8ef; --game-ink:#3a2a2c; }
.game-load-failed { position:fixed; inset:0; display:grid; place-items:center; padding:24px; text-align:center;
  font:600 16px/1.4 system-ui, sans-serif; color:var(--game-ink); background:var(--game-cream); }
</style>`;

function loader(script) {
  return `<script>
(function () {
  var root = document.getElementById("root"), started = Date.now();
  function fail() { root.className = "game-load-failed"; root.textContent = "The game couldn't start. Go back and open it again."; }
  function injected() {
    var bridge = window.ReactNativeWebView;
    if (!bridge || typeof bridge.injectedObjectJson !== "function") return null;
    var json = bridge.injectedObjectJson();
    return json ? JSON.parse(json) : null;
  }
  function boot() {
    var value;
    try { value = injected(); } catch (e) { fail(); return; }
    if (!value) { if (Date.now() - started < ${TIMEOUT_MS}) setTimeout(boot, 25); else fail(); return; }
    window.$$EXPO_DOM_HOST_OS = value.EXPO_DOM_HOST_OS;
    window.$$EXPO_INITIAL_PROPS = value.initialProps;
    var game = document.createElement("script");
    game.src = ${JSON.stringify("./" + script)};
    game.onerror = fail;
    document.body.appendChild(game);
  }
  boot();
})();
</script>`;
}

function only(html, pattern, what) {
  const found = [...html.matchAll(pattern)];
  if (found.length !== 1) throw new Error(`Expected one ${what} in Expo's DOM page, found ${found.length}; check the Expo DOM template`);
  return found[0];
}

const [exportDir, outDir] = process.argv.slice(2);
if (!exportDir || !outDir) throw new Error("Usage: node scripts/host-game-page.mjs <android export dir> <output dir>");
const bundleDir = path.join(exportDir, "www.bundle");
const files = readdirSync(bundleDir);
const pages = files.filter(f => f.endsWith(".html"));
if (pages.length !== 1) throw new Error(`Expected one DOM page in ${bundleDir}, found ${pages.length}`);

const html = readFileSync(path.join(bundleDir, pages[0]), "utf8");
const props = only(html, PROPS_SCRIPT, "props script"), game = only(html, GAME_SCRIPT, "game script");
if (!files.includes(game[1])) throw new Error(`The DOM page loads ${game[1]}, which the export does not contain`);
// Function replacements keep the "$$" in the loader literal (a string replacement would read "$$" as "$").
const page = html.replace(props[0], () => "").replace(game[0], () => loader(game[1])).replace("</head>", () => STYLE + "\n</head>");

mkdirSync(outDir, { recursive: true });
for (const file of files.filter(f => f.endsWith(".js"))) copyFileSync(path.join(bundleDir, file), path.join(outDir, file));
writeFileSync(path.join(outDir, "rush-hour.html"), page);
console.log(`Game page: rush-hour.html loads ${game[1]} once the app's props arrive`);
