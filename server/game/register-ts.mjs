// Preload for scripts that run the game simulation under Node: node --import ./server/game/register-ts.mjs scripts/validate-game.ts
import { register } from 'node:module';
register(new URL('./ts-hooks.mjs', import.meta.url));
