import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, throttle, transaction } from '../community/http.mjs';
import { declarationsVersion, readSeller, sellerProblem } from './rules.mjs';

/**
 * A member's own shop. Mounted under /api/market/seller for signed-in members. Any member can open a shop by completing it and
 * accepting the current declarations; QuinTaste does not pre-check sellers. Staff can suspend or remove shops after reports.
 */
export const sellerProfile = express.Router();
const columns = `trading_name AS "tradingName", about, area, meetup, delivery, delivery_fee_cents AS "deliveryFeeCents", delivery_areas AS "deliveryAreas",
  delivery_min_cents AS "deliveryMinCents", pay_cash AS "payCash", pay_paynow AS "payPaynow", declarations_version AS "declarationsVersion", status, status_note AS "statusNote", opened_at AS "openedAt"`;
const blocked = status => ['suspended', 'removed'].includes(status);

async function load(db, me, lock = false) {
  return (await db.query(`SELECT ${columns} FROM market.seller WHERE user_id=$1 ${lock ? 'FOR UPDATE' : ''}`, [me])).rows[0] ?? null;
}
sellerProfile.get('/', async (_req, res) => {
  res.json({ seller: await load(pool, res.locals.user.id), declarationsVersion });
});
/** Creates or updates the shop. An open shop must stay complete. */
sellerProfile.put('/', async (req, res) => {
  const me = res.locals.user.id, s = readSeller(req.body?.seller);
  await throttle('market-seller-profile:' + me, 120, 3600);
  const seller = await transaction(async db => {
    const current = await load(db, me, true);
    if (current && blocked(current.status)) throw new CommunityError(403, 'This shop is suspended. Contact QuinTaste support.');
    const problem = current?.status === 'active' && sellerProblem(s);
    if (problem) throw new CommunityError(400, problem);
    await db.query(`INSERT INTO market.seller(user_id,trading_name,about,area,meetup,delivery,delivery_fee_cents,delivery_areas,pay_cash,pay_paynow,delivery_min_cents)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT(user_id) DO UPDATE SET trading_name=$2,about=$3,area=$4,meetup=$5,delivery=$6,delivery_fee_cents=$7,delivery_areas=$8,pay_cash=$9,pay_paynow=$10,
        delivery_min_cents=$11, updated_at=now()`, [me, s.tradingName, s.about, s.area, s.meetup, s.delivery, s.deliveryFeeCents, s.deliveryAreas, s.payCash, s.payPaynow, s.deliveryMinCents]);
    return load(db, me);
  }, 'market-seller:' + me);
  res.json({ seller });
});
/** Opens the shop straight away once it is complete and the seller accepts the current declarations. */
sellerProfile.post('/open', async (req, res) => {
  const me = res.locals.user.id;
  // The app sends the version of the declaration text it showed; an older app must update first.
  if (req.body?.declarations !== declarationsVersion) throw new CommunityError(400, 'Update QuinTaste to see the current seller declarations, then confirm each one.');
  await throttle('market-seller-open:' + me, 20, 3600);
  const seller = await transaction(async db => {
    const current = await load(db, me, true);
    if (!current) throw new CommunityError(404, 'Set up your shop first.');
    if (blocked(current.status)) throw new CommunityError(403, 'This shop is suspended. Contact QuinTaste support.');
    const problem = sellerProblem(current);
    if (problem) throw new CommunityError(400, problem);
    await db.query(`UPDATE market.seller SET status='active', declarations_version=$2, declared_at=now(), opened_at=coalesce(opened_at, now()), updated_at=now()
      WHERE user_id=$1`, [me, declarationsVersion]);
    return load(db, me);
  }, 'market-seller:' + me);
  res.json({ seller });
});
