import { pool, logger } from '../config.mjs';
import { CommunityError, communityRouter, errors, throttle, transaction, uuid } from '../community/http.mjs';
import { loadSim } from './sim.mjs';
import { lockProfile, postCredits } from './ledger.mjs';
import { importDevice, loadProgress, saveCafe } from './progress.mjs';

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

/** Opens an attempt when the service starts. The same id again returns the same attempt. */
game.post('/runs', async (req, res) => {
  const { sim, user } = res.locals, body = req.body ?? {};
  if (!uuid(body.id)) throw new CommunityError(400, 'Invalid run.');
  if (body.rules !== sim.rulesVersion) throw new CommunityError(409, 'Update QuinTaste to save game progress.', 'GAME_UPDATE');
  // Today's special: a Singapore date within a day of now; otherwise a numbered level.
  const day = body.special == null ? null : String(body.special);
  if (day !== null && !nearDays().includes(day)) throw new CommunityError(400, 'Invalid run.');
  // Every service is a Rush; the column keeps its old name and value (the schema allows 'rush' and 'calm').
  const level = day ? 0 : Number(body.level), mode = 'rush', lv = sim.LEVELS[level - 1];
  if (!day && (!Number.isInteger(level) || !lv)) throw new CommunityError(400, 'Invalid run.');
  const hints = ['full', 'chip', 'none'].includes(body.hints) ? body.hints : null;
  const pet = typeof body.pet === 'string' && Object.hasOwn(sim.cosmetics.PETS, body.pet) ? body.pet : null;
  const signature = lv?.signature && Array.isArray(body.signature) ? [...new Set(body.signature.filter(d => typeof d === 'string' && Object.hasOwn(sim.DISHES, d)))].slice(0, 3) : [];
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
    const claimed = Number(body.top), top = day ? (Number.isInteger(claimed) && claimed >= 5 && claimed <= 20 ? claimed : sim.highestCleared(progress)) : null;
    if (day && !sim.specialFor(progress, day)) throw new CommunityError(409, "Today's special opens at Level 6.", 'SPECIAL_LOCKED');
    await db.query(`INSERT INTO game.run(id, user_id, level, mode, pet, signature, rules_version, special_day, special_top, hints) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [body.id, user.id, level, mode, pet, signature, sim.rulesVersion, day, top, hints]);
    return { id: body.id, status: 'open' };
  });
  res.json(run);
});

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
  // The service's seed comes from the run's id, which the app also used to play it.
  const setup = { level: run.level, special, hints: run.hints, pet: run.pet, signature: run.signature, seed: sim.seedOf(run.id) };
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

/** Deletes input logs older than 30 days; settled results and the ledger stay. */
export async function purgeRunLogs() {
  const result = await pool.query("DELETE FROM game.run_log WHERE created_at < now() - interval '30 days'");
  return result.rowCount;
}
game.use(errors);
