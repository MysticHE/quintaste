/* Build-only trusted TypeScript inputs; no network or live publication writes. */
/* global __dirname */
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
if (!['--check', '--write'].includes(process.argv[2])) throw Error('Use --check or --write');
const content = path.join(root, '.local/editorial-baseline-no-overlays');
if (fs.existsSync(content)) throw Error('Build-only no-overlay path unexpectedly exists');
process.env.QT_EDITORIAL_ROOT = content;
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
const catalogue = require('../data/menus/catalogue-index.json');
const { bundledRecipes } = require('../src/data/recipes.ts');
const { publishedMenuDetail } = require('../src/server/menu-delivery.ts');
const baseline = { venues: catalogue.venues, recipes: bundledRecipes(true).map(({ id, name }) => ({ id, name })) };
const menus = catalogue.venues.map(venue => {
  const menu = publishedMenuDetail(venue.id, 0)?.venues[0];
  if (!menu) throw Error('Missing menu ' + venue.id);
  return { id: menu.id, sections: menu.sections.map(section => ({ id: section.id, scope: section.scope,
    sourceUrl: section.sourceUrl, items: section.items.map(({ id, name }) => ({ id, name })) })) };
});
for (const [name, data] of [['editorial-baseline.json', baseline], ['editorial-menu-baseline.json', menus]]) {
  const file = path.join(root, 'server-assets', name);
  if (process.argv[2] === '--write') fs.writeFileSync(file, JSON.stringify(data) + '\n');
  else if (JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8'))) !== JSON.stringify(data)) throw Error(name + ' is stale; regenerate after reviewed baseline changes');
}
console.log(JSON.stringify({ action: process.argv[2], venues: baseline.venues.length, recipes: baseline.recipes.length, menuIdentities: menus.length }));
