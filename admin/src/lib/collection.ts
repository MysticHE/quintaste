import 'server-only';
import { randomUUID } from 'node:crypto';
import { transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, text } from './http';

/** Badges are listed by the server (server/collection/catalog.mjs); staff see each one's id as words, "tea-for-two" as "Tea for two". */
const badgeName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1).replaceAll('-', ' ');
const badgeId = (value: unknown) => {
  const id = text(value, 'badge', 40);
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(id)) throw new HttpError(400, 'Check badge.');
  return id;
};
/** server/collection/schema.sql (or the game schema) not applied yet. */
const missing = (error: unknown) => (error as { code?: string })?.code === '42P01';
const notReady = () => new HttpError(409, 'Collection isn’t set up yet.');
const accountId = (value: unknown) => text(value, 'account id', 128);
const reasonOf = (value: unknown) => text(value, 'reason', 300);

type Ledger = { id: string; created_at: string; amount: number; kind: string; source: string; balance_after: number };
type Award = { badge: string; earned_at: string; revoked_at: string | null; revoke_reason: string | null; shown: boolean };
export type CollectionView = { ready: false } | { ready: true; credits: number; ledger: Ledger[]; badges: (Award & { name: string })[] };

/** One member's credits, latest 50 ledger rows and badges (Accounts › Manage). */
export async function collection(member: Session, id: unknown): Promise<CollectionView> {
  authorize(member, 'accounts');
  const user = accountId(id);
  try {
    return await transaction(async db => {
      if (!(await db.query('SELECT 1 FROM public."user" WHERE id=$1', [user])).rowCount) throw new HttpError(404, 'Account not found.');
      await audit(db, member.id, 'account.collection_viewed', user, 'Viewed credits and badges');
      // One client runs one query at a time, so these are awaited in turn.
      const credits = (await db.query<{ credits: number }>('SELECT credits FROM game.profile WHERE user_id=$1', [user])).rows[0]?.credits ?? 0;
      const ledger = (await db.query<Ledger>(`SELECT id::text,created_at,amount,kind,source,balance_after FROM game.ledger
        WHERE user_id=$1 ORDER BY id DESC LIMIT 50`, [user])).rows;
      const awards = (await db.query<Award>(`SELECT a.badge,a.earned_at,a.revoked_at,a.revoke_reason,
        EXISTS (SELECT 1 FROM community.badge_shown s WHERE s.user_id=a.user_id AND s.badge=a.badge) AS shown
        FROM community.badge_award a WHERE a.user_id=$1 ORDER BY a.earned_at`, [user])).rows;
      return { ready: true as const, credits, ledger, badges: awards.map(a => ({ ...a, name: badgeName(a.badge) })) };
    });
  } catch (error) { if (missing(error)) return { ready: false }; throw error; }
}

/** Adjust credits (one 'staff' ledger row; the ledger trigger moves the balance) or revoke a badge. Both need a reason. */
export async function collectionAction(member: Session, input: Record<string, unknown>) {
  authorize(member, 'accounts');
  const user = accountId(input.id);
  const action = choice(input.action, ['adjust', 'revoke'] as const, 'collection action');
  const reason = reasonOf(input.reason);
  try {
    return await transaction(async db => {
      await lockPermission(db, member, 'accounts');
      if (!(await db.query("SELECT to_regclass('community.badge_award') IS NOT NULL AS ready")).rows[0]?.ready) throw notReady();
      if (!(await db.query('SELECT 1 FROM public."user" WHERE id=$1', [user])).rowCount) throw new HttpError(404, 'Account not found.');
      if (action === 'revoke') {
        // Only a badge the member holds can be revoked, so the member's own award row is the check.
        const badge = badgeId(input.badge);
        const revoked = await db.query(`UPDATE community.badge_award SET revoked_at=now(),revoked_by=$3,revoke_reason=$4
          WHERE user_id=$1 AND badge=$2 AND revoked_at IS NULL`, [user, badge, member.id, reason]);
        if (!revoked.rowCount) throw new HttpError(409, 'This badge isn’t held. Refresh and check.');
        await db.query('DELETE FROM community.badge_shown WHERE user_id=$1 AND badge=$2', [user, badge]);
        await audit(db, member.id, 'account.badge_revoked', user, reason, { badge });
        return { saved: true, note: 'Badge revoked' };
      }
      const amount = integer(input.amount, 'amount', -10000, 10000);
      if (!amount) throw new HttpError(400, 'Check amount.');
      await db.query('INSERT INTO game.profile(user_id) VALUES($1) ON CONFLICT DO NOTHING', [user]);
      const balance = (await db.query<{ credits: number }>('SELECT credits FROM game.profile WHERE user_id=$1 FOR UPDATE', [user])).rows[0].credits;
      const after = balance + amount;
      if (after < 0) throw new HttpError(409, `The balance is ${balance} credits, so at most ${balance} can be removed.`);
      const source = 'staff:' + randomUUID();
      await db.query('INSERT INTO game.ledger(user_id,amount,kind,source,balance_after) VALUES($1,$2,$3,$4,$5)', [user, amount, 'staff', source, after]);
      await audit(db, member.id, 'account.credits_adjusted', user, reason, { amount, balanceAfter: after, source });
      return { saved: true, note: `Balance ${after} credits` };
    });
  } catch (error) { if (missing(error)) throw notReady(); throw error; }
}
