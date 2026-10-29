/**
 * One recipe rulebook for every engine (owner, 28 Oct 2026; docs/RECIPE_SOURCING_PLAN.md §3). The QT bots' copy,
 * ops/qt-team/recipe_charter.json, is the source; the app's AI Recipes and Wanted recipes read the parts they use from
 * server-assets/recipe-charter.json, which this script writes. Never edit the server-assets copy by hand.
 *
 *   node scripts/recipe-charter-sync.mjs --write   update server-assets/recipe-charter.json
 *   node scripts/recipe-charter-sync.mjs --check   fail when it differs from the bots' copy (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'ops/qt-team/recipe_charter.json');
const target = path.join(root, 'server-assets/recipe-charter.json');
const PATTERNS = ['animal', 'animalQualifier', 'drink', 'dessert', 'savouryCake', 'dishWord', 'deepFry', 'unclear', 'genericStock', 'unfamiliar'];

export function appCharter(charter) {
  for (const key of PATTERNS) new RegExp(charter.patterns[key], 'iu');  // every shared pattern must also be a valid JavaScript regex
  return {
    generatedFrom: 'ops/qt-team/recipe_charter.json by scripts/recipe-charter-sync.mjs; do not edit',
    version: charter.version,
    allowedCategories: charter.allowedCategories,
    patterns: Object.fromEntries(PATTERNS.map(key => [key, charter.patterns[key]])),
  };
}

const mode = process.argv[2];
if (mode !== '--write' && mode !== '--check') {
  console.error('Usage: node scripts/recipe-charter-sync.mjs --write | --check');
  process.exit(2);
}
const wanted = JSON.stringify(appCharter(JSON.parse(readFileSync(source, 'utf8'))), null, 2) + '\n';
if (mode === '--write') {
  writeFileSync(target, wanted);
  console.log('server-assets/recipe-charter.json updated');
} else {
  let current = '';
  try { current = readFileSync(target, 'utf8').replace(/\r\n/g, '\n'); } catch { /* missing counts as different */ }
  if (current !== wanted) {
    console.error('server-assets/recipe-charter.json is out of date: run node scripts/recipe-charter-sync.mjs --write');
    process.exit(1);
  }
  console.log('Recipe charter in sync');
}
