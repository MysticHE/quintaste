import { pool, logger } from '../config.mjs';
import { setExtraCards } from '../ai-recipes/dishes.mjs';
import { setExtraRules } from '../swaps/plan.mjs';
import { gapsReady } from './record.mjs';

/**
 * Puts library additions staff approved to use (Phase E): dish cards for Snap a dish and swap rules for Swap, read every five
 * minutes. Approved foods are not used at runtime: they wait for the next library release, which rebuilds the reviewed tables.
 */
const EVERY = 5 * 60000;
let signature = '';

export async function refreshApproved() {
  if (!await gapsReady()) return;
  const rows = (await pool.query("SELECT kind, draft FROM recipes.library_gap WHERE status = 'approved' AND kind IN ('dish','swap') AND draft IS NOT NULL ORDER BY decided_at")).rows;
  const next = JSON.stringify(rows);
  if (next === signature) return;
  signature = next;
  setExtraCards(rows.filter(r => r.kind === 'dish' && !r.draft.skip).map(r => r.draft));
  setExtraRules(rows.filter(r => r.kind === 'swap' && !r.draft.skip).flatMap(r => r.draft.rules ?? []));
  logger.info({ event: 'library_additions_loaded', dishes: rows.filter(r => r.kind === 'dish').length, swaps: rows.filter(r => r.kind === 'swap').length });
}

export function startApprovedRefresh() {
  const run = () => refreshApproved().catch(error => logger.warn({ event: 'library_additions_failed', detail: String(error?.message ?? error).slice(0, 160) }));
  void run();
  const timer = setInterval(run, EVERY).unref();
  return () => clearInterval(timer);
}
