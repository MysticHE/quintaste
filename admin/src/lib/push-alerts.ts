import 'server-only';
import type { PoolClient } from 'pg';
import { logger } from './db';

/**
 * Phone alerts from staff decisions. The admin console only queues them in community.push_outbox, in the same transaction
 * as the decision; the app server words and sends them (server/community/push.mjs, words in push-words.mjs), and takes the
 * switch and channel from its own words, so `kinds` here only fills the row. Staff alerts carry no actor, so a member's
 * blocks never hold back a safety notice. A failed queue (the table not installed yet) is logged and never stops the decision.
 */
const kinds = {
  photoApproved: 'account', photoDeclined: 'account', shopPaused: 'account', itemRemoved: 'account', safetyNotice: 'orders',
  classCancelled: 'classes', teacherApproved: 'classes', teacherReinstated: 'classes', teacherDeclined: 'classes', teacherSuspended: 'classes',
  recipePublished: 'recipes', recipeDeclined: 'recipes',
  exploreSuggestionNeedsInfo: 'account', exploreSuggestionClosed: 'account', exploreClaimNeedsInfo: 'account', exploreClaimApproved: 'account', exploreClaimDeclined: 'account',
} as const;
export type StaffAlert = keyof typeof kinds;

/** Queues alert `what` for member `to`, opening `url` (an app path) when tapped; `detail` is the short name it mentions. */
export async function queueAlert(db: PoolClient, to: string | null | undefined, what: StaffAlert, url: string, detail = '') {
  if (!to) return;
  try {
    await db.query('SAVEPOINT push_alert');
    await db.query('INSERT INTO community.push_outbox(user_id, kind, what, detail, url) VALUES($1,$2,$3,$4,$5)',
      [to, kinds[what], what, detail.slice(0, 120), url]);
    await db.query('RELEASE SAVEPOINT push_alert');
  } catch (error) {
    await db.query('ROLLBACK TO SAVEPOINT push_alert').catch(() => {});
    logger.warn({ event: 'push_queue_failed', what, message: error instanceof Error ? error.message : String(error) });
  }
}
