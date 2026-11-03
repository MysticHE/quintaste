import { pool, logger } from '../config.mjs';
import { memberHasher } from '../community/member-hash.mjs';

/**
 * Library gaps (docs/AI_FOOD_LIBRARY_PLAN.md, Phase E): what members hit that the reviewed library lacks, counted once per kind and
 * key. Distinct members are keyed hashes (never account ids). At MEMBERS_TO_DRAFT members the gap is queued for the QT bots to draft
 * an addition; staff can also queue one at once. Recording never gets in a member's way: any failure is logged and ignored.
 */
export const MEMBERS_TO_DRAFT = 3;
export const GAP_KINDS = ['dish', 'food', 'swap'];
const memberHash = memberHasher('library-gaps-v1');
/** A gap's key: lower-case letters, digits and single spaces (any script), at most 120 characters. */
export const gapKey = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, ' ').trim().slice(0, 120);

let ready = false, checkedAt = 0;
/** True once server/gaps/schema.sql is applied, so an older database keeps working without gaps. */
export async function gapsReady() {
  if (ready || Date.now() - checkedAt < 60000) return ready;
  checkedAt = Date.now();
  ready = Boolean((await pool.query("SELECT to_regclass('recipes.library_gap') AS t").catch(() => ({ rows: [] }))).rows[0]?.t);
  return ready;
}

/**
 * Counts one hit: `label` is what staff read, `context` a little of where it came from (kept small: the latest examples win). The
 * member counts once per gap; the gap is queued for drafting when it reaches MEMBERS_TO_DRAFT members.
 */
export async function recordGap({ kind, key, label, context = {}, user = null }) {
  const k = gapKey(key);
  if (!GAP_KINDS.includes(kind) || !k || !await gapsReady()) return;
  try {
    const gap = (await pool.query(`INSERT INTO recipes.library_gap (kind, key, label, context, hits) VALUES ($1, $2, $3, $4, 1)
      ON CONFLICT (kind, key) DO UPDATE SET hits = recipes.library_gap.hits + 1, last_seen = now(),
        context = CASE WHEN octet_length((recipes.library_gap.context || EXCLUDED.context)::text) <= 4000 THEN recipes.library_gap.context || EXCLUDED.context ELSE EXCLUDED.context END
      RETURNING id`, [kind, k, String(label).slice(0, 160) || k, context])).rows[0];
    if (!user) return;
    const added = (await pool.query('INSERT INTO recipes.library_gap_member (gap_id, member) VALUES ($1, $2) ON CONFLICT DO NOTHING', [gap.id, memberHash(user)])).rowCount;
    if (added) await pool.query(`UPDATE recipes.library_gap SET members = members + 1,
        status = CASE WHEN status = 'open' AND members + 1 >= $2 THEN 'queued' ELSE status END,
        queued_at = CASE WHEN status = 'open' AND members + 1 >= $2 THEN now() ELSE queued_at END
      WHERE id = $1`, [gap.id, MEMBERS_TO_DRAFT]);
  } catch (error) {
    logger.warn({ event: 'library_gap_record_failed', kind, detail: String(error?.message ?? error).slice(0, 160) });
  }
}
/** Records several gaps without waiting on them (the member's request carries on). */
export const recordGaps = gaps => { for (const gap of gaps) void recordGap(gap); };
