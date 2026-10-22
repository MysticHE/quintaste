import { createHash } from 'node:crypto';
import express from 'express';
import { pool, logger } from '../config.mjs';
import { CommunityError, communityRouter, errors, throttle, transaction, uuid } from '../community/http.mjs';
import { loadSim } from './sim.mjs';
import { lockProfile, postCredits } from './ledger.mjs';
import { importDevice, loadProgress, saveCafe } from './progress.mjs';
import { pictureUrl, picturesFor } from './art.mjs';
import { allowed } from '../operations.mjs';
import { planAccess } from '../ai-recipes/limits.mjs';
import { myLevels, requestLevel } from './levels-members.mjs';
import { authorVisible } from './visibility.mjs';
import { cafeNow, cafesOn, listCafes, myCafe, requireCafes, saveCafe as saveOpenCafe, visitableCafe } from './cafes.mjs';

/**
 * Rush Hour account progress (GAME_PLAN §12.3 and §14 Phase B; PRD QT-055/056), mounted at /api/game behind the `games`
 * control. Signed-in, age-checked members only; guests keep device-only progress. Runs open online when the service
 * starts and settle once from a server replay of their input log, using the same simulation as the app.
 */
export const game = communityRouter({ bodyLimit: '32kb', photoLimit: '256kb', photos: req => /^\/runs\/[^/]+\/finish$/.test(req.path) });
/** Runs must settle within a week of starting; older pending runs are refused. */
const RUN_DAYS = 7;
const sanitizeReason = text => String(text).replace(/[^\w ,.-]/g, '').slice(0, 80);

game.use(async (_req, res, next) => {
  const sim = await loadSim();
  if (!sim) return res.status(503).json({ error: 'Game saving is temporarily unavailable.', code: 'SERVICE_PAUSED' });
  res.locals.sim = sim;
  next();
});
const progressOf = (sim, me) => loadProgress(pool, sim, me);

game.get('/progress', async (_req, res) => {
  const { sim, user } = res.locals;
  res.json({ ...await progressOf(sim, user.id), rules: sim.rulesVersion });
});

// One-time merge of the progress this device kept before accounts saved it. Later devices get the account's progress.
game.post('/import', async (req, res) => {
  const { sim, user } = res.locals;
  await throttle(`game-import:${user.id}`, 20, 3600);
  const merged = await transaction(async db => importDevice(db, sim, user.id, req.body?.game, await lockProfile(db, user.id)));
  res.json({ ...await progressOf(sim, user.id), merged, rules: sim.rulesVersion });
});

game.put('/cafe', async (req, res) => {
  const { sim, user } = res.locals;
  await throttle(`game-cafe:${user.id}`, 600, 3600);
  await transaction(async db => { await lockProfile(db, user.id); await saveCafe(db, sim, user.id, req.body?.cafe); });
  res.json({ ...await progressOf(sim, user.id), rules: sim.rulesVersion });
});

// Decor bought with credits: a direct purchase of a known item (QT-056). Buying twice changes nothing.
game.post('/purchases', async (req, res) => {
  const { sim, user } = res.locals, id = req.body?.item, item = typeof id === 'string' && Object.hasOwn(sim.cosmetics.DECOR, id) ? sim.cosmetics.DECOR[id] : null;
  if (!item || item.unlock.kind !== 'credits') throw new CommunityError(404, 'That item is unavailable.');
  await throttle(`game-buy:${user.id}`, 60, 3600);
  await transaction(async db => {
    await lockProfile(db, user.id);
    if ((await db.query('SELECT 1 FROM game.owned WHERE user_id=$1 AND item=$2', [user.id, 'decor:' + id])).rowCount) return;
    if (await postCredits(db, user.id, -item.unlock.price, 'purchase', 'decor:' + id))
      await db.query(`INSERT INTO game.owned(user_id, item, source) VALUES($1,$2,'purchase')`, [user.id, 'decor:' + id]);
  });
  res.json({ ...await progressOf(sim, user.id), rules: sim.rulesVersion });
});

const PACK_HASH = /^p[a-z0-9]{1,14}$/;

/**
 * A level pack this member may play: ready, and public or their own. It is validated, its stored hash checked and it is
 * registered with the simulation. Null when it is missing, withdrawn, someone else's, or no longer valid.
 */
async function playablePack(db, sim, hash, me) {
  if (typeof hash !== 'string' || !PACK_HASH.test(hash)) return null;
  const row = (await db.query(`SELECT l.hash, l.recipe_id, l.pack, l.owner_id IS NOT NULL AS private FROM game.recipe_level l WHERE l.hash=$1 AND l.status='ready'
    AND (l.owner_id IS NULL OR l.owner_id=$2) AND ${authorVisible('l', '$2')}`, [hash, me])).rows[0];
  if (!row) return null;
  try {
    const pack = sim.readPack(row.pack);
    if (sim.packHash(pack) !== row.hash) return null;
    sim.registerPack(pack);
    return { pack, recipeId: row.recipe_id, private: row.private };
  } catch (error) {
    if (!(error instanceof sim.PackError)) throw error;
    logger.warn({ event: 'game_pack_invalid', pack: hash, message: String(error.message).slice(0, 120) });
    return null;
  }
}

/**
 * The Recipe Kitchen shelf for this member: the newest live revision of each recipe level they may play (public, or their own),
 * with its cuisine, techniques, dish picture when approved, and their best per tier. Locks are worked out by the app from its
 * progress with the same rule the server enforces when a run opens (src/game/kitchen.ts).
 */
game.get('/kitchen', async (_req, res) => {
  res.set('Cache-Control', 'private, no-store').json(await kitchenShelf(res.locals.user.id));
});
/**
 * Member levels (Phase 4): a member asks for a private level from their own published recipe. Making one is an AI feature, so it
 * needs an AI Recipes plan (no free tries); an unlimited account skips the daily limit but not the two in line.
 */
game.post('/levels', async (req, res) => {
  const me = res.locals.user.id;
  await throttle(`game-level:${me}`, 20, 3600);
  const plan = await planAccess(me);
  if (plan.needsPlan) throw new CommunityError(402, 'Choose a plan to make levels from your recipes.', 'PLAN_REQUIRED');
  res.status(202).json(await transaction(db => requestLevel(db, me, req.body?.recipeId, { daily: !plan.unlimited })));
});
/**
 * Member cafés (GAME_CONTENT_PLAN §9, cafes.mjs): the member's own café (with private weekly counts), saving it, open cafés to visit,
 * and one café's menu packs to play. All behind the `game_cafes` control.
 */
game.get('/my-cafe', async (_req, res) => {
  await requireCafes();
  res.set('Cache-Control', 'private, no-store').json(await myCafe(pool, res.locals.user.id));
});
game.put('/my-cafe', async (req, res) => {
  await requireCafes();
  await throttle(`game-cafe:${res.locals.user.id}`, 30, 3600);
  res.json(await transaction(db => saveOpenCafe(db, res.locals.user.id, req.body)));
});
game.get('/cafes', async (req, res) => {
  await requireCafes();
  res.set('Cache-Control', 'private, no-store').json({ cafes: await listCafes(pool, res.locals.user.id, req.query.q) });
});
game.get('/cafes/:host', async (req, res) => {
  await requireCafes();
  const cafe = await visitableCafe(pool, res.locals.sim, req.params.host, res.locals.user.id);
  if (!cafe) throw new CommunityError(404, 'That café is closed.', 'CAFE_CLOSED');
  const pictures = {};
  for (const p of cafe.packs) Object.assign(pictures, await picturesFor(pool, p.pack));
  res.set('Cache-Control', 'private, no-store').json({ host: cafe.host, name: cafe.name, packs: cafe.packs.map(p => p.pack), pictures });
});
game.get('/levels/mine', async (_req, res) => {
  res.set('Cache-Control', 'private, no-store').json({ levels: await myLevels(pool, res.locals.user.id) });
});
/** The shelf for a member, or for a signed-out player (`me` null: public levels only, no bests). */
async function kitchenShelf(me) {
  const levels = (await pool.query(`SELECT DISTINCT ON (l.recipe_id) l.hash, l.recipe_id, l.cuisine, l.owner_id IS NOT NULL AS mine, l.created_at,
      l.pack->'techniques' AS techniques, l.pack->'dishes'->0->>'name' AS name, l.pack->'dishes'->0->>'art' AS art,
      -- A member's own private level hides their recipe's public one on the shelf; its hash still goes with it, for a café menu.
      CASE WHEN l.owner_id IS NOT NULL THEN (SELECT p.hash FROM game.recipe_level p WHERE p.recipe_id = l.recipe_id AND p.status = 'ready' AND p.owner_id IS NULL
        ORDER BY p.recipe_revision DESC, p.created_at DESC LIMIT 1) END AS public_hash
    FROM game.recipe_level l WHERE l.status = 'ready' AND (l.owner_id IS NULL OR l.owner_id = $1) AND ${authorVisible('l', '$1')}
    ORDER BY l.recipe_id, l.recipe_revision DESC, l.created_at DESC LIMIT 300`, [me])).rows;
  const hashes = levels.map(l => l.hash);
  const [bests, pictures, ratings, stats, mine] = await Promise.all([
    me ? pool.query('SELECT recipe_id, tier, stars, score, clears FROM game.kitchen_best WHERE user_id = $1', [me]) : { rows: [] },
    pool.query(`SELECT a.art_key, a.asset FROM game.art a JOIN game.asset s ON s.sha256 = a.asset AND s.status = 'approved' WHERE a.art_key = ANY($1)`, [levels.map(l => l.art)]),
    pool.query('SELECT hash, tier, round(rating)::int AS rating, players FROM game.level_rating WHERE hash = ANY($1)', [hashes]),
    levelQuality(hashes),
    me ? pool.query(`SELECT (SELECT round(rating)::int FROM game.player_rating WHERE user_id = $1) AS rating,
        (SELECT coalesce(json_object_agg(hash, liked), '{}') FROM game.level_reaction WHERE user_id = $1 AND hash = ANY($2)) AS liked`, [me, hashes]) : { rows: [{ rating: null, liked: {} }] }]);
  const picture = new Map(pictures.rows.map(r => [r.art_key, pictureUrl(r.asset)]));
  const best = new Map(), rated = new Map();
  for (const b of bests.rows) best.set(b.recipe_id, { ...best.get(b.recipe_id), [b.tier]: { stars: b.stars, score: b.score, clears: b.clears } });
  for (const r of ratings.rows) rated.set(r.hash, { ...rated.get(r.hash), [r.tier]: { rating: r.rating, players: r.players } });
  const me0 = mine.rows[0];
  return { player: me0.rating, levels: levels.map(l => ({ hash: l.hash, recipeId: l.recipe_id, name: l.name, cuisine: l.cuisine, mine: l.mine, publicHash: l.public_hash ?? null,
    techniques: l.techniques, art: l.art, picture: picture.get(l.art) ?? null, best: best.get(l.recipe_id) ?? {}, added: l.created_at,
    ratings: rated.get(l.hash) ?? {}, held: heldBack(stats.get(l.hash)), liked: me0.liked[l.hash] ?? null })) };
}

/**
 * A level players keep quitting or dislike leaves the For you and New rows (GAME_CONTENT_PLAN §5 Quality); it stays on its shelf
 * and its recipe page. Shares count only once enough people have played or reacted.
 */
const QUALITY = { count: 10, share: 0.4, seconds: 60 };
const heldBack = q => !!q && ((q.plays >= QUALITY.count && q.quits / q.plays > QUALITY.share) || (q.reactions >= QUALITY.count && q.dislikes / q.reactions > QUALITY.share));
/** Plays, quits, reactions and dislikes per live level: one grouped pass over runs and one over reactions, kept a minute for every Kitchen open. */
let quality = { at: 0, key: '', stats: new Map() };
async function levelQuality(hashes) {
  const key = hashes.join(',');
  if (quality.key === key && Date.now() - quality.at < QUALITY.seconds * 1000) return quality.stats;
  const [runs, reactions] = await Promise.all([
    pool.query(`SELECT pack AS hash, count(*)::int AS plays, count(*) FILTER (WHERE result->'result'->>'quit' = 'true')::int AS quits
      FROM game.run WHERE pack = ANY($1) AND status = 'settled' GROUP BY pack`, [hashes]),
    pool.query(`SELECT hash, count(*)::int AS reactions, count(*) FILTER (WHERE NOT liked)::int AS dislikes FROM game.level_reaction WHERE hash = ANY($1) GROUP BY hash`, [hashes])]);
  const stats = new Map(hashes.map(h => [h, { plays: 0, quits: 0, reactions: 0, dislikes: 0 }]));
  for (const r of runs.rows) Object.assign(stats.get(r.hash), { plays: r.plays, quits: r.quits });
  for (const r of reactions.rows) Object.assign(stats.get(r.hash), { reactions: r.reactions, dislikes: r.dislikes });
  quality = { at: Date.now(), key, stats };
  return stats;
}

/** A member who finished a service of a level (not quitting) says whether they liked it; null clears it. */
game.post('/levels/:hash/reaction', async (req, res) => {
  const { user } = res.locals, hash = req.params.hash, liked = req.body?.liked;
  if (!PACK_HASH.test(hash) || !(liked === true || liked === false || liked === null)) throw new CommunityError(400, 'Invalid reaction.');
  await throttle(`game-react:${user.id}`, 60, 3600);
  const finished = await pool.query(`SELECT 1 FROM game.run WHERE user_id=$1 AND pack=$2 AND status='settled' AND coalesce(result->'result'->>'quit', 'false') <> 'true' LIMIT 1`, [user.id, hash]);
  if (!finished.rowCount) throw new CommunityError(409, 'Finish a service of this level first.', 'NOT_FINISHED');
  if (liked === null) await pool.query('DELETE FROM game.level_reaction WHERE user_id=$1 AND hash=$2', [user.id, hash]);
  else await pool.query(`INSERT INTO game.level_reaction(user_id, hash, liked) VALUES($1,$2,$3)
    ON CONFLICT (user_id, hash) DO UPDATE SET liked=$3, updated_at=now()`, [user.id, hash, liked]);
  res.set('Cache-Control', 'no-store').json({ liked });
});

// A Recipe Kitchen level pack, for the app to play, with its approved pictures. The pack itself is immutable.
game.get('/packs/:hash', async (req, res) => {
  const { sim, user } = res.locals, found = await playablePack(pool, sim, req.params.hash, user.id);
  if (!found) throw new CommunityError(404, 'That level is unavailable.');
  // Pictures are not part of the pack: an approved picture can arrive later, so this answer is cached briefly.
  res.set('Cache-Control', 'private, max-age=600').json({ hash: req.params.hash, recipeId: found.recipeId, pack: found.pack, private: found.private, pictures: await picturesFor(pool, found.pack) });
});

/**
 * Signed-out players (RECIPE_LEVELS_PLAN §10): public live levels only, played as practice on the device (nothing settles on an
 * account). Read-only, behind the `games` control like the member routes.
 */
export const gamePublic = express.Router();
gamePublic.use(async (_req, res, next) => {
  const sim = await loadSim();
  if (!sim) return res.status(503).json({ error: 'The game is temporarily unavailable.', code: 'SERVICE_PAUSED' });
  res.locals.sim = sim;
  next();
});
gamePublic.get('/kitchen', async (_req, res, next) => {
  try { res.set('Cache-Control', 'public, max-age=300').json(await kitchenShelf(null)); } catch (error) { next(error); }
});
/**
 * The revocation list (GAME_CONTENT_PLAN §8 Offline): levels staff hid. The app drops them from its cache of played levels whenever
 * it is online, so a hidden level can't be played offline either; credited runs of one are already refused here.
 */
/** Whether the Seasons shelf is open (`game_seasons`). The app shows the shelf only on a clear yes: it fails closed. */
gamePublic.get('/cafes', async (_req, res) => { res.set('Cache-Control', 'public, max-age=60').json({ on: await cafesOn() }); });
gamePublic.get('/seasons', async (_req, res, next) => {
  try { res.set('Cache-Control', 'public, max-age=60').json({ on: await allowed('game_seasons') }); } catch (error) { next(error); }
});
gamePublic.get('/revoked', async (_req, res, next) => {
  try {
    // Public levels only: the phone never keeps a private one, and a private level's hash is nobody else's business.
    const rows = (await pool.query(`SELECT hash FROM game.recipe_level WHERE status = 'hidden' AND owner_id IS NULL`)).rows;
    res.set('Cache-Control', 'public, max-age=300').json({ hashes: rows.map(r => r.hash) });
  } catch (error) { next(error); }
});
gamePublic.get('/packs/:hash', async (req, res, next) => {
  try {
    const found = await playablePack(pool, res.locals.sim, req.params.hash, null);
    if (!found) return res.status(404).json({ error: 'That level is unavailable.' });
    res.set('Cache-Control', 'public, max-age=600').json({ hash: req.params.hash, recipeId: found.recipeId, pack: found.pack, pictures: await picturesFor(pool, found.pack) });
  } catch (error) { next(error); }
});

/** Opens an attempt when the service starts. The same id again returns the same attempt. */
game.post('/runs', async (req, res) => {
  const { sim, user } = res.locals, body = req.body ?? {};
  if (!uuid(body.id)) throw new CommunityError(400, 'Invalid run.');
  if (body.rules !== sim.rulesVersion) throw new CommunityError(409, 'Update QuinTaste to save game progress.', 'GAME_UPDATE');
  if (body.pack != null) return openMission(req, res);
  if (body.season != null) return openSeason(req, res);
  if (body.cafe != null) return openCafe(req, res);
  // Today's special: a Singapore date within a day of now; otherwise a numbered level.
  const day = body.special == null ? null : String(body.special);
  if (day !== null && !nearDays().includes(day)) throw new CommunityError(400, 'Invalid run.');
  // Every service is a Rush; the column keeps its old name and value (the schema allows 'rush' and 'calm').
  const level = day ? 0 : Number(body.level), mode = 'rush', lv = sim.LEVELS[level - 1];
  if (!day && (!Number.isInteger(level) || !lv)) throw new CommunityError(400, 'Invalid run.');
  const hints = ['full', 'chip', 'none'].includes(body.hints) ? body.hints : null;
  const pet = typeof body.pet === 'string' && Object.hasOwn(sim.cosmetics.PETS, body.pet) ? body.pet : null;
  // Signature dishes are built-in dishes only: a registered pack's dishes never join a numbered level.
  const signature = lv?.signature && Array.isArray(body.signature) ? [...new Set(body.signature.filter(d => typeof d === 'string' && Object.hasOwn(sim.BUILTIN.dishes, d)))].slice(0, 3) : [];
  await throttle(`game-run:${user.id}`, 120, 3600);
  const run = await transaction(async db => {
    await lockProfile(db, user.id);
    const existing = (await db.query('SELECT user_id, status FROM game.run WHERE id=$1', [body.id])).rows[0];
    if (existing) { if (existing.user_id !== user.id) throw new CommunityError(404, 'Invalid run.'); return { id: body.id, status: existing.status }; }
    const { game: progress } = await loadProgress(db, sim, user.id);
    if (!pet || !sim.isUnlocked(progress, sim.cosmetics.PETS[pet].unlock)) throw new CommunityError(409, 'That companion is locked.', 'PET_LOCKED');
    // A special is rebuilt later from its date and the highest clear it was built from. The device may be ahead of the
    // account (clears still queued offline), so its own `top` is used; a special always pays the same replay grant, so a
    // different `top` changes only which dish and regulars appear. The account must have opened the chalkboard.
    const claimed = Number(body.top), top = day ? (Number.isInteger(claimed) && claimed >= 5 && claimed <= sim.LEVELS.length ? claimed : sim.highestCleared(progress)) : null;
    if (day && !sim.specialFor(progress, day)) throw new CommunityError(409, "Today's special opens at Level 6.", 'SPECIAL_LOCKED');
    await db.query(`INSERT INTO game.run(id, user_id, level, mode, pet, signature, rules_version, special_day, special_top, hints) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [body.id, user.id, level, mode, pet, signature, sim.rulesVersion, day, top, hints]);
    return { id: body.id, status: 'open' };
  });
  res.json(run);
});

/** Opens a Recipe Kitchen mission: a playable pack and a tier. Level stays 0; the pack hash and tier rebuild the service. */
async function openMission(req, res) {
  const { sim, user } = res.locals, body = req.body;
  if (!sim.TIERS.includes(body.tier)) throw new CommunityError(400, 'Invalid run.');
  const hints = ['full', 'chip', 'none'].includes(body.hints) ? body.hints : null;
  const pace = ['normal', 'relaxed', 'slow'].includes(body.pace) ? body.pace : null;
  const pet = typeof body.pet === 'string' && Object.hasOwn(sim.cosmetics.PETS, body.pet) ? body.pet : null;
  await throttle(`game-run:${user.id}`, 120, 3600);
  const run = await transaction(async db => {
    await lockProfile(db, user.id);
    const existing = (await db.query('SELECT user_id, status FROM game.run WHERE id=$1', [body.id])).rows[0];
    if (existing) { if (existing.user_id !== user.id) throw new CommunityError(404, 'Invalid run.'); return { id: body.id, status: existing.status }; }
    const found = await playablePack(db, sim, body.pack, user.id);
    if (!found) throw new CommunityError(404, 'That level is unavailable.', 'LEVEL_UNAVAILABLE');
    // Tiers open in order: Service after a Learn clear of this recipe, From memory after a Service clear.
    const before = sim.TIERS[sim.TIERS.indexOf(body.tier) - 1];
    if (before && !(await db.query('SELECT 1 FROM game.kitchen_best WHERE user_id=$1 AND recipe_id=$2 AND tier=$3 AND clears > 0', [user.id, found.recipeId, before])).rowCount)
      throw new CommunityError(409, 'Clear the earlier tier first.', 'TIER_LOCKED');
    const { game: progress } = await loadProgress(db, sim, user.id);
    // A recipe level opens once the player has learned every technique it uses on the main path (GAME_CONTENT_PLAN §5).
    const missing = sim.missingTechnique(progress, found.pack.techniques);
    if (missing) throw new CommunityError(409, missing.level ? `Learn the ${missing.name.toLowerCase()} in Level ${missing.level} first.` : 'Update QuinTaste to play this level.', 'TECHNIQUE_LOCKED');
    if (!pet || !sim.isUnlocked(progress, sim.cosmetics.PETS[pet].unlock)) throw new CommunityError(409, 'That companion is locked.', 'PET_LOCKED');
    await db.query(`INSERT INTO game.run(id, user_id, level, mode, pet, signature, rules_version, hints, pack, tier, pace) VALUES($1,$2,0,'rush',$3,'{}',$4,$5,$6,$7,$8)`,
      [body.id, user.id, pet, sim.rulesVersion, hints, body.pack, body.tier, pace]);
    return { id: body.id, status: 'open' };
  });
  res.json(run);
}

/**
 * Opens a café visit (GAME_CONTENT_PLAN §9): the café must be open and visitable, and the run keeps a snapshot of its menu so a menu
 * change while the run is open cannot change what replays. The visitor must have learned the menu's techniques.
 */
async function openCafe(req, res) {
  const { sim, user } = res.locals, body = req.body;
  await requireCafes();
  const hints = ['full', 'chip', 'none'].includes(body.hints) ? body.hints : null;
  const pace = ['normal', 'relaxed', 'slow'].includes(body.pace) ? body.pace : null;
  const pet = typeof body.pet === 'string' && Object.hasOwn(sim.cosmetics.PETS, body.pet) ? body.pet : null;
  await throttle(`game-run:${user.id}`, 120, 3600);
  const run = await transaction(async db => {
    await lockProfile(db, user.id);
    const existing = (await db.query('SELECT user_id, status FROM game.run WHERE id=$1', [body.id])).rows[0];
    if (existing) { if (existing.user_id !== user.id) throw new CommunityError(404, 'Invalid run.'); return { id: body.id, status: existing.status }; }
    const cafe = await visitableCafe(db, sim, body.cafe?.host, user.id);
    if (!cafe) throw new CommunityError(404, 'That café is closed.', 'CAFE_CLOSED');
    // The app plays the menu it loaded; if the host changed it since (or a dish was withdrawn), that service would never settle.
    const menu = cafe.packs.map(p => p.hash), played = Array.isArray(body.cafe?.menu) ? body.cafe.menu : [];
    if (played.length !== menu.length || played.some((hash, i) => hash !== menu[i]))
      throw new CommunityError(409, "This café's menu changed. Open it again.", 'CAFE_CHANGED');
    const { game: progress } = await loadProgress(db, sim, user.id);
    const missing = sim.missingTechnique(progress, [...new Set(cafe.packs.flatMap(p => p.techniques))]);
    if (missing) throw new CommunityError(409, missing.level ? `Learn the ${missing.name.toLowerCase()} in Level ${missing.level} first.` : 'Update QuinTaste to play this café.', 'TECHNIQUE_LOCKED');
    if (!pet || !sim.isUnlocked(progress, sim.cosmetics.PETS[pet].unlock)) throw new CommunityError(409, 'That companion is locked.', 'PET_LOCKED');
    await db.query(`INSERT INTO game.run(id, user_id, level, mode, pet, signature, rules_version, hints, pace, cafe_host, cafe_menu) VALUES($1,$2,0,'rush',$3,'{}',$4,$5,$6,$7,$8)`,
      [body.id, user.id, pet, sim.rulesVersion, hints, pace, cafe.hostId, menu]);
    return { id: body.id, status: 'open', menu };
  });
  res.json(run);
}

/**
 * Opens a season level (GAME_CONTENT_PLAN §6): the `game_seasons` control must be on (fail closed), the season signed off by its
 * community reviewer (development servers play every season so it can be reviewed), Chapter 1 cleared and the level's stations learned.
 */
async function openSeason(req, res) {
  const { sim, user } = res.locals, body = req.body, S = sim.seasons;
  const id = typeof body.season?.id === 'string' ? body.season.id : '', n = Number(body.season?.n), season = S.seasonById(id), level = S.seasonLevel(id, n);
  if (!level || !Number.isInteger(n)) throw new CommunityError(400, 'Invalid run.');
  if (!season.signedOff && process.env.NODE_ENV === 'production') throw new CommunityError(404, 'That season is unavailable.', 'LEVEL_UNAVAILABLE');
  if (!await allowed('game_seasons')) throw new CommunityError(409, 'Seasons are closed right now.', 'SEASONS_OFF');
  const hints = ['full', 'chip', 'none'].includes(body.hints) ? body.hints : null;
  const pace = ['normal', 'relaxed', 'slow'].includes(body.pace) ? body.pace : null;
  const pet = typeof body.pet === 'string' && Object.hasOwn(sim.cosmetics.PETS, body.pet) ? body.pet : null;
  await throttle(`game-run:${user.id}`, 120, 3600);
  const run = await transaction(async db => {
    await lockProfile(db, user.id);
    const existing = (await db.query('SELECT user_id, status FROM game.run WHERE id=$1', [body.id])).rows[0];
    if (existing) { if (existing.user_id !== user.id) throw new CommunityError(404, 'Invalid run.'); return { id: body.id, status: existing.status }; }
    const { game: progress } = await loadProgress(db, sim, user.id);
    if (sim.highestCleared(progress) < S.SEASONS_AFTER_LEVEL) throw new CommunityError(409, `Seasons open after Level ${S.SEASONS_AFTER_LEVEL}.`, 'SEASON_LOCKED');
    const missing = sim.missingTechnique(progress, level.stations);
    if (missing) throw new CommunityError(409, missing.level ? `Learn the ${missing.name.toLowerCase()} in Level ${missing.level} first.` : 'Update QuinTaste to play this level.', 'TECHNIQUE_LOCKED');
    if (!pet || !sim.isUnlocked(progress, sim.cosmetics.PETS[pet].unlock)) throw new CommunityError(409, 'That companion is locked.', 'PET_LOCKED');
    await db.query(`INSERT INTO game.run(id, user_id, level, mode, pet, signature, rules_version, hints, season_id, season_n, pace) VALUES($1,$2,0,'rush',$3,'{}',$4,$5,$6,$7,$8)`,
      [body.id, user.id, pet, sim.rulesVersion, hints, id, n, pace]);
    return { id: body.id, status: 'open' };
  });
  res.json(run);
}

/** The parts of a result kept with a settled run (the full result is rebuilt from its input log when needed). */
const resultOf = (result, quit = false) => ({ stars: result.stars, score: result.score, cleared: result.cleared, coins: result.coins, left: result.left, bonus: !!result.bonus?.done, stamps: result.stamps,
  ...(quit ? { quit: true } : {}) });

/** The stored outcome of a run that was already settled or refused, so retries return the same answer. */
const outcome = row => ({ status: row.status, reason: row.reason, reward: row.result?.reward ?? { credits: 0, first: false, mastered: false, unlocks: [] } });

async function refuse(id, me, reason, actions) {
  await transaction(async db => {
    const updated = await db.query(`UPDATE game.run SET status='rejected', reason=$3, finished_at=now() WHERE id=$1 AND user_id=$2 AND status='open'`, [id, me, sanitizeReason(reason)]);
    if (updated.rowCount && Array.isArray(actions)) await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
  });
  logger.info({ event: 'game_run_rejected', reason: sanitizeReason(reason) });
}

/**
 * Settles a run: replays the log with the shared simulation, refuses it unless it reaches the claimed result in no less
 * than real time, then grants credits with the app's applyResult rules. Concurrent and repeated calls settle once.
 */
game.post('/runs/:id/finish', async (req, res) => {
  const { sim, user } = res.locals, id = req.params.id, actions = req.body?.actions;
  if (!uuid(id)) throw new CommunityError(404, 'That run is unavailable.');
  await throttle(`game-finish:${user.id}`, 240, 3600);
  const run = (await pool.query(`SELECT *, extract(epoch FROM now() - started_at)::float AS elapsed FROM game.run WHERE id=$1 AND user_id=$2`, [id, user.id])).rows[0];
  if (!run) throw new CommunityError(404, 'That run is unavailable.');
  const reply = async () => {
    const row = (await pool.query('SELECT status, reason, result FROM game.run WHERE id=$1', [id])).rows[0];
    res.json({ ...outcome(row), progress: await progressOf(sim, user.id) });
  };
  if (run.status !== 'open') return reply();
  if (run.rules_version !== sim.rulesVersion) { await refuse(id, user.id, 'game updated since the run started', actions); return reply(); }
  if (run.elapsed > RUN_DAYS * 86400) { await refuse(id, user.id, 'run expired', actions); return reply(); }
  const special = run.special_day ? { day: isoDay(run.special_day), top: run.special_top } : null;
  // A mission settles only while its pack is still playable: a level withdrawn since the run started is refused.
  const mission = run.pack ? await playablePack(pool, sim, run.pack, user.id) : null;
  if (run.pack && !mission) { await refuse(id, user.id, 'level withdrawn', actions); return reply(); }
  // A café visit replays its menu snapshot; every pack in it must still be playable and is registered for the replay.
  const cafeMenu = run.cafe_host ? await Promise.all(run.cafe_menu.map(hash => playablePack(pool, sim, hash, user.id))) : null;
  if (cafeMenu?.some(p => !p)) { await refuse(id, user.id, 'level withdrawn', actions); return reply(); }
  // The service's seed comes from the run's id, which the app also used to play it.
  const setup = { level: run.level, special, mission: run.pack ? { pack: run.pack, tier: run.tier } : null, season: run.season_id ? { id: run.season_id, n: run.season_n } : null,
    cafe: run.cafe_host ? { host: run.cafe_host, menu: run.cafe_menu } : null, hints: run.hints, pet: run.pet, signature: run.signature, seed: sim.seedOf(run.id) };
  let replayed;
  try { replayed = sim.replay(setup, actions); }
  catch (error) {
    if (!(error instanceof sim.ReplayError)) throw error;
    await refuse(id, user.id, 'replay refused: ' + error.message, actions); return reply();
  }
  const result = sim.results(replayed);
  if (!sim.sameResult(result, req.body?.result)) { await refuse(id, user.id, 'result does not match the replay', actions); return reply(); }
  // Time only moves while the service runs, so a real run takes at least its simulated time (10% and 5 s of slack).
  if (run.elapsed + 5 < replayed.ticks * sim.DT * 0.9) { await refuse(id, user.id, 'finished faster than real time', actions); return reply(); }
  await transaction(async db => {
    await lockProfile(db, user.id);
    const current = (await db.query('SELECT status FROM game.run WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (current.status !== 'open') return;
    const { game: progress } = await loadProgress(db, sim, user.id);
    if (special) { await settleSpecial(db, sim, user.id, id, replayed, result, actions); return; }
    if (mission) { await settleMission(db, sim, user.id, id, run, mission.recipeId, replayed, result, actions); return; }
    if (run.season_id) { await settleSeason(db, sim, user.id, id, run, progress, replayed, result, actions); return; }
    if (run.cafe_host) {
      // Only recipes dealt in this service can pay (cafeFor leaves out a pack that would need more than five stations).
      const dealt = new Set(sim.cafeFor(cafeMenu.map(p => p.pack), run.cafe_host).orders.map(o => o.dish));
      const recipeIds = cafeMenu.filter(p => p.pack.dishes.some(d => dealt.has(d.id))).map(p => p.recipeId);
      await settleCafe(db, sim, user.id, id, run, recipeIds, replayed, result, actions); return;
    }
    if (!sim.levelOpen(progress, run.level)) {
      await db.query(`UPDATE game.run SET status='rejected', reason='level locked', finished_at=now() WHERE id=$1`, [id]);
      await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
      return;
    }
    const { game: next, reward } = sim.applyResult(progress, run.level, result), pay = sim.cosmetics.CREDIT_REWARDS;
    if (result.cleared && reward.first) await postCredits(db, user.id, pay.firstClear, 'first_clear', 'level:' + run.level);
    else if (result.cleared && !await payReplay(db, sim, user.id, id)) { reward.credits -= pay.replay; reward.note = REPLAYS_USED; }
    if (reward.mastered) await postCredits(db, user.id, pay.mastered, 'mastered', 'level:' + run.level);
    const b = next.best[String(run.level)];
    await db.query(`INSERT INTO game.level_best(user_id, level, stars, score, served, rules, steady, mastered, clears, bonus, coins, left_secs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (user_id, level) DO UPDATE SET stars=$3, score=$4, served=$5, rules=$6, steady=$7, mastered=$8, clears=$9, bonus=$10, coins=$11, left_secs=$12, updated_at=now()`,
    [user.id, run.level, b.stars, b.score, b.served, b.rules, b.steady, b.mastered, b.clears, b.bonus, b.coins, b.left]);
    await db.query(`UPDATE game.run SET status='settled', finished_at=now(), ticks=$2, credits=$3, result=$4 WHERE id=$1`,
      [id, replayed.ticks, reward.credits, { result: resultOf(result), reward }]);
    await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
  });
  return reply();
});

/** Credits of one kind posted since midnight in Singapore. */
const SG_TODAY = `(date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore')`;
const paidToday = async (db, me, kind) => (await db.query(`SELECT count(*)::int AS n FROM game.ledger WHERE user_id=$1 AND kind=$2 AND created_at >= ${SG_TODAY}`, [me, kind])).rows[0].n;
const REPLAYS_USED = "Today's paid replays are used. Stars and bests still count.";
/** Pays a replay's credits while the day's limit allows (DAILY_CREDITS); returns whether it paid. */
async function payReplay(db, sim, me, id) {
  if (await paidToday(db, me, 'replay') >= sim.cosmetics.DAILY_CREDITS.replays) return false;
  return postCredits(db, me, sim.cosmetics.CREDIT_REWARDS.replay, 'replay', 'run:' + id);
}

/** Singapore dates (YYYY-MM-DD) for yesterday, today and tomorrow: a special may start around midnight. */
function nearDays(now = Date.now()) {
  return [-1, 0, 1].map(d => new Date(now + 8 * 3600000 + d * 86400000).toISOString().slice(0, 10));
}
/** A `date` column as YYYY-MM-DD (pg returns a Date at local midnight, or a string when parsing is off). */
const isoDay = value => value instanceof Date
  ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : String(value).slice(0, 10);

/** A finished Today's special pays the normal replay grant on a clear and records nothing per level (GAME_PLAN §10). */
async function settleSpecial(db, sim, me, id, replayed, result, actions) {
  const paid = result.cleared && await payReplay(db, sim, me, id), credits = paid ? sim.cosmetics.CREDIT_REWARDS.replay : 0;
  const reward = { credits, first: false, mastered: false, unlocks: [], ...(result.cleared && !paid ? { note: REPLAYS_USED } : {}) };
  await db.query(`UPDATE game.run SET status='settled', finished_at=now(), ticks=$2, credits=$3, result=$4 WHERE id=$1`,
    [id, replayed.ticks, credits, { result: resultOf(result), reward }]);
  await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
}

/**
 * A finished season level (GAME_CONTENT_PLAN §6): the same grants as a numbered level, once ever per level (first clear and Mastered,
 * ledger source season:<id>-<n>), replays under the daily cap, and the best kept per season level. It settles even if seasons were
 * switched off after it started (no loss).
 */
async function settleSeason(db, sim, me, id, run, progress, replayed, result, actions) {
  const key = run.season_id + '-' + run.season_n, { game: next, reward } = sim.applySeason(progress, key, result), pay = sim.cosmetics.CREDIT_REWARDS;
  if (result.cleared && reward.first) await postCredits(db, me, pay.firstClear, 'season_clear', 'season:' + key);
  else if (result.cleared && !await payReplay(db, sim, me, id)) { reward.credits -= pay.replay; reward.note = REPLAYS_USED; }
  if (reward.mastered) await postCredits(db, me, pay.mastered, 'season_mastered', 'season:' + key);
  const b = next.seasons[key];
  await db.query(`INSERT INTO game.season_best(user_id, season_id, n, stars, score, served, rules, steady, mastered, clears, bonus, coins, left_secs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (user_id, season_id, n) DO UPDATE SET stars=$4, score=$5, served=$6, rules=$7, steady=$8, mastered=$9, clears=$10, bonus=$11, coins=$12, left_secs=$13, updated_at=now()`,
  [me, run.season_id, run.season_n, b.stars, b.score, b.served, b.rules, b.steady, b.mastered, b.clears, b.bonus, b.coins, b.left]);
  await db.query(`UPDATE game.run SET status='settled', finished_at=now(), ticks=$2, credits=$3, result=$4 WHERE id=$1`,
    [id, replayed.ticks, Math.max(0, reward.credits), { result: resultOf(result, replayed.endReason === 'quit'), reward }]);
  await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
}

/**
 * A finished café visit: the visit counts for the host's private weekly numbers, and a clear pays kitchen credits for the first recipe
 * on the menu this player has never been paid for (payKitchen: once per recipe ever, across the Recipe Kitchen and every café, never
 * their own, within the day's three kitchen rewards). Nothing is paid if the café closed, was hidden or a block came in since the run
 * opened; if the host deleted their account the run settles without the visit. Hosts are never paid for visitors (QT-056).
 */
async function settleCafe(db, sim, me, id, run, recipeIds, replayed, result, actions) {
  const reward = { credits: 0, first: false, mastered: false, unlocks: [] }, cafe = await cafeNow(db, run.cafe_host, me);
  if (result.cleared && cafe?.visitable) Object.assign(reward, await payKitchen(db, sim, me, recipeIds, "Today's three kitchen rewards are used. Visit again tomorrow for this café's credits."));
  if (cafe) await db.query(`INSERT INTO game.cafe_visit(run_id, host_id, visitor_id, served) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [id, run.cafe_host, me, result.cleared]);
  await db.query(`UPDATE game.run SET status='settled', finished_at=now(), ticks=$2, credits=$4, result=$3 WHERE id=$1`,
    [id, replayed.ticks, { result: resultOf(result, replayed.endReason === 'quit'), reward }, reward.credits]);
  await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
}

/**
 * A finished Recipe Kitchen mission records the best per recipe and tier, pays kitchen credits (payKitchen) and counts toward the
 * level's rating (rateRun).
 */
async function settleMission(db, sim, me, id, run, recipeId, replayed, result, actions) {
  const reward = { credits: 0, first: false, mastered: false, unlocks: [] };
  if (result.cleared) Object.assign(reward, await payKitchen(db, sim, me, [recipeId], "Today's three kitchen rewards are used. Clear it again tomorrow for its credits."));
  const coins = Math.min(1000, Math.max(0, Math.round(result.coins))), left = result.cleared ? Math.min(600, Math.max(0, Math.floor(result.left))) : 0;
  await db.query(`INSERT INTO game.kitchen_best(user_id, recipe_id, tier, pack, stars, score, clears, coins, left_secs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (user_id, recipe_id, tier) DO UPDATE SET pack=$4, stars=GREATEST(game.kitchen_best.stars, $5), score=GREATEST(game.kitchen_best.score, $6),
      clears=game.kitchen_best.clears + $7, coins=GREATEST(game.kitchen_best.coins, $8), left_secs=GREATEST(game.kitchen_best.left_secs, $9), updated_at=now()`,
  [me, recipeId, run.tier, run.pack, result.stars, result.score, result.cleared ? 1 : 0, result.cleared ? coins : 0, left]);
  const rated = await rateRun(db, sim, me, id, run, result.cleared);
  await db.query(`UPDATE game.run SET status='settled', finished_at=now(), ticks=$2, credits=$5, result=$3, rated=$4 WHERE id=$1`,
    [id, replayed.ticks, { result: resultOf(result, replayed.endReason === 'quit'), reward }, rated, reward.credits]);
  await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
}

/**
 * Kitchen credits (DAILY_CREDITS): a recipe pays once ever (ledger source recipe:<id>), on its first clear at any tier in the Recipe
 * Kitchen or in a café, for the first three recipes a Singapore day, and never for the member's own recipe (a private level of theirs,
 * or a member recipe they wrote). Pays for the first of `recipeIds` still unpaid; `full` is the note when the day's rewards are used.
 */
async function payKitchen(db, sim, me, recipeIds, full) {
  for (const recipeId of new Set(recipeIds)) {
    const memberId = /^member-([0-9a-f-]{36})$/.exec(recipeId)?.[1] ?? null;
    const own = (await db.query(`SELECT 1 FROM game.recipe_level WHERE recipe_id=$1 AND owner_id=$2
      UNION ALL SELECT 1 FROM recipes.recipe WHERE $3::uuid IS NOT NULL AND id = $3::uuid AND author_id=$2 LIMIT 1`, [recipeId, me, memberId])).rowCount;
    const source = 'recipe:' + (recipeId.length <= 57 ? recipeId : recipeId.slice(0, 48) + '-' + createHash('sha256').update(recipeId).digest('hex').slice(0, 8));
    if (own || (await db.query(`SELECT 1 FROM game.ledger WHERE user_id=$1 AND kind='kitchen' AND source=$2`, [me, source])).rowCount) continue;
    if (await paidToday(db, me, 'kitchen') >= sim.cosmetics.DAILY_CREDITS.kitchen) return { note: full };
    const credits = sim.cosmetics.DAILY_CREDITS.kitchenClear;
    return await postCredits(db, me, credits, 'kitchen', source) ? { credits, first: true } : {};
  }
  return {};
}

const HELP = { none: 0, chip: 1, full: 2 };
/**
 * Glicko-2 for a recipe level (GAME_CONTENT_PLAN §5): only a player's first settled attempt at a level and tier counts, at most
 * RATED_PER_DAY a Singapore day, and not with more help than the tier gives or at a slower Pace. The level's rating stops moving
 * once LOCK_PLAYERS have counted; the player's keeps moving. Returns whether the run counted.
 */
async function rateRun(db, sim, me, id, run, cleared) {
  const R = sim.rating;
  if (run.pace && run.pace !== 'normal') return false;
  if (run.hints && HELP[run.hints] > HELP[sim.tierHints(run.tier)]) return false;
  if ((await db.query(`SELECT 1 FROM game.run WHERE user_id=$1 AND pack=$2 AND tier=$3 AND status='settled' AND id<>$4 LIMIT 1`, [me, run.pack, run.tier, id])).rowCount) return false;
  const today = nearDays()[1], player = (await db.query('SELECT rating, rd, vol, day, rated_today FROM game.player_rating WHERE user_id=$1 FOR UPDATE', [me])).rows[0];
  const count = player && isoDay(player.day) === today ? player.rated_today : 0;
  if (count >= R.RATED_PER_DAY) return false;
  await db.query(`INSERT INTO game.level_rating(hash, tier, rating, rd, vol) VALUES($1, $2, 1500, $3, 0.06) ON CONFLICT DO NOTHING`, [run.pack, run.tier, R.START_RD]);
  const level = (await db.query('SELECT rating, rd, vol, players, locked_at FROM game.level_rating WHERE hash=$1 AND tier=$2 FOR UPDATE', [run.pack, run.tier])).rows[0];
  const before = player ?? R.PLAYER_START, score = cleared ? 1 : 0, mine = R.rate(before, level, score);
  await db.query(`INSERT INTO game.player_rating(user_id, rating, rd, vol, day, rated_today) VALUES($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE SET rating=$2, rd=$3, vol=$4, day=$5, rated_today=$6, updated_at=now()`, [me, mine.rating, mine.rd, mine.vol, today, count + 1]);
  const theirs = level.locked_at ? level : R.rate(level, before, 1 - score), players = level.players + 1;
  await db.query(`UPDATE game.level_rating SET rating=$3, rd=$4, vol=$5, players=$6::int, clears=clears+$7::int,
      locked_at=coalesce(locked_at, CASE WHEN $6::int >= $8::int THEN now() END), updated_at=now() WHERE hash=$1 AND tier=$2`,
  [run.pack, run.tier, theirs.rating, theirs.rd, theirs.vol, players, score, R.LOCK_PLAYERS]);
  return true;
}

/** Deletes input logs older than 30 days; settled results and the ledger stay. */
export async function purgeRunLogs() {
  const result = await pool.query("DELETE FROM game.run_log WHERE created_at < now() - interval '30 days'");
  return result.rowCount;
}
game.use(errors);
