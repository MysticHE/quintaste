import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, pageSize, text, uuid } from './http';
import { removeListing } from './sellers';
import { packagedPlaces } from './content-base';
import { staffRows } from './content-store';

// Member-written content is hidden or restored, never rewritten: staff must not put words in a member's name.
/** A LIKE pattern for a staff search box, or '' when empty. */
export const search = (value: string) => value ? '%' + text(value, 'search', 60).replace(/[\\%_]/g, '\\$&') + '%' : '';
const openReports = (subject: string) => `(SELECT count(*)::int FROM ops.case_record c WHERE c.kind='report' AND c.status NOT IN ('resolved','dismissed')
  AND split_part(c.subject_id,'|',1)=${subject})`;

async function placeNames() {
  const [base, staff] = await Promise.all([packagedPlaces(), staffRows('place')]);
  return new Map([...base.map(p => [p.data.id, p.data.name + (p.data.branch ? ' · ' + p.data.branch : '')]),
    ...staff.filter(r => r.origin === 'staff').map(r => [r.id, String(r.data.name ?? r.id)])] as [string, string][]);
}
export async function reviewList(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const hidden = choice(status || 'visible', ['visible', 'hidden'] as const, 'status') === 'hidden', term = search(q);
  // Staff search by the place name they see in the list; reviews store only the place id.
  const naming = placeNames(), needle = q.trim().toLowerCase();
  const placeIds = needle ? [...await naming].filter(([, name]) => name.toLowerCase().includes(needle)).map(([id]) => id).slice(0, 500) : [];
  const [rows, names] = await Promise.all([query(`SELECT pr.id,pr.place_id,pr.rating,pr.body,pr.created_at,pr.updated_at,pr.hidden_at,pr.hidden_reason,u.username,u.name,
      coalesce((SELECT json_agg(p.id ORDER BY p.position) FROM community.place_review_photo p WHERE p.review_id=pr.id),'[]') AS photos,
      ${openReports("'place:review:'||pr.id")} AS reports
    FROM community.place_review pr JOIN public."user" u ON u.id=pr.user_id
    WHERE (pr.hidden_at IS NOT NULL)=$1 AND ($2='' OR pr.body ILIKE $2 OR pr.place_id ILIKE $2 OR u.username ILIKE $2 OR pr.place_id = ANY($3::text[]))
    ORDER BY reports DESC, pr.created_at DESC, pr.id LIMIT ${pageSize} OFFSET $4`, [hidden, term, placeIds, skip]), naming]);
  return rows.rows.map(row => ({ ...row, place: names.get(row.place_id) ?? row.place_id }));
}
export async function reviewPhoto(member: Session, id: string) {
  authorize(member, 'content');
  return (await query<{ bytes: Buffer }>('SELECT bytes FROM community.place_review_photo WHERE id=$1', [uuid(id, 'photo')])).rows[0]?.bytes ?? null;
}
export async function gatheringList(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const filter = choice(status || 'upcoming', ['upcoming', 'past', 'hidden'] as const, 'status'), term = search(q);
  const where = { upcoming: "g.hidden_at IS NULL AND g.state='posted' AND g.starts > now()", past: "g.hidden_at IS NULL AND (g.state<>'posted' OR g.starts <= now())", hidden: 'g.hidden_at IS NOT NULL' }[filter];
  return (await query(`SELECT g.id,g.title,g.area,g.venue,g.starts,g.seats,g.diets,g.food,g.pay,g.alcohol_free,g.state,g.hidden_at,g.hidden_reason,g.updated_at,
      u.username AS organiser,(SELECT count(*)::int FROM social.attendee a WHERE a.gathering_id=g.id) AS joined, ${openReports("'community:user:'||g.organiser_id")} AS reports
    FROM social.gathering g JOIN public."user" u ON u.id=g.organiser_id
    WHERE ${where} AND g.state<>'draft' AND ($1='' OR g.title ILIKE $1 OR g.area ILIKE $1 OR g.venue ILIKE $1 OR u.username ILIKE $1)
    ORDER BY ${filter === 'upcoming' ? 'g.starts ASC' : 'g.starts DESC NULLS LAST'}, g.id LIMIT ${pageSize} OFFSET $2`, [term, skip])).rows;
}
export async function marketItems(member: Session, status: string, q: string, skip = 0) {
  authorize(member, 'content');
  const filter = choice(status || 'active', ['active', 'paused', 'draft', 'removed'] as const, 'status'), term = search(q);
  return (await query(`SELECT l.id,l.name,l.kind,l.category,l.price_cents,l.portion,l.description,l.ingredients,l.contains,l.may_contain,l.diets,l.storage,
      l.date_mark::text AS date_mark,l.lot,l.status,l.removed_reason,l.updated_at,s.user_id AS seller_id,s.trading_name,s.status AS shop_status,u.username,
      coalesce((SELECT json_agg(p.slot ORDER BY p.slot) FROM market.photo p WHERE p.listing_id=l.id),'[]') AS photos, ${openReports("'market:listing:'||l.id")} AS reports
    FROM market.listing l JOIN market.seller s ON s.user_id=l.seller_id JOIN public."user" u ON u.id=s.user_id
    WHERE l.status=$1 AND ($2='' OR l.name ILIKE $2 OR s.trading_name ILIKE $2 OR u.username ILIKE $2)
    ORDER BY reports DESC, l.updated_at DESC, l.id LIMIT ${pageSize} OFFSET $3`, [filter, term, skip])).rows;
}
export async function marketPhoto(member: Session, id: string, slot: string) {
  authorize(member, 'content');
  return (await query<{ bytes: Buffer }>('SELECT bytes FROM market.photo WHERE listing_id=$1 AND slot=$2',
    [uuid(id, 'item'), choice(slot, ['item', 'detail', 'label'] as const, 'photo')])).rows[0]?.bytes ?? null;
}
export async function marketReviews(member: Session, status: string, skip = 0) {
  authorize(member, 'content');
  const hidden = choice(status || 'visible', ['visible', 'hidden'] as const, 'status') === 'hidden';
  return (await query(`SELECT o.id,o.rating,o.review,o.diet_matched,o.completed_at,o.review_hidden,o.buyer_name,coalesce(s.trading_name,o.seller_name) AS shop
    FROM market."order" o LEFT JOIN market.seller s ON s.user_id=o.seller_id WHERE o.rating > 0 AND o.review<>'' AND o.review_hidden=$1
    ORDER BY o.completed_at DESC NULLS LAST, o.id LIMIT ${pageSize} OFFSET $2`, [hidden, skip])).rows;
}

const memberActions = { review: ['hide', 'restore'], gathering: ['hide', 'restore'], 'market-item': ['remove', 'restore'], 'market-review': ['hide', 'restore'] } as const;
/** Hide, restore or remove one member post, with the reason in the audit log. Removing a Market item cancels its open orders. */
export async function memberAction(member: Session, kind: keyof typeof memberActions, input: Record<string, unknown>, reason: string) {
  const act = choice(input.action, memberActions[kind], 'action'), id = uuid(input.id, 'item');
  authorize(member, 'content');
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    let result, note: string | undefined;
    if (kind === 'review') result = await db.query(`UPDATE community.place_review SET hidden_at=${act === 'hide' ? 'now()' : 'NULL'}, hidden_reason=$2 WHERE id=$1 AND (hidden_at IS NULL)=$3`,
      [id, act === 'hide' ? reason : null, act === 'hide']);
    else if (kind === 'gathering') result = await db.query(`UPDATE social.gathering SET hidden_at=${act === 'hide' ? 'now()' : 'NULL'}, hidden_reason=$2, updated_at=now() WHERE id=$1 AND (hidden_at IS NULL)=$3`,
      [id, act === 'hide' ? reason : null, act === 'hide']);
    else if (kind === 'market-review') result = await db.query('UPDATE market."order" SET review_hidden=$2 WHERE id=$1 AND review_hidden<>$2', [id, act === 'hide']);
    else {
      const item = (await db.query('SELECT seller_id,status FROM market.listing WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!item) throw new HttpError(404, 'Item not found.');
      if (act === 'remove') { const told = await removeListing(db, item.seller_id, id, (text(input.note || '', 'note for the seller', 300, 0) || 'This item does not meet the QuinTaste listing rules.')); note = told ? `${told} buyer conversation(s) notified.` : undefined; }
      // A restored item returns paused, so its seller checks it and resumes it themselves.
      else result = await db.query("UPDATE market.listing SET status='paused', removed_reason='', updated_at=now() WHERE id=$1 AND status='removed'", [id]);
    }
    if (result && !result.rowCount) throw new HttpError(409, 'This changed since you opened it. Refresh the list.');
    await audit(db, member.id, `content.${kind}.${act}`, kind + ':' + id, reason, { note: input.note ?? null });
    return { saved: true, note };
  });
}
