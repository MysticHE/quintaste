import { pool, logger } from '../config.mjs';
import { CommunityError, communityRouter, errors, throttle, transaction, uuid } from '../community/http.mjs';
import { loadSim } from './sim.mjs';
import { lockProfile, postCredits } from './ledger.mjs';
import { importDevice, loadProgress, saveCafe } from './progress.mjs';
import { pictureUrl, picturesFor } from './art.mjs';

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
  const row = (await db.query(`SELECT hash, recipe_id, pack FROM game.recipe_level WHERE hash=$1 AND status='ready' AND (owner_id IS NULL OR owner_id=$2)`, [hash, me])).rows[0];
  if (!row) return null;
  try {
    const pack = sim.readPack(row.pack);
    if (sim.packHash(pack) !== row.hash) return null;
    sim.registerPack(pack);
    return { pack, recipeId: row.recipe_id };
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
  const { user } = res.locals;
  const levels = (await pool.query(`SELECT DISTINCT ON (l.recipe_id) l.hash, l.recipe_id, l.cuisine, l.owner_id IS NOT NULL AS mine,
      l.pack->'techniques' AS techniques, l.pack->'dishes'->0->>'name' AS name, l.pack->'dishes'->0->>'art' AS art
    FROM game.recipe_level l WHERE l.status = 'ready' AND (l.owner_id IS NULL OR l.owner_id = $1)
    ORDER BY l.recipe_id, l.recipe_revision DESC, l.created_at DESC LIMIT 300`, [user.id])).rows;
  const [bests, pictures] = await Promise.all([
    pool.query('SELECT recipe_id, tier, stars, score, clears FROM game.kitchen_best WHERE user_id = $1', [user.id]),
    pool.query(`SELECT a.art_key, a.asset FROM game.art a JOIN game.asset s ON s.sha256 = a.asset AND s.status = 'approved' WHERE a.art_key = ANY($1)`, [levels.map(l => l.art)])]);
  const picture = new Map(pictures.rows.map(r => [r.art_key, pictureUrl(r.asset)]));
  const best = new Map();
  for (const b of bests.rows) best.set(b.recipe_id, { ...best.get(b.recipe_id), [b.tier]: { stars: b.stars, score: b.score, clears: b.clears } });
  res.set('Cache-Control', 'private, no-store').json({ levels: levels.map(l => ({ hash: l.hash, recipeId: l.recipe_id, name: l.name, cuisine: l.cuisine, mine: l.mine,
    techniques: l.techniques, art: l.art, picture: picture.get(l.art) ?? null, best: best.get(l.recipe_id) ?? {} })) });
});

// A Recipe Kitchen level pack, for the app to play, with its approved pictures. The pack itself is immutable.
game.get('/packs/:hash', async (req, res) => {
  const { sim, user } = res.locals, found = await playablePack(pool, sim, req.params.hash, user.id);
  if (!found) throw new CommunityError(404, 'That level is unavailable.');
  // Pictures are not part of the pack: an approved picture can arrive later, so this answer is cached briefly.
  res.set('Cache-Control', 'private, max-age=600').json({ hash: req.params.hash, recipeId: found.recipeId, pack: found.pack, pictures: await picturesFor(pool, found.pack) });
});

/** Opens an attempt when the service starts. The same id again returns the same attempt. */
game.post('/runs', async (req, res) => {
  const { sim, user } = res.locals, body = req.body ?? {};
  if (!uuid(body.id)) throw new CommunityError(400, 'Invalid run.');
  if (body.rules !== sim.rulesVersion) throw new CommunityError(409, 'Update QuinTaste to save game progress.', 'GAME_UPDATE');
  if (body.pack != null) return openMission(req, res);
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
    await db.query(`INSERT INTO game.run(id, user_id, level, mode, pet, signature, rules_version, hints, pack, tier) VALUES($1,$2,0,'rush',$3,'{}',$4,$5,$6,$7)`,
      [body.id, user.id, pet, sim.rulesVersion, hints, body.pack, body.tier]);
    return { id: body.id, status: 'open' };
  });
  res.json(run);
}

/** The parts of a result kept with a settled run (the full result is rebuilt from its input log when needed). */
const resultOf = result => ({ stars: result.stars, score: result.score, cleared: result.cleared, coins: result.coins, left: result.left, bonus: !!result.bonus?.done, stamps: result.stamps });

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
  // The service's seed comes from the run's id, which the app also used to play it.
  const setup = { level: run.level, special, mission: run.pack ? { pack: run.pack, tier: run.tier } : null, hints: run.hints, pet: run.pet, signature: run.signature, seed: sim.seedOf(run.id) };
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
    if (mission) { await settleMission(db, user.id, id, run, mission.recipeId, replayed, result, actions); return; }
    if (!sim.levelOpen(progress, run.level)) {
      await db.query(`UPDATE game.run SET status='rejected', reason='level locked', finished_at=now() WHERE id=$1`, [id]);
      await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
      return;
    }
    const { game: next, reward } = sim.applyResult(progress, run.level, result), pay = sim.cosmetics.CREDIT_REWARDS;
    if (result.cleared) await postCredits(db, user.id, reward.first ? pay.firstClear : pay.replay, reward.first ? 'first_clear' : 'replay', reward.first ? 'level:' + run.level : 'run:' + id);
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

/** Singapore dates (YYYY-MM-DD) for yesterday, today and tomorrow: a special may start around midnight. */
function nearDays(now = Date.now()) {
  return [-1, 0, 1].map(d => new Date(now + 8 * 3600000 + d * 86400000).toISOString().slice(0, 10));
}
/** A `date` column as YYYY-MM-DD (pg returns a Date at local midnight, or a string when parsing is off). */
const isoDay = value => value instanceof Date
  ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : String(value).slice(0, 10);

/** A finished Today's special pays the normal replay grant on a clear and records nothing per level (GAME_PLAN §10). */
async function settleSpecial(db, sim, me, id, replayed, result, actions) {
  const credits = result.cleared ? sim.cosmetics.CREDIT_REWARDS.replay : 0, reward = { credits, first: false, mastered: false, unlocks: [] };
  if (credits) await postCredits(db, me, credits, 'replay', 'run:' + id);
  await db.query(`UPDATE game.run SET status='settled', finished_at=now(), ticks=$2, credits=$3, result=$4 WHERE id=$1`,
    [id, replayed.ticks, credits, { result: resultOf(result), reward }]);
  await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
}

/**
 * A finished Recipe Kitchen mission records the best per recipe and tier. It pays no credits until the owner decides the
 * kitchen rule (GAME_CONTENT_PLAN §14); the reward says so with credits 0.
 */
async function settleMission(db, me, id, run, recipeId, replayed, result, actions) {
  const reward = { credits: 0, first: false, mastered: false, unlocks: [] };
  const coins = Math.min(1000, Math.max(0, Math.round(result.coins))), left = result.cleared ? Math.min(600, Math.max(0, Math.floor(result.left))) : 0;
  await db.query(`INSERT INTO game.kitchen_best(user_id, recipe_id, tier, pack, stars, score, clears, coins, left_secs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (user_id, recipe_id, tier) DO UPDATE SET pack=$4, stars=GREATEST(game.kitchen_best.stars, $5), score=GREATEST(game.kitchen_best.score, $6),
      clears=game.kitchen_best.clears + $7, coins=GREATEST(game.kitchen_best.coins, $8), left_secs=GREATEST(game.kitchen_best.left_secs, $9), updated_at=now()`,
  [me, recipeId, run.tier, run.pack, result.stars, result.score, result.cleared ? 1 : 0, result.cleared ? coins : 0, left]);
  await db.query(`UPDATE game.run SET status='settled', finished_at=now(), ticks=$2, credits=0, result=$3 WHERE id=$1`,
    [id, replayed.ticks, { result: resultOf(result), reward }]);
  await db.query('INSERT INTO game.run_log(run_id, actions) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, JSON.stringify(actions)]);
}

/** Deletes input logs older than 30 days; settled results and the ledger stay. */
export async function purgeRunLogs() {
  const result = await pool.query("DELETE FROM game.run_log WHERE created_at < now() - interval '30 days'");
  return result.rowCount;
}
game.use(errors);
