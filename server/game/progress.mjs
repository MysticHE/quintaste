import { authorVisible } from './visibility.mjs';

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
  const [profile, bests, owned, lotus, seasonBests] = await Promise.all([
    db.query('SELECT credits, cafe, imported_at FROM game.profile WHERE user_id=$1', [userId]),
    db.query('SELECT level, stars, score, served, rules, steady, mastered, clears, bonus, coins, left_secs AS "left" FROM game.level_best WHERE user_id=$1', [userId]),
    db.query("SELECT item FROM game.owned WHERE user_id=$1 AND item LIKE 'decor:%'", [userId]),
    db.query('SELECT tier FROM lotus.account WHERE user_id=$1', [userId]),
    db.query('SELECT season_id, n, stars, score, served, rules, steady, mastered, clears, bonus, coins, left_secs AS "left" FROM game.season_best WHERE user_id=$1', [userId]),
  ]);
  const row = profile.rows[0];
  const best = Object.fromEntries(bests.rows.map(({ level, ...b }) => [String(level), b]));
  const seasons = Object.fromEntries(seasonBests.rows.map(({ season_id, n, ...b }) => [season_id + '-' + n, b]));
  const tier = lotus.rows[0]?.tier ?? null;
  const game = { ...sim.readGame({ ...(row?.cafe ?? {}), best, seasons, credits: row?.credits ?? 0, owned: owned.rows.map(o => o.item.slice(6)) }), tier };
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

const SEASON_KEY = /^([a-z0-9][a-z0-9-]{1,39})-(\d{1,2})$/;
/** Device season bests for season levels that exist and are open to members (seasonOpen: signed off, or any season on a development server). */
function openSeasons(sim, seasons) {
  const S = sim.seasons, dev = process.env.NODE_ENV !== 'production';
  return Object.fromEntries(Object.entries(seasons).filter(([key]) => {
    const m = SEASON_KEY.exec(key), season = m && S.seasonById(m[1]);
    return !!season && !!S.seasonLevel(m[1], Number(m[2])) && S.seasonOpen(season, dev);
  }));
}

/** Highest credits the imported clears could have earned: first clear, first mastered and a few replays per level. */
function importCap(sim, best) {
  const { CREDIT_REWARDS } = sim.cosmetics;
  return Object.values(best).filter(b => b.clears > 0).reduce((sum, b) => sum + CREDIT_REWARDS.firstClear +
    (b.mastered ? CREDIT_REWARDS.mastered : 0) + CREDIT_REWARDS.replay * Math.min(b.clears - 1, IMPORT_REPLAYS), 0);
}

/**
 * One-time merge of the progress this device kept before Phase B (the app's mergeGame rules for bests, finds and decor).
 * Device credits never move to the account (owner, 23 Oct 2026: a device's record cannot be checked, so credits are only earned
 * on the account); decor bought on the device counts only up to what its clears could have earned. Returns false when this
 * account already imported, so later devices adopt the account's progress instead. The caller holds the profile lock.
 */
export async function importDevice(db, sim, userId, input, profile) {
  if (profile.imported_at) return false;
  const device = sim.readGame(input), server = (await loadProgress(db, sim, userId)).game;
  const merged = sim.mergeGame(server, device), seasons = openSeasons(sim, device.seasons);
  const { DECOR } = sim.cosmetics;
  // Season first clears earned credits on the device too (they are not ledgered there, so they count toward the cap like levels).
  // Only seasons members can play count: a season not yet signed off pays nothing and keeps no imported best.
  let budget = importCap(sim, device.best) + importCap(sim, seasons);
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
  // Season bests come along, so a later server clear of an imported level is not paid as a first clear again (settleSeason reads them).
  for (const [key, b] of Object.entries(seasons)) {
    const m = SEASON_KEY.exec(key);
    await db.query(`INSERT INTO game.season_best(user_id, season_id, n, stars, score, served, rules, steady, mastered, clears, bonus, coins, left_secs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (user_id, season_id, n) DO UPDATE SET stars=GREATEST(game.season_best.stars, $4), score=GREATEST(game.season_best.score, $5),
        served=game.season_best.served OR $6, rules=game.season_best.rules OR $7, steady=game.season_best.steady OR $8, mastered=game.season_best.mastered OR $9,
        clears=GREATEST(game.season_best.clears, $10), bonus=game.season_best.bonus OR $11, coins=GREATEST(game.season_best.coins, $12),
        left_secs=GREATEST(game.season_best.left_secs, $13), updated_at=now()`,
    [userId, m[1], Number(m[2]), b.stars, b.score, b.served, b.rules, b.steady, b.mastered, b.clears, b.bonus, b.coins, b.left]);
  }
  // A guest's Recipe Kitchen tiers (no credits were paid for them), against the recipe's newest level this member may play (public, or
  // their own private one) that is still live and shown to them.
  for (const [recipe, tiers] of Object.entries(device.kitchen)) {
    const pack = (await db.query(`SELECT l.hash FROM game.recipe_level l WHERE l.recipe_id=$1 AND l.status='ready' AND (l.owner_id IS NULL OR l.owner_id=$2)
      AND ${authorVisible('l', '$2')} ORDER BY l.recipe_revision DESC, l.created_at DESC LIMIT 1`, [recipe, userId])).rows[0]?.hash;
    if (!pack) continue;
    for (const [tier, b] of Object.entries(tiers)) {
      if (!sim.TIERS.includes(tier)) continue;
      await db.query(`INSERT INTO game.kitchen_best(user_id, recipe_id, tier, pack, stars, score, clears, coins, left_secs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (user_id, recipe_id, tier) DO UPDATE SET stars=GREATEST(game.kitchen_best.stars, $5), score=GREATEST(game.kitchen_best.score, $6),
          clears=GREATEST(game.kitchen_best.clears, $7), coins=GREATEST(game.kitchen_best.coins, $8), left_secs=GREATEST(game.kitchen_best.left_secs, $9), updated_at=now()`,
      [userId, recipe, tier, pack, b.stars, b.score, b.clears, b.coins, b.left]);
    }
  }
  for (const id of bought) await db.query(`INSERT INTO game.owned(user_id, item, source) VALUES($1,$2,'import') ON CONFLICT DO NOTHING`, [userId, 'decor:' + id]);
  const started = Object.keys(server.best).length > 0 || Object.keys(profile.cafe ?? {}).length > 0;
  const look = cleanCafe(sim, { ...merged, owned: [...server.owned, ...bought] });
  await db.query('UPDATE game.profile SET imported_at=now(), cafe=$2, updated_at=now() WHERE user_id=$1',
    [userId, started ? { ...cafeOf(server), seen: look.seen } : cafeOf(look)]);
  return true;
}
