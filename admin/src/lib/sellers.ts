import 'server-only';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, text, uuid } from './http';

const statuses = ['active','suspended','removed','draft'] as const;
const decisions = ['suspend','reinstate','remove'] as const;
const userId = (value: unknown) => { const id = text(value, 'seller id', 64, 8); if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new HttpError(400, 'Check seller id.'); return id; };
/** Report cases about a seller ($1): the shop owner, one of its items, or one of its orders. */
const aboutSeller = `split_part(c.subject_id,'|',1)='community:user:'||$1
  OR split_part(c.subject_id,'|',1) IN (SELECT 'market:listing:'||l.id FROM market.listing l WHERE l.seller_id=$1)
  OR split_part(c.subject_id,'|',1) IN (SELECT 'market:order:'||o.id FROM market."order" o WHERE o.seller_id=$1)`;

/** Shops by status, most-reported first. Open reports are counted once, by seller, across the shop owner, its items and its orders. */
export async function sellerList(member: Session, status: string) {
  authorize(member, 'sellers');
  const filter = status ? choice(status, statuses, 'status') : 'active';
  return (await query(`WITH open AS (SELECT split_part(subject_id,'|',1) AS subject FROM ops.case_record WHERE kind='report' AND status NOT IN ('resolved','dismissed')),
      counts AS (SELECT seller_id, count(*)::int AS reports FROM (
        SELECT substr(subject, 16) AS seller_id FROM open WHERE subject LIKE 'community:user:%'
        UNION ALL SELECT l.seller_id FROM open JOIN market.listing l ON open.subject='market:listing:'||l.id
        UNION ALL SELECT o.seller_id FROM open JOIN market."order" o ON open.subject='market:order:'||o.id) x GROUP BY seller_id)
    SELECT s.user_id AS id, s.trading_name, s.area, s.status, s.opened_at, u.username, coalesce(c.reports, 0) AS reports
    FROM market.seller s JOIN public."user" u ON u.id=s.user_id LEFT JOIN counts c ON c.seller_id=s.user_id WHERE s.status=$1
    ORDER BY reports DESC, s.opened_at DESC NULLS LAST, s.trading_name LIMIT 200`, [filter])).rows;
}
export async function sellerDetail(member: Session, id: string) {
  authorize(member, 'sellers');
  const sellerId = userId(id);
  return transaction(async db => {
    const seller = (await db.query(`SELECT s.*, u.username, u.name AS account_name, u."createdAt" AS account_created FROM market.seller s
      JOIN public."user" u ON u.id=s.user_id WHERE s.user_id=$1`, [sellerId])).rows[0];
    if (!seller) throw new HttpError(404, 'Seller not found.');
    await audit(db, member.id, 'seller.viewed', sellerId, 'Viewed market seller');
    // One client runs one query at a time, so these are awaited in turn.
    const listings = await db.query('SELECT id, name, kind, status, removed_reason, updated_at FROM market.listing WHERE seller_id=$1 ORDER BY updated_at DESC LIMIT 100', [sellerId]);
    const orders = await db.query(`SELECT count(*) FILTER (WHERE status IN ('requested','confirmed','ready'))::int AS open, count(*) FILTER (WHERE status='completed')::int AS completed,
      count(*) FILTER (WHERE status='disputed')::int AS disputed FROM market."order" WHERE seller_id=$1`, [sellerId]);
    const reports = await db.query(`SELECT c.id, c.title, c.status, c.created_at FROM ops.case_record c WHERE c.kind='report' AND (${aboutSeller})
      ORDER BY c.created_at DESC LIMIT 50`, [sellerId]);
    return { seller, listings: listings.rows, orders: orders.rows[0], reports: reports.rows };
  });
}
/** Posts a system line into every open or recent (30-day) order conversation of a seller (or of one item), including orders with a reported problem. */
async function notifyBuyers(db: PoolClient, sellerId: string, body: string, listingId?: string) {
  const buyers = (await db.query(`SELECT DISTINCT o.buyer_id FROM market."order" o ${listingId ? 'JOIN market.order_item i ON i.order_id=o.id AND i.listing_id=$2' : ''}
    WHERE o.seller_id=$1 AND o.buyer_id IS NOT NULL AND (o.status IN ('requested','confirmed','ready') OR (o.status IN ('completed','disputed','no_show') AND coalesce(o.completed_at, o.updated_at) > now() - interval '30 days'))`,
    listingId ? [sellerId, listingId] : [sellerId])).rows;
  for (const { buyer_id } of buyers) {
    const c = (await db.query(`INSERT INTO market.conversation(buyer_id, seller_id) VALUES($1,$2) ON CONFLICT(buyer_id, seller_id) DO UPDATE SET updated_at=now() RETURNING id`, [buyer_id, sellerId])).rows[0];
    await db.query("INSERT INTO market.message(conversation_id, kind, body) VALUES($1,'event',$2)", [c.id, body]);
  }
  return buyers.length;
}
async function cancelOpen(db: PoolClient, sellerId: string, reason: string, listingId?: string) {
  await db.query(`UPDATE market."order" o SET status='cancelled', status_reason=$2, updated_at=now() WHERE o.seller_id=$1 AND o.status IN ('requested','confirmed','ready')
    ${listingId ? 'AND EXISTS (SELECT 1 FROM market.order_item i WHERE i.order_id=o.id AND i.listing_id=$3)' : ''}`, listingId ? [sellerId, reason, listingId] : [sellerId, reason]);
}
/** Takes an item out of the Market, cancels open orders that include it and tells those buyers. Returns how many were told. */
export async function removeListing(db: PoolClient, sellerId: string, listingId: string, note: string) {
  const result = await db.query("UPDATE market.listing SET status='removed', removed_reason=$3, updated_at=now() WHERE id=$1 AND seller_id=$2 AND status<>'removed'", [listingId, sellerId, note]);
  if (!result.rowCount) throw new HttpError(404, 'Item not found or already removed.');
  const notified = await notifyBuyers(db, sellerId, 'Safety notice: an item from this shop was removed by QuinTaste. Open orders with it are cancelled. Do not eat it if you still have it; contact the seller about a refund.', listingId);
  await cancelOpen(db, sellerId, 'QuinTaste removed an item in this order.', listingId);
  return notified;
}
/** Suspension and removal take the shop out of browsing and cancel its open orders; buyers are told first. */
async function decide(db: PoolClient, seller: Record<string, unknown>, action: typeof decisions[number], note: string) {
  const id = seller.user_id as string;
  if (action === 'reinstate') {
    if (seller.status !== 'suspended') throw new HttpError(409, 'Only suspended shops can be reinstated.');
    // A shop that was never opened goes back to draft; its owner must still complete it and accept the declarations.
    await db.query("UPDATE market.seller SET status=CASE WHEN opened_at IS NULL THEN 'draft' ELSE 'active' END, status_note='', updated_at=now() WHERE user_id=$1", [id]);
    return 0;
  }
  if (!note) throw new HttpError(400, 'Tell the seller why.');
  if (seller.status === 'removed') throw new HttpError(409, 'This shop is already removed.');
  await db.query('UPDATE market.seller SET status=$2, status_note=$3, updated_at=now() WHERE user_id=$1', [id, action === 'suspend' ? 'suspended' : 'removed', note]);
  const notified = await notifyBuyers(db, id, 'QuinTaste has paused this shop. Open orders are cancelled.');
  await cancelOpen(db, id, 'QuinTaste paused this shop.');
  return notified;
}
export async function sellerAction(member: Session, input: Record<string, unknown>, reason: string) {
  const action = choice(input.action, [...decisions, 'remove_listing'] as const, 'seller action');
  authorize(member, 'sellers');
  const id = userId(input.id), note = text(input.note || '', 'note for the seller', 300, 0);
  return transaction(async db => {
    await lockPermission(db, member, 'sellers');
    const seller = (await db.query('SELECT user_id, status FROM market.seller WHERE user_id=$1 FOR UPDATE', [id])).rows[0];
    if (!seller) throw new HttpError(404, 'Seller not found.');
    let notified: number;
    if (action === 'remove_listing') notified = await removeListing(db, id, uuid(input.listingId, 'item'), (text(input.note || '', 'note for the seller', 300, 0) || 'This item does not meet the QuinTaste listing rules.'));
    else notified = await decide(db, seller, action, note);
    await audit(db, member.id, 'seller.' + action, id, reason, { note, listing: input.listingId, notified });
    return { saved: true, note: notified ? `${notified} buyer conversation(s) notified.` : undefined };
  });
}
