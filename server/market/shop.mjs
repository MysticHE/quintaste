import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, list, member, requireId, requireUser } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { sgText } from '../social/rules.mjs';
import { categories, diets, ingredients, liveSeller, slots } from './rules.mjs';
import { slotColumns } from './seller-shop.mjs';

/** Public browsing of live shops. Guests may read; saving needs a signed-in member. */
export const shop = express.Router();
const photoUrl = (id, slot, digest) => digest ? `/api/market/photos/${id}/${slot}?v=${digest.slice(0, 12)}` : null;
const today = `(now() AT TIME ZONE 'Asia/Singapore')::date`;
const visible = `l.status='active' AND ${liveSeller('s')} AND ${notRestricted('s.user_id')} AND (l.date_mark IS NULL OR l.date_mark > ${today})`;
/** A slot is offered only while the shop still has that collection mode switched on. */
const modeOn = (slot, seller) => `((${slot}.mode='meetup' AND ${seller}.meetup) OR (${slot}.mode='delivery' AND ${seller}.delivery))`;
/** Listings with their earliest orderable slot (lead time, cut-off, capacity), computed once per row. */
const fromListings = `market.listing l JOIN market.seller s ON s.user_id=l.seller_id LEFT JOIN LATERAL (SELECT min(x.starts) AS starts FROM market.slot x
  WHERE x.seller_id=l.seller_id AND x.status='open' AND ${modeOn('x', 's')} AND x.starts - make_interval(hours => x.cutoff_hours) > now()
    AND x.starts >= now() + make_interval(days => l.lead_days)
    AND (SELECT count(*) FROM market."order" o WHERE o.slot_id=x.id AND o.status IN ('requested','confirmed','ready','completed','disputed')) < x.capacity) n ON true`;
const cardColumns = `l.id, l.name, l.price_cents AS "priceCents", l.portion, l.category, l.kind, l.diets, l.seller_id AS "sellerId",
  s.trading_name AS "sellerName", s.area, ${sgText('n.starts')} AS "nextSlot", l.lead_days AS "leadDays", l.max_per_order AS "maxPerOrder",
  (SELECT digest FROM market.photo p WHERE p.listing_id=l.id AND p.slot='item') AS digest`;
const card = ({ digest, ...row }, saved = false) => ({ ...row, saved, photo: photoUrl(row.id, 'item', digest) });
const like = value => '%' + value.trim().slice(0, 60).replace(/[\\%_]/g, '\\$&') + '%';

shop.get('/listings', async (req, res) => {
  const viewer = res.locals.user?.id ?? null, q = req.query, params = [viewer], where = [visible];
  const add = value => { params.push(value); return '$' + params.length; };
  if (viewer) where.push(`s.user_id <> $1 AND ${notBlocked('s.user_id', '$1')}`);
  if (typeof q.q === 'string' && q.q.trim()) where.push(`(l.name || ' ' || l.description || ' ' || s.trading_name || ' ' || s.area) ILIKE ${add(like(q.q))}`);
  if (categories.includes(q.category)) where.push(`l.category = ${add(q.category)}`);
  if (q.kind === 'made' || q.kind === 'prepacked') where.push(`l.kind = ${add(q.kind)}`);
  if (q.mode === 'meetup' || q.mode === 'delivery') where.push(`s.${q.mode}`);
  if (typeof q.area === 'string' && q.area.trim()) where.push(`(s.area || ' ' || s.delivery_areas) ILIKE ${add(like(q.area))}`);
  const wanted = list(typeof q.diets === 'string' ? q.diets.split(',') : [], diets);
  if (wanted.length) where.push(`l.diets @> ${add(wanted)}::text[]`);
  const exclude = list(typeof q.exclude === 'string' ? q.exclude.split(',') : [], ingredients);
  if (exclude.length) { const tags = add(exclude); where.push(`NOT (l.contains && ${tags}::text[] OR l.may_contain && ${tags}::text[])`); }
  if (q.saved === '1') { if (!viewer) throw new CommunityError(401, 'Sign in to see saved items.', 'SIGN_IN'); where.push('EXISTS (SELECT 1 FROM market.saved v WHERE v.user_id=$1 AND v.listing_id=l.id)'); }
  if (q.available === '1') where.push('n.starts IS NOT NULL');
  const order = q.sort === 'low' ? 'l.price_cents ASC' : q.sort === 'high' ? 'l.price_cents DESC' : q.sort === 'soon' ? 'n.starts ASC NULLS LAST' : 'l.updated_at DESC';
  const offset = Math.min(Math.max(Number(q.cursor) || 0, 0), 2000);
  const rows = (await pool.query(`SELECT ${cardColumns}, EXISTS (SELECT 1 FROM market.saved v WHERE v.user_id=$1 AND v.listing_id=l.id) AS saved
    FROM ${fromListings} WHERE ${where.join(' AND ')} ORDER BY ${order}, l.id LIMIT 21 OFFSET ${add(offset)}`, params)).rows;
  res.json({ items: rows.slice(0, 20).map(({ saved, ...row }) => card(row, saved)), next: rows.length > 20 ? offset + 20 : null });
});
async function bookable(sellerId, leadDays = 0) {
  return (await pool.query(`SELECT ${slotColumns} FROM market.slot s JOIN market.seller m ON m.user_id=s.seller_id
    WHERE s.seller_id=$1 AND s.status='open' AND ${modeOn('s', 'm')} AND s.starts - make_interval(hours => s.cutoff_hours) > now() AND s.starts >= now() + make_interval(days => $2::int)
      AND (SELECT count(*) FROM market."order" o WHERE o.slot_id=s.id AND o.status IN ('requested','confirmed','ready','completed','disputed')) < s.capacity
    ORDER BY s.starts,s.id LIMIT 20`, [sellerId, leadDays]))
    .rows.map(({ booked, ...slot }) => ({ ...slot, remaining: slot.capacity - booked }));
}
/** What a buyer sees about a seller: their shop, how they hand over, and their order history. QuinTaste does not pre-check sellers. */
const trustColumns = `s.user_id AS id, s.trading_name AS "tradingName", s.area, s.about, s.meetup, s.delivery, s.delivery_fee_cents AS "deliveryFeeCents",
  s.delivery_areas AS "deliveryAreas", s.pay_cash AS "payCash", s.pay_paynow AS "payPaynow", s.opened_at AS since,
  (SELECT count(*)::int FROM market."order" o WHERE o.seller_id=s.user_id AND o.status='completed') AS completed,
  (SELECT count(*)::int FROM market."order" o WHERE o.seller_id=s.user_id AND o.rating > 0) AS ratings,
  (SELECT round(avg(rating), 1)::float FROM market."order" o WHERE o.seller_id=s.user_id AND o.rating > 0) AS rating`;
/** Ratings stay private until a shop has five, so one review cannot define it. */
const publicRating = row => ({ ...row, rating: row.ratings >= 5 ? row.rating : null });
async function liveShop(id, viewer) {
  const row = (await pool.query(`SELECT ${trustColumns} FROM market.seller s WHERE s.user_id=$1 AND ${liveSeller('s')} AND ${notRestricted('s.user_id')}
    ${viewer ? `AND ${notBlocked('s.user_id', '$2')}` : ''}`, viewer ? [id, viewer] : [id])).rows[0];
  return row ? publicRating(row) : null;
}
shop.get('/listings/:id', async (req, res) => {
  const viewer = res.locals.user?.id ?? null, id = requireId(req.params.id);
  const row = (await pool.query(`SELECT ${cardColumns}, l.description, l.ingredients, l.contains, l.may_contain AS "mayContain", l.storage,
      l.date_mark::text AS "dateMark", l.lot
    FROM ${fromListings} WHERE l.id=$1 AND ${visible}`, [id])).rows[0];
  const seller = row && await liveShop(row.sellerId, viewer);
  if (!row || !seller) throw new CommunityError(404, 'This item is unavailable.');
  const photos = Object.fromEntries((await pool.query('SELECT slot, digest FROM market.photo WHERE listing_id=$1', [id])).rows.map(p => [p.slot, photoUrl(id, p.slot, p.digest)]));
  const saved = viewer ? (await pool.query('SELECT 1 FROM market.saved WHERE user_id=$1 AND listing_id=$2', [viewer, id])).rowCount > 0 : false;
  res.json({ ...card(row, saved), photos, seller, own: viewer === row.sellerId, slots: await bookable(row.sellerId, row.leadDays) });
});
shop.get('/shops/:id', async (req, res) => {
  const viewer = res.locals.user?.id ?? null, id = requireUser(req.params.id), seller = await liveShop(id, viewer);
  if (!seller) throw new CommunityError(404, 'This shop is unavailable.');
  const [items, reviews] = await Promise.all([
    pool.query(`SELECT ${cardColumns} FROM ${fromListings} WHERE l.seller_id=$1 AND ${visible} ORDER BY l.updated_at DESC LIMIT 60`, [id]),
    seller.rating === null ? { rows: [] } : pool.query(`SELECT rating, CASE WHEN review_hidden THEN '' ELSE review END AS review, diet_matched AS "dietMatched", completed_at AS at FROM market."order"
      WHERE seller_id=$1 AND rating > 0 ORDER BY completed_at DESC LIMIT 20`, [id]),
  ]);
  res.json({ ...seller, own: viewer === id, items: items.rows.map(row => card(row)), reviews: reviews.rows, slots: await bookable(id) });
});
shop.get('/photos/:id/:slot', async (req, res) => {
  if (!slots.includes(req.params.slot)) throw new CommunityError(404, 'Photo unavailable.');
  const row = (await pool.query(`SELECT p.bytes FROM market.photo p JOIN market.listing l ON l.id=p.listing_id JOIN market.seller s ON s.user_id=l.seller_id
    WHERE p.listing_id=$1 AND p.slot=$2 AND ${visible}`, [requireId(req.params.id), req.params.slot])).rows[0];
  if (!row) throw new CommunityError(404, 'Photo unavailable.');
  // Private and short: a removed or blocked listing's photo must not outlive it in shared caches.
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300', 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Content-Type-Options': 'nosniff' }).send(row.bytes);
});
shop.post('/saved/:id', member, async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id);
  // Unsaving always works; saving needs a visible listing from a shop that is not blocked either way.
  const removed = (await pool.query('DELETE FROM market.saved WHERE user_id=$1 AND listing_id=$2', [me, id])).rowCount > 0;
  if (!removed) {
    const exists = (await pool.query(`SELECT 1 FROM market.listing l JOIN market.seller s ON s.user_id=l.seller_id WHERE l.id=$1 AND ${visible}
      AND ${notBlocked('s.user_id', '$2')}`, [id, me])).rowCount;
    if (!exists) throw new CommunityError(404, 'This item is unavailable.');
    if (Number((await pool.query('SELECT count(*) FROM market.saved WHERE user_id=$1', [me])).rows[0].count) >= 200) throw new CommunityError(409, 'You have 200 saved items. Remove some first.');
    await pool.query('INSERT INTO market.saved(user_id,listing_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [me, id]);
  }
  res.json({ saved: !removed });
});
