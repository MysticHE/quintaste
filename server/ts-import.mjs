import { register } from 'node:module';

/** Imports one of the app's TypeScript modules (bundled recipes, nutrition standards) with the game's resolver hook, registered once. */
let ready = false;
export async function importTs(relative) {
  if (!ready) { register(new URL('./game/ts-hooks.mjs', import.meta.url)); ready = true; }
  return import(new URL('../' + relative, import.meta.url).href);
}
