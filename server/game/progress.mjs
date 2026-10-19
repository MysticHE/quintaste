import { postCredits } from './ledger.mjs';

/**
 * Account progress in the app's GameProgress shape, built from the server tables with the app's own readGame, and the
 * café look checked against what this account has unlocked, including the lotus tier from the account's lotus record
 * (server/lotus). The tier is never stored in the café; it is read from lotus.account each time.
 */
const CAFE_FIELDS = ['pet', 'equip', 'decor', 'skin', 'cafeName', 'menu', 'mode', 'signature', 'introSeen', 'seen'];
const SLOT_FITS = { ceiling: 'hanging', wall: 'wall', floorL: 'floor', floorR: 'floor' };
/** Grants counted for imported device progress: replays beyond this many per level are not credited. */
const IMPORT_REPLAYS = 5;

export async function loadProgress(db, sim, userId) {
  const [profile, bests, owned, lotus] = await Promise.all([
    db.query('SELECT credits, cafe, imported_at FROM game.profile WHERE user_id=$1', [userId]),
    db.query('SELECT level, stars, score, served, rules, steady, mastered, clears, bonus, coins, left_secs AS "left" FROM game.level_best WHERE user_id=$1', [userId]),
    db.query("SELECT item FROM game.owned WHERE user_id=$1 AND item LIKE 'decor:%'", [userId]),
    db.query('SELECT tier FROM lotus.account WHERE user_id=$1', [userId]),
  ]);
  const row = profile.rows[0];
  const best = Object.fromEntries(bests.rows.map(({ level, ...b }) => [String(level), b]));
  const tier = lotus.rows[0]?.tier ?? null;
  const game = { ...sim.readGame({ ...(row?.cafe ?? {}), best, credits: row?.credits ?? 0, owned: owned.rows.map(o => o.item.slice(6)) }), tier };
  return { game: cleanCafe(sim, game), imported: !!row?.imported_at };
}

/** Drops anything this account has not unlocked: locked companions, accessories, decor and skins fall back to defaults. */
export function cleanCafe(sim, game) {
  const { PETS, ACCESSORIES, DECOR, SKINS } = sim.cosmetics, open = (u, id) => sim.isUnlocked(game, u, id);
  const equip = {};
  for (const [pet, acc] of Object.entries(game.equip)) equip[pet] = acc && open(ACCESSORIES[acc].unlock, acc) ? acc : null;
  const decor = {}, used = new Set();
  for (const [slot, id] of Object.entries(game.decor)) {
    const ok = id && DECOR[id].fits === SLOT_FITS[slot] && open(DECOR[id].unlock, id) && !used.has(id);
    decor[slot] = ok ? id : null; if (ok) used.add(id);
  }
  return { ...game, equip, decor,
    pet: open(PETS[game.pet].unlock) ? game.pet : 'sprout', skin: open(SKINS[game.skin].unlock) ? game.skin : 'sunny' };
}
export const cafeOf = game => Object.fromEntries(CAFE_FIELDS.map(key => [key, game[key]]));

/** Saves the café look the member chose, validated against their unlocks. The caller holds the profile lock. */
export async function saveCafe(db, sim, userId, input) {
  const current = await loadProgress(db, sim, userId);
  const chosen = { ...sim.readGame({ ...current.game, ...cafeOf(sim.readGame(input)), best: current.game.best, credits: current.game.credits, owned: current.game.owned }), tier: current.game.tier };
  await db.query('UPDATE game.profile SET cafe=$2, updated_at=now() WHERE user_id=$1', [userId, cafeOf(cleanCafe(sim, chosen))]);
}

/** Highest credits the imported clears could have earned: first clear, first mastered and a few replays per level. */
function importCap(sim, best) {
  const { CREDIT_REWARDS } = sim.cosmetics;
  return Object.values(best).filter(b => b.clears > 0).reduce((sum, b) => sum + CREDIT_REWARDS.firstClear +
    (b.mastered ? CREDIT_REWARDS.mastered : 0) + CREDIT_REWARDS.replay * Math.min(b.clears - 1, IMPORT_REPLAYS), 0);
}

/**
 * One-time merge of the progress this device kept before Phase B (the app's mergeGame rules for bests, finds and decor).
 * Device credits and bought decor count only up to what the device's clears could have earned. Returns false when this
 * account already imported, so later devices adopt the account's progress instead. The caller holds the profile lock.
 */
export async function importDevice(db, sim, userId, input, profile) {
  if (profile.imported_at) return false;
  const device = sim.readGame(input), server = (await loadProgress(db, sim, userId)).game;
  const merged = sim.mergeGame(server, device);
  const { DECOR } = sim.cosmetics;
  let budget = importCap(sim, device.best);
  const bought = [];
  for (const id of device.owned.filter(id => DECOR[id]?.unlock.kind === 'credits' && !server.owned.includes(id))
    .sort((a, b) => DECOR[a].unlock.price - DECOR[b].unlock.price)) {
    if (DECOR[id].unlock.price > budget) break;
    budget -= DECOR[id].unlock.price; bought.push(id);
  }
  for (const [level, b] of Object.entries(merged.best)) {
    await db.query(`INSERT INTO game.level_best(user_id, level, stars, score, served, rules, steady, mastered, clears, bonus, coins, left_secs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (user_id, level) DO UPDATE SET stars=GREATEST(game.level_best.stars, $3), score=GREATEST(game.level_best.score, $4),
        served=game.level_best.served OR $5, rules=game.level_best.rules OR $6, steady=game.level_best.steady OR $7,
        mastered=game.level_best.mastered OR $8, clears=GREATEST(game.level_best.clears, $9), bonus=game.level_best.bonus OR $10,
        coins=GREATEST(game.level_best.coins, $11), left_secs=GREATEST(game.level_best.left_secs, $12), updated_at=now()`,
    [userId, Number(level), b.stars, b.score, b.served, b.rules, b.steady, b.mastered, b.clears, b.bonus, b.coins, b.left]);
  }
  for (const id of bought) await db.query(`INSERT INTO game.owned(user_id, item, source) VALUES($1,$2,'import') ON CONFLICT DO NOTHING`, [userId, 'decor:' + id]);
  const credits = Math.min(device.credits, budget);
  if (credits > 0) await postCredits(db, userId, credits, 'import', 'device');
  const started = Object.keys(server.best).length > 0 || Object.keys(profile.cafe ?? {}).length > 0;
  const look = cleanCafe(sim, { ...merged, owned: [...server.owned, ...bought] });
  await db.query('UPDATE game.profile SET imported_at=now(), cafe=$2, updated_at=now() WHERE user_id=$1',
    [userId, started ? { ...cafeOf(server), seen: look.seen } : cafeOf(look)]);
  return true;
}
