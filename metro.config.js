// Expo's default Metro config, plus folders the app never imports. Crawling them (other sessions' git worktrees under
// .claude with their own node_modules, the admin console's node_modules and .next builds, local QA work, the web export)
// ran the dev server out of memory. Project-relative directory patterns are pruned from the crawl (@expo/metro-file-map).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  /^(?:\.claude|\.local|admin|marketing|docs|artifacts|ops|dist)$/,
];

module.exports = config;
