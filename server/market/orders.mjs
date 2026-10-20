import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, member, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { fileReport, notBlocked, notRestricted } from '../community/router.mjs';
import { sgText } from '../social/rules.mjs';
import { limits, liveSeller, money, noContactDetails } from './rules.mjs';
import { eventFor } from './conversations.mjs';

/** Pre-orders for a collection slot. Buyers pay the seller at handover; QuinTaste never takes payment. */
export const orders = express.Router();
orders.use('/orders', member);
const when = at => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(at);
const open = ['requested', 'confirmed', 'ready'];
const problems = ['Wrong diet label', 'Made me unwell', 'Not as described', 'Seller did not turn up', 'Other'];

function readItems(input) {
  if (!Array.isArray(input) || !input.length || input.length > 10) throw new CommunityError(400, 'Choose 1 to 10 items.');
  const items = new Map();
  for (const item of input) {
    const id = requireId(item?.listingId, 'An item is unavailable.'), quantity = Number(item?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new CommunityError(400, 'Choose a valid quantity.');
    items.set(id, (items.get(id) ?? 0) + quantity);
  }
  return [...items].map(([listingId, quantity]) => ({ listingId, quantity }));
}
orders.post('/orders', async (req, res) => {
  const me = res.locals.user.id, b = req.body ?? {}, sellerId = requireUser(b.sellerId), slotId = requireId(b.slotId, 'This collection slot is unavailable.');
  if (sellerId === me) throw new CommunityError(400, 'You can’t order from your own shop.');
  const wanted = readItems(b.items), note = noContactDetails(text(b.note, 300, { field: 'Note' }), 'Note');
  await throttle('market-order:' + me, 20, 3600);
  const result = await transaction(async db => {
    const shop = (await db.query(`SELECT s.trading_name, s.meetup, s.delivery, s.delivery_fee_cents, s.delivery_min_cents, s.pay_cash, s.pay_paynow FROM market.seller s WHERE s.user_id=$1 AND ${liveSeller('s')}
      AND ${notBlocked('s.user_id', '$2')} AND ${notRestricted('s.user_id')} FOR SHARE OF s`, [sellerId, me])).rows[0];
    if (!shop) throw new CommunityError(404, 'This shop is unavailable.');
    const slot = (await db.query(`SELECT * FROM market.slot WHERE id=$1 AND seller_id=$2 AND status='open' FOR UPDATE`, [slotId, sellerId])).rows[0];
    if (!slot || slot.starts.getTime() - slot.cutoff_hours * 3600000 <= Date.now()) throw new CommunityError(409, 'Orders for this slot have closed. Choose another time.');
    const booked = Number((await db.query(`SELECT count(*) FROM market."order" WHERE slot_id=$1 AND status IN ('requested','confirmed','ready','completed','disputed')`, [slotId])).rows[0].count);
    if (booked >= slot.capacity) throw new CommunityError(409, 'This slot is full. Choose another time.');
    if (Number((await db.query(`SELECT count(*) FROM market."order" WHERE buyer_id=$1 AND status IN ('requested','confirmed','ready')`, [me])).rows[0].count) >= 20) {
      throw new CommunityError(409, 'You have 20 open orders. Collect or cancel some first.');
    }
    const day = new Date(slot.starts.getTime() + 8 * 3600000).toISOString().slice(0, 10), lines = [];
    for (const want of wanted) {
      const l = (await db.query(`SELECT id, name, price_cents, max_per_order, per_slot, lead_days, date_mark::text AS date_mark, lot FROM market.listing
        WHERE id=$1 AND seller_id=$2 AND status='active'`, [want.listingId, sellerId])).rows[0];
      if (!l) throw new CommunityError(409, 'An item in your order is no longer available.');
      if (want.quantity > Math.min(l.max_per_order, limits.perOrder)) throw new CommunityError(409, `${l.name}: up to ${l.max_per_order} per order.`);
      if (slot.starts.getTime() < Date.now() + l.lead_days * 86400000) throw new CommunityError(409, `${l.name} needs ${l.lead_days} days' notice. Choose a later slot.`);
      if (l.date_mark && l.date_mark < day) throw new CommunityError(409, `${l.name} passes its date mark before this slot.`);
      if (l.per_slot !== null) {
        // The slot row is locked above, so two buyers can't both take the last units.
        const used = Number((await db.query(`SELECT coalesce(sum(i.quantity), 0) AS used FROM market.order_item i JOIN market."order" o ON o.id=i.order_id
          WHERE o.slot_id=$1 AND i.listing_id=$2 AND o.status IN ('requested','confirmed','ready','completed','disputed')`, [slotId, l.id])).rows[0].used);
        const left = Math.max(0, l.per_slot - used);
        if (want.quantity > left) throw new CommunityError(409, left ? `${l.name}: only ${left} left for this slot.` : `${l.name} is sold out for this slot. Choose another time.`);
      }
      lines.push({ ...l, quantity: want.quantity });
    }
    const delivery = slot.mode === 'delivery';
    const address = delivery ? text(b.address, 200, { min: 5, field: 'Delivery address' }) : '', contact = delivery ? text(b.contact, 40, { min: 8, field: 'Contact number' }) : '';
    if (!(delivery ? shop.delivery : shop.meetup)) {
      throw new CommunityError(409, delivery ? 'This shop is not delivering right now.' : 'This shop is not offering meetup collection right now.');
    }
    const payment = b.payment === 'paynow' ? 'paynow' : 'cash';
    if (!(payment === 'cash' ? shop.pay_cash : shop.pay_paynow)) throw new CommunityError(400, 'Choose a payment method this seller accepts.');
    const subtotal = lines.reduce((sum, l) => sum + l.price_cents * l.quantity, 0), fee = delivery ? shop.delivery_fee_cents : 0;
    if (delivery && subtotal < shop.delivery_min_cents) throw new CommunityError(409, `Delivery needs at least ${money(shop.delivery_min_cents)} of items. Add more or choose meetup.`);
    // Names are kept on the order so either side still sees who it was with after the other deletes their account.
    const order = (await db.query(`INSERT INTO market."order"(buyer_id,seller_id,buyer_name,seller_name,slot_id,starts,ends,mode,place,address,contact,note,
        subtotal_cents,delivery_fee_cents,total_cents,payment) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [me, sellerId, String(res.locals.user.name ?? '').slice(0, 80), shop.trading_name.slice(0, 80), slotId, slot.starts, slot.ends, slot.mode, slot.place,
        address, contact, note, subtotal, fee, subtotal + fee, payment])).rows[0];
    for (const l of lines) await db.query(`INSERT INTO market.order_item(order_id,listing_id,name,price_cents,quantity,date_mark,lot) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [order.id, l.id, l.name, l.price_cents, l.quantity, l.date_mark, l.lot]);
    const conversationId = await eventFor(db, me, sellerId, order.id, `New order · ${money(subtotal + fee)} · ${when(slot.starts)}`);
    return { id: order.id, conversationId };
  }, 'market-slot:' + slotId);
  res.status(201).json(result);
});
const listColumns = `o.id, o.status, o.total_cents AS "totalCents", ${sgText('o.starts')} AS starts, o.mode, o.place, o.created_at AS "createdAt",
  (SELECT string_agg(i.quantity || ' × ' || i.name, ', ') FROM market.order_item i WHERE i.order_id=o.id) AS summary`;
orders.get('/orders', async (req, res) => {
  const me = res.locals.user.id, selling = req.query.role === 'sell';
  const rows = (await pool.query(`SELECT ${listColumns}, ${selling ? 'coalesce(u.name, o.buyer_name)' : 'coalesce(s.trading_name, o.seller_name)'} AS "otherName", o.rating
    FROM market."order" o LEFT JOIN market.seller s ON s.user_id=o.seller_id LEFT JOIN public."user" u ON u.id=o.buyer_id
    WHERE ${selling ? 'o.seller_id' : 'o.buyer_id'}=$1 ORDER BY (o.status IN ('requested','confirmed','ready')) DESC, o.starts DESC LIMIT 100`, [me])).rows;
  res.json({ items: rows });
});
async function participant(db, id, me, lock = false) {
  const row = (await db.query(`SELECT o.*, coalesce(s.trading_name, o.seller_name) AS seller_name, coalesce(u.name, o.buyer_name) AS buyer_name FROM market."order" o LEFT JOIN market.seller s ON s.user_id=o.seller_id
    LEFT JOIN public."user" u ON u.id=o.buyer_id WHERE o.id=$1 ${lock ? 'FOR UPDATE OF o' : ''}`, [id])).rows[0];
  if (!row || (row.buyer_id !== me && row.seller_id !== me)) throw new CommunityError(404, 'This order is unavailable.');
  return row;
}
orders.get('/orders/:id', async (req, res) => {
  const me = res.locals.user.id, o = await participant(pool, requireId(req.params.id), me), buyer = o.buyer_id === me;
  const items = (await pool.query(`SELECT listing_id AS "listingId", name, price_cents AS "priceCents", quantity, date_mark::text AS "dateMark", lot
    FROM market.order_item WHERE order_id=$1`, [o.id])).rows;
  const closed = !o.buyer_id || !o.seller_id;
  const conversation = closed ? null : (await pool.query('SELECT id FROM market.conversation WHERE buyer_id=$1 AND seller_id=$2', [o.buyer_id, o.seller_id])).rows[0];
  res.json({ id: o.id, role: buyer ? 'buyer' : 'seller', status: o.status, statusReason: o.status_reason, starts: fmt(o.starts), ends: fmt(o.ends), mode: o.mode,
    place: o.place, address: o.address, contact: o.contact, note: o.note, payment: o.payment, subtotalCents: o.subtotal_cents, deliveryFeeCents: o.delivery_fee_cents,
    totalCents: o.total_cents, rating: o.rating, review: o.review, dietMatched: o.diet_matched, createdAt: o.created_at, completedAt: o.completed_at,
    cutoffPassed: await cutoffPassed(o), seller: { id: o.seller_id, name: o.seller_name }, buyer: { name: o.buyer_name },
    conversationId: conversation?.id ?? null, closed, items });
});
const fmt = at => new Date(at.getTime() + 8 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
async function cutoffPassed(o) {
  const slot = o.slot_id ? (await pool.query('SELECT cutoff_hours FROM market.slot WHERE id=$1', [o.slot_id])).rows[0] : null;
  return o.starts.getTime() - (slot?.cutoff_hours ?? 0) * 3600000 <= Date.now();
}
/** Each step is checked against the caller's role, the order status and the slot time. */
function step(o, me, input, cutoff) {
  const buyer = o.buyer_id === me, seller = o.seller_id === me, s = o.status, started = o.starts.getTime() <= Date.now();
  const need = (ok, message) => { if (!ok) throw new CommunityError(409, message); };
  const reason = () => text(input?.reason, 200, { min: 3, field: 'Reason' });
  switch (input?.action) {
    case 'confirm': need(seller && s === 'requested', 'Only a new order can be confirmed.'); return { set: { status: 'confirmed' }, note: 'Order confirmed' };
    case 'decline': need(seller && s === 'requested', 'Only a new order can be declined.'); return { set: { status: 'declined', status_reason: reason() }, note: 'Order declined' };
    case 'ready': need(seller && s === 'confirmed', 'Confirm the order first.'); return { set: { status: 'ready' }, note: 'Order ready for collection' };
    // Only after the slot starts, so an order can't be completed (and reviewed) without a real handover.
    case 'complete': need(seller && ['confirmed', 'ready'].includes(s) && started, 'Mark it handed over once the collection slot starts.');
      return { set: { status: 'completed', completed_at: new Date() }, note: 'Handed over and paid' };
    case 'no-show': need(seller && ['confirmed', 'ready'].includes(s) && started, 'Mark a no-show after the slot starts.'); return { set: { status: 'no_show' }, note: 'Buyer did not collect' };
    case 'cancel':
      if (seller) { need(open.includes(s), 'This order is already closed.'); return { set: { status: 'cancelled', status_reason: reason() }, note: 'Order cancelled by the seller' }; }
      need(buyer && (s === 'requested' || (open.includes(s) && !cutoff)), 'The order cut-off has passed. Message the seller instead.');
      return { set: { status: 'cancelled', status_reason: 'Cancelled by the buyer.' }, note: 'Order cancelled by the buyer' };
    case 'review': {
      need(buyer && s === 'completed' && Date.now() - o.completed_at.getTime() < 30 * 86400000, 'Review completed orders within 30 days.');
      const rating = Number(input.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new CommunityError(400, 'Choose a rating from 1 to 5.');
      if (typeof input.dietMatched !== 'boolean') throw new CommunityError(400, 'Say whether the food matched its diet label.');
      return { set: { rating, review: noContactDetails(text(input.review, 300, { field: 'Review' }), 'Review'), diet_matched: input.dietMatched }, note: null };
    }
    case 'problem': {
      const recent = (s === 'completed' && Date.now() - o.completed_at.getTime() < 7 * 86400000) || (open.includes(s) && started) || s === 'no_show';
      need(buyer && recent, 'Report a problem within 7 days of collection.');
      if (!problems.includes(input.problem)) throw new CommunityError(400, 'Choose what went wrong.');
      return { set: { status: 'disputed', status_reason: input.problem }, note: 'Problem reported', report: true };
    }
    default: throw new CommunityError(400, 'Choose a valid action.');
  }
}
orders.post('/orders/:id/actions', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id);
  await throttle('market-order-action:' + me, 60, 3600);
  const before = await participant(pool, id, me), cutoff = await cutoffPassed(before);
  const details = req.body?.action === 'problem' ? text(req.body?.details, 1000, { field: 'Details' }) : '';
  const result = await transaction(async db => {
    const o = await participant(db, id, me, true);
    if (!o.buyer_id || !o.seller_id) throw new CommunityError(409, 'The other person deleted their account. This order is closed.');
    const outcome = step(o, me, req.body, cutoff), keys = Object.keys(outcome.set);
    await db.query(`UPDATE market."order" SET ${keys.map((key, i) => `${key}=$${i + 2}`).join(', ')}, updated_at=now() WHERE id=$1`, [id, ...keys.map(key => outcome.set[key])]);
    if (outcome.note) await eventFor(db, o.buyer_id, o.seller_id, id, `${outcome.note} · ${money(o.total_cents)}`);
    // Filed in the same transaction, so a refused or repeated action never leaves a stray case.
    if (outcome.report) {
      await fileReport(me, { subject: 'market:order:' + id, title: 'Market order · ' + req.body.problem,
        description: [`Seller: ${o.seller_name}`, `Order total: ${money(o.total_cents)}`, `Problem: ${req.body.problem}`, details || 'No details given.'].join('\n') }, db);
    }
    return { o, outcome };
  }, 'market-slot:' + (before.slot_id ?? id));
  res.json({ status: result.outcome.set.status ?? result.o.status });
});
/** Delivery addresses and phone numbers are cleared 30 days after an order closes. Disputed orders keep them 180 days for review. */
export async function purgeOrderContacts() {
  const result = await pool.query(`UPDATE market."order" SET address='', contact='' WHERE (address <> '' OR contact <> '')
    AND ((status IN ('completed','declined','cancelled','no_show') AND updated_at < now() - interval '30 days')
      OR (status='disputed' AND updated_at < now() - interval '180 days'))`);
  return result.rowCount;
}
