import { allowed, operationsEnabled } from '../operations.mjs';
import { geminiConfig } from './gemini.mjs';
import { publisherKey } from '../editorial/key.mjs';

/**
 * Which engine writes AI recipes. `gemini`: the app calls Gemini itself (the original path, kept intact). `bots`: the
 * app prepares the job and the QT bots (Hermes, ops/qt-team/ai_recipes_bridge.py) write it, then the app finishes it.
 * Staff switch with the `ai_recipes_bots` control; without the operations database the AI_RECIPES_ENGINE variable
 * decides. There is no automatic switch between engines: a bot failure fails the job, so results show what works.
 */
export async function engine() {
  if (!operationsEnabled) return process.env.AI_RECIPES_ENGINE === 'bots' ? 'bots' : 'gemini';
  return await allowed('ai_recipes_bots') ? 'bots' : 'gemini';
}

/** The bots sign AI recipe tasks with the editorial publisher key (server/editorial/key.mjs). */
export const botKey = publisherKey;

/** True when the selected engine can take jobs: a Gemini key or gateway for `gemini`, the bot key for `bots`. */
export async function engineReady() {
  return await engine() === 'bots' ? botKey().length >= 48 : (await geminiConfig()).enabled;
}
