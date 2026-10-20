const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/**", ".impeccable/**", "admin/**", ".local/**", ".codex/**", ".21st/**", "artifacts/**", "ops/**"] },
]);
