import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(root, ".env.local");
let text;
try { text = await readFile(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; text = ""; }
const values = parseEnv(text);
function set(name, value) {
  const line = name + "=" + value;
  const expression = new RegExp("^(?:export\\s+)?" + name + "\\s*=.*$", "m");
  text = expression.test(text) ? text.replace(expression, line) : text.replace(/\s*$/, "") + "\n" + line + "\n";
}
const [command = "status", code] = process.argv.slice(2);
const configured = () => {
  const key = process.env.OPENAI_API_KEY || values.OPENAI_API_KEY;
  return !!key?.trim() && !/^(your_|test-|replace|placeholder)/i.test(key.trim());
};
if (command === "prepare") {
  if (!("OPENAI_API_KEY" in values)) set("OPENAI_API_KEY", "");
  if (!("AVATAR_ENABLED" in values)) set("AVATAR_ENABLED", "false");
  if (!("AVATAR_IMAGE_MODEL" in values)) set("AVATAR_IMAGE_MODEL", "gpt-image-2.5-sunburst");
  if (!("AVATAR_ALLOWED_OWNERS" in values)) set("AVATAR_ALLOWED_OWNERS", "");
} else if (command === "allow") {
  if (!/^[a-f0-9]{64}$/.test(code || "")) throw new Error("Use the 64-character device code shown in Me > Your avatar.");
  const allowed = new Set((values.AVATAR_ALLOWED_OWNERS || "").split(",").filter(v => /^[a-f0-9]{64}$/.test(v)));
  allowed.add(code); set("AVATAR_ALLOWED_OWNERS", [...allowed].join(","));
} else if (command === "enable") {
  if (!configured()) throw new Error("Add OPENAI_API_KEY to .env.local first. Never put the key on the command line or in chat.");
  if (!/^[a-f0-9]{64}(,[a-f0-9]{64})*$/.test(values.AVATAR_ALLOWED_OWNERS || "")) throw new Error("Approve a device with the allow command first.");
  if (Object.keys({ ...values, ...process.env }).some(name => /^EXPO_PUBLIC_.*(OPENAI|AVATAR.*KEY)/i.test(name))) throw new Error("Remove the public OpenAI secret variable and rotate its key before enabling.");
  if (!["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].includes(values.AVATAR_IMAGE_MODEL || "gpt-image-2.5-sunburst")) throw new Error("Use a supported avatar model.");
  set("AVATAR_ENABLED", "true");
} else if (command === "disable") set("AVATAR_ENABLED", "false");
else if (command === "status") {
  console.info(JSON.stringify({ keyConfigured: configured(), enabledInFile: values.AVATAR_ENABLED === "true",
    approvedDevices: (values.AVATAR_ALLOWED_OWNERS || "").split(",").filter(v => /^[a-f0-9]{64}$/.test(v)).length,
    scope: "Development pilot only; restart Expo after configuration changes." }, null, 2));
  process.exit(0);
} else throw new Error("Usage: node scripts/configure-avatar.mjs prepare|status|allow DEVICE_CODE|enable|disable");
await writeFile(file, text, { mode: 0o600 });
if (command === "prepare") {
  // Preserve the existing local-service setting. Only create the development default when absent.
  const config = resolve(root, ".local/explore-services.json");
  await mkdir(dirname(config), { recursive: true });
  try { await writeFile(config, '{"enabled":true}\n', { flag: "wx", mode: 0o600 }); } catch (error) { if (error.code !== "EEXIST") throw error; }
}
console.info("Avatar configuration updated. Restart Expo to apply it. No secret values were printed.");
