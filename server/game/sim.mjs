import { register } from 'node:module';
import { logger } from '../config.mjs';

/**
 * The shared Rush Hour simulation and progress rules, loaded from src/game with Node's type stripping (no fork, no
 * build step). If this Node lacks type stripping the game API reports itself unavailable and the app keeps runs pending.
 * @typedef {{ replay: any, sameResult: any, tickLimit: any, rulesVersion: string, ReplayError: any, MAX_ACTIONS: number,
 *   results: any, DT: number, applyResult: any, readGame: any, mergeGame: any, emptyGame: any, isUnlocked: any, levelOpen: any,
 *   highestCleared: any, specialFor: any,
 *   cosmetics: any, LEVELS: any[], DISHES: Record<string, any> }} Sim
 */
/** @type {Promise<Sim | null> | null} */
let loading = null;
const source = path => new URL('../../src/game/' + path, import.meta.url).href;
export function loadSim() {
  loading ??= (async () => {
    register(new URL('./ts-hooks.mjs', import.meta.url));
    const [replay, engine, progress, cosmetics, levels, dishes, special] = await Promise.all(
      ['sim/replay.ts', 'sim/engine.ts', 'progress.ts', 'content/cosmetics.ts', 'content/levels.ts', 'content/dishes.ts', 'special.ts'].map(path => import(source(path))));
    return { replay: replay.replay, sameResult: replay.sameResult, tickLimit: replay.tickLimit, rulesVersion: replay.rulesVersion,
      ReplayError: replay.ReplayError, MAX_ACTIONS: replay.MAX_ACTIONS, results: engine.results, DT: engine.DT,
      applyResult: progress.applyResult, readGame: progress.readGame, mergeGame: progress.mergeGame, emptyGame: progress.emptyGame,
      isUnlocked: progress.isUnlocked, levelOpen: progress.levelOpen, highestCleared: progress.highestCleared, specialFor: special.specialFor, cosmetics, LEVELS: levels.LEVELS, DISHES: dishes.DISHES };
  })().catch(error => {
    logger.error({ event: 'game_sim_unavailable', message: String(error?.message ?? error).slice(0, 200) });
    return null;
  });
  return loading;
}
