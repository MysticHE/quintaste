import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, requireId, text, throttle, transaction } from '../community/http.mjs';
import { readFuture, sgText } from '../social/rules.mjs';
import { limits, listingProblem, money, noContactDetails, processPhoto, readListing, slots } from './rules.mjs';
import { eventFor } from './conversations.mjs';

/** A seller's own listings, photos and collection slots. */
export const sellerShop = express.Router();
const photoUrl = (id, slot, digest) => `/api/market/seller/photos/${id}/${slot}?v=${digest.slice(0, 12)}`;
const listingColumns = `l.id, l.kind, l.name, l.category, l.price_cents AS "priceCents", l.portion, l.description, l.ingredients, l.contains,
  l.may_contain AS "mayContain", l.diets, l.storage, l.date_mark::text AS "dateMark", l.lot, l.lead_days AS "leadDays", l.max_per_order AS "maxPerOrder",
  l.status, l.removed_reason AS "removedReason", l.updated_at AS "updatedAt"`;
async function seller(db, me, lock = false) {
  const row = (await db.query(`SELECT user_id AS id, status, meetup, delivery FROM market.seller WHERE user_id=$1 ${lock ? 'FOR UPDATE' : ''}`, [me])).rows[0];
  if (!row) throw new CommunityError(404, 'Set up your shop first.');
  if (['suspended', 'removed'].includes(row.status)) throw new CommunityError(403, 'This shop is suspended. Contact QuinTaste support.');
  return row;
}
async function withPhotos(rows) {
  if (!rows.length) return rows;
  const photos = (await pool.query('SELECT listing_id, slot, digest FROM market.photo WHERE listing_id = ANY($1)', [rows.map(r => r.id)])).rows;
  return rows.map(row => ({ ...row, photos: Object.fromEntries(photos.filter(p => p.listing_id === row.id).map(p => [p.slot, photoUrl(row.id, p.slot, p.digest)])) }));
}
sellerShop.get('/listings', async (_req, res) => {
  const me = res.locals.user.id;
  res.json({ items: await withPhotos((await pool.query(`SELECT ${listingColumns} FROM market.listing l WHERE l.seller_id=$1 ORDER BY l.updated_at DESC`, [me])).rows) });
});
sellerShop.get('/listings/:id', async (req, res) => {
  const row = (await pool.query(`SELECT ${listingColumns} FROM market.listing l WHERE l.id=$1 AND l.seller_id=$2`, [requireId(req.params.id), res.locals.user.id])).rows[0];
  if (!row) throw new CommunityError(404, 'This item is unavailable.');
  res.json((await withPhotos([row]))[0]);
});
async function photoChanges(input) {
  const changes = {};
  for (const slot of slots) {
    if (input?.[slot] === null) changes[slot] = null;
    else if (typeof input?.[slot] === 'string') changes[slot] = await processPhoto(input[slot]);
  }
  return changes;
}
/** Saves a listing and its photos together; publishing needs an open shop and passes every listing rule. */
async function save(req, res, id) {
  const me = res.locals.user.id, publish = req.body?.publish === true;
  await throttle('market-listing:' + me, 90, 3600);
  await seller(pool, me); // fail fast before decoding photos
  const l = readListing(req.body?.listing), changes = await photoChanges(req.body?.photos);
  const saved = await transaction(async db => {
    const shop = await seller(db, me, true);
    if (publish && shop.status !== 'active') throw new CommunityError(409, 'Open your shop first, then publish. Save it as a draft for now.');
    if (id) {
      const row = (await db.query('SELECT status FROM market.listing WHERE id=$1 AND seller_id=$2 FOR UPDATE', [id, me])).rows[0];
      if (!row) throw new CommunityError(404, 'This item is unavailable.');
      if (row.status === 'removed') throw new CommunityError(403, 'QuinTaste removed this item. Contact support.');
    } else if (Number((await db.query('SELECT count(*) FROM market.listing WHERE seller_id=$1', [me])).rows[0].count) >= 60) {
      throw new CommunityError(409, 'You have 60 items. Delete an old one first.');
    }
    const values = [l.kind, l.name, l.category, l.priceCents, l.portion, l.description, l.ingredients, l.contains, l.mayContain, l.diets, l.storage, l.dateMark, l.lot, l.leadDays, l.maxPerOrder];
    const row = id ? (await db.query(`UPDATE market.listing SET kind=$1,name=$2,category=$3,price_cents=$4,portion=$5,description=$6,ingredients=$7,contains=$8,
        may_contain=$9,diets=$10,storage=$11,date_mark=$12,lot=$13,lead_days=$14,max_per_order=$15,updated_at=now() WHERE id=$16 RETURNING id`, [...values, id])).rows[0]
      : (await db.query(`INSERT INTO market.listing(seller_id,kind,name,category,price_cents,portion,description,ingredients,contains,may_contain,diets,storage,
        date_mark,lot,lead_days,max_per_order) VALUES($16,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`, [...values, me])).rows[0];
    for (const [slot, photo] of Object.entries(changes)) {
      if (!photo) await db.query('DELETE FROM market.photo WHERE listing_id=$1 AND slot=$2', [row.id, slot]);
      else await db.query(`INSERT INTO market.photo(listing_id,slot,bytes,digest) VALUES($1,$2,$3,$4)
        ON CONFLICT(listing_id,slot) DO UPDATE SET bytes=$3,digest=$4,updated_at=now()`, [row.id, slot, photo.bytes, photo.digest]);
    }
    // Each kind has its own second photo; drop the other kind's so a changed item never shows a stale one.
    await db.query('DELETE FROM market.photo WHERE listing_id=$1 AND slot=$2', [row.id, l.kind === 'made' ? 'label' : 'detail']);
    const present = new Set((await db.query('SELECT slot FROM market.photo WHERE listing_id=$1', [row.id])).rows.map(p => p.slot));
    if (publish) { const problem = listingProblem(l, present); if (problem) throw new CommunityError(400, problem); }
    await db.query('UPDATE market.listing SET status=$2 WHERE id=$1', [row.id, publish ? 'active' : 'draft']);
    return row.id;
  }, 'market-seller:' + me);
  res.status(id ? 200 : 201).json({ id: saved });
}
sellerShop.post('/listings', (req, res) => save(req, res, null));
sellerShop.put('/listings/:id', (req, res) => save(req, res, requireId(req.params.id)));
sellerShop.post('/listings/:id/status', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id), status = req.body?.status;
  if (!['active', 'paused'].includes(status)) throw new CommunityError(400, 'Choose a valid status.');
  await transaction(async db => {
    const shop = await seller(db, me, true);
    const row = (await db.query(`SELECT ${listingColumns} FROM market.listing l WHERE l.id=$1 AND l.seller_id=$2 FOR UPDATE`, [id, me])).rows[0];
    if (!row || row.status === 'removed') throw new CommunityError(404, 'This item is unavailable.');
    if (status === 'active') {
      if (shop.status !== 'active') throw new CommunityError(409, 'Open your shop first, then publish.');
      const present = new Set((await db.query('SELECT slot FROM market.photo WHERE listing_id=$1', [id])).rows.map(p => p.slot));
      const problem = listingProblem(row, present); if (problem) throw new CommunityError(400, problem);
    }
    await db.query('UPDATE market.listing SET status=$2, updated_at=now() WHERE id=$1', [id, status]);
  }, 'market-seller:' + me);
  res.json({ status });
});
sellerShop.delete('/listings/:id', async (req, res) => {
  const result = await pool.query("DELETE FROM market.listing WHERE id=$1 AND seller_id=$2 AND status<>'removed'", [requireId(req.params.id), res.locals.user.id]);
  if (!result.rowCount) throw new CommunityError(404, 'This item is unavailable.');
  res.json({ deleted: true });
});
sellerShop.get('/photos/:id/:slot', async (req, res) => {
  if (!slots.includes(req.params.slot)) throw new CommunityError(404, 'Photo unavailable.');
  const row = (await pool.query(`SELECT p.bytes FROM market.photo p JOIN market.listing l ON l.id=p.listing_id
    WHERE p.listing_id=$1 AND p.slot=$2 AND l.seller_id=$3`, [requireId(req.params.id), req.params.slot, res.locals.user.id])).rows[0];
  if (!row) throw new CommunityError(404, 'Photo unavailable.');
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' }).send(row.bytes);
});

const slotColumns = `s.id, ${sgText('s.starts')} AS starts, ${sgText('s.ends')} AS ends, s.mode, s.place, s.capacity, s.cutoff_hours AS "cutoffHours", s.status,
  (SELECT count(*)::int FROM market."order" o WHERE o.slot_id=s.id AND o.status IN ('requested','confirmed','ready','completed','disputed')) AS booked`;
export { slotColumns };
sellerShop.get('/slots', async (_req, res) => {
  const rows = (await pool.query(`SELECT ${slotColumns} FROM market.slot s WHERE s.seller_id=$1 AND s.ends > now() - interval '14 days'
    ORDER BY s.starts LIMIT 100`, [res.locals.user.id])).rows;
  res.json({ items: rows });
});
function readSlot(body) {
  body ??= {};
  const starts = readFuture(body.starts, 'Start time'), ends = readFuture(body.ends, 'End time');
  if (ends <= starts || ends.getTime() - starts.getTime() > 12 * 3600000) throw new CommunityError(400, 'End the slot after it starts, within 12 hours.');
  if (starts.getTime() - Date.now() > 60 * 86400000) throw new CommunityError(400, 'Open slots up to 60 days ahead.');
  const mode = body.mode === 'delivery' ? 'delivery' : 'meetup', limit = limits.perSlot, capacity = Number(body.capacity), cutoff = Number(body.cutoffHours ?? 24);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > limit) throw new CommunityError(400, `Take 1 to ${limit} orders per slot.`);
  if (!Number.isInteger(cutoff) || cutoff < 0 || cutoff > 336) throw new CommunityError(400, 'Close orders 0 to 336 hours before the slot.');
  const place = noContactDetails(text(body.place, 120, { min: mode === 'meetup' ? 3 : 0, field: mode === 'meetup' ? 'Meetup point' : 'Delivery note' }), 'Meetup point');
  return { starts, ends, mode, place, capacity, cutoff };
}
sellerShop.post('/slots', async (req, res) => {
  const me = res.locals.user.id;
  await throttle('market-slot:' + me, 60, 3600);
  const id = await transaction(async db => {
    const shop = await seller(db, me, true), s = readSlot(req.body);
    if (!shop[s.mode]) throw new CommunityError(400, s.mode === 'delivery' ? 'Turn on delivery in your shop settings first.' : 'Turn on meetup collection in your shop settings first.');
    if (Number((await db.query('SELECT count(*) FROM market.slot WHERE seller_id=$1 AND ends > now()', [me])).rows[0].count) >= 40) throw new CommunityError(409, 'You have 40 upcoming slots.');
    return (await db.query(`INSERT INTO market.slot(seller_id,starts,ends,mode,place,capacity,cutoff_hours) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [me, s.starts, s.ends, s.mode, s.place, s.capacity, s.cutoff])).rows[0].id;
  }, 'market-seller:' + me);
  res.status(201).json({ id });
});
/** Close stops new orders; cancel also cancels the slot's open orders and tells each buyer. */
sellerShop.post('/slots/:id/status', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id), status = req.body?.status;
  if (!['open', 'closed', 'cancelled'].includes(status)) throw new CommunityError(400, 'Choose a valid status.');
  await transaction(async db => {
    await seller(db, me, true);
    const slot = (await db.query('SELECT status FROM market.slot WHERE id=$1 AND seller_id=$2 FOR UPDATE', [id, me])).rows[0];
    if (!slot || slot.status === 'cancelled') throw new CommunityError(404, 'This slot is unavailable.');
    await db.query('UPDATE market.slot SET status=$2 WHERE id=$1', [id, status]);
    if (status !== 'cancelled') return;
    const open = (await db.query(`UPDATE market."order" SET status='cancelled', status_reason='The seller cancelled this collection slot.', updated_at=now()
      WHERE slot_id=$1 AND status IN ('requested','confirmed','ready') RETURNING id, buyer_id, total_cents`, [id])).rows;
    for (const order of open) await eventFor(db, order.buyer_id, me, order.id, `Order cancelled by the seller · ${money(order.total_cents)}`);
  }, 'market-seller:' + me);
  res.json({ status });
});
