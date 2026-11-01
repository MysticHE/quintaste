import { logger } from '../config.mjs';
import { CommunityError, communityRouter, errors, throttle, transaction } from '../community/http.mjs';
import { lockProfile, postCredits } from '../game/ledger.mjs';
import { BORDERS, SHOWN_MAX } from './catalog.mjs';
import { facts, payTasks, taskStatus } from './earn.mjs';
import { settleBadges } from './badges.mjs';
import { accountAccess } from '../account-access.mjs';

/**
 * Collection (docs/COLLECTION_PLAN.md): credits from tasks, avatar borders and badges, for signed-in members. Every read
 * settles first: credits now due are paid and newly finished badges recorded, in one transaction under the member's
 * game profile lock, so two requests at once queue rather than pay twice. The master account (account-access.mjs) has every
 * border and badge unlocked (owner, 1 Nov 2026); it still earns and spends credits like anyone.
 */
export const collection = communityRouter();

async function settle(db, userId) {
  await lockProfile(db, userId);
  const master = (await accountAccess(userId, db)).role === 'master';
  const f = await facts(db, userId);
  const tasks = await payTasks(db, userId, f);
  const badges = await settleBadges(db, userId, f, master);
  return { f, tasks, badges, master };
}

/** The whole Collection as the app shows it. `just` is what this visit paid and awarded, for a short notice. */
async function view(db, userId, settled) {
  const { f, tasks, badges, master } = settled;
  const [profile, owned, shown] = await Promise.all([
    db.query('SELECT credits FROM game.profile WHERE user_id=$1', [userId]).then(r => r.rows[0]),
    db.query("SELECT substr(item, 8) AS id FROM game.owned WHERE user_id=$1 AND item LIKE 'border:%'", [userId]).then(r => r.rows.map(x => x.id)),
    db.query('SELECT badge FROM community.badge_shown WHERE user_id=$1 ORDER BY position', [userId]).then(r => r.rows.map(x => x.badge)),
  ]);
  const social = (await db.query('SELECT border FROM social.profile WHERE user_id=$1', [userId])).rows[0], equipped = social?.border ?? null;
  return {
    credits: profile.credits, owed: tasks.owed, lifetime: f.lifetime, hasProfile: !!social, master,
    tasks: taskStatus(f, tasks),
    borders: Object.entries(BORDERS).map(([id, b]) => ({ id, rarity: b.rarity, credits: b.credits, owned: master || owned.includes(id), equipped: equipped === id })),
    badges: badges.list, shown: shown.filter(id => badges.earned.has(id)),
    just: { credits: tasks.total, badges: badges.fresh },
  };
}

collection.get('/', async (_req, res) => {
  const me = res.locals.user.id;
  res.json(await transaction(async db => view(db, me, await settle(db, me)), 'collection:' + me));
});

/** Exchange credits for a border. Buying one already owned changes nothing. */
collection.post('/borders/:id', async (req, res) => {
  const me = res.locals.user.id, id = req.params.id, border = Object.hasOwn(BORDERS, id) ? BORDERS[id] : null;
  if (!border) throw new CommunityError(404, 'That border is unavailable.');
  await throttle('collection-buy:' + me, 30, 3600);
  res.json(await transaction(async db => {
    const settled = await settle(db, me);
    if (!settled.master && !(await db.query('SELECT 1 FROM game.owned WHERE user_id=$1 AND item=$2', [me, 'border:' + id])).rowCount) {
      // Credits owed for hidden posts can't be spent.
      const credits = (await db.query('SELECT credits FROM game.profile WHERE user_id=$1', [me])).rows[0].credits;
      if (credits - settled.tasks.owed < border.credits) throw new CommunityError(409, 'You need more credits for that.', 'NOT_ENOUGH_CREDITS');
      if (await postCredits(db, me, -border.credits, 'border', 'border:' + id))
        await db.query("INSERT INTO game.owned(user_id, item, source) VALUES($1,$2,'purchase')", [me, 'border:' + id]);
      logger.info({ event: 'collection_border_bought', border: id });
    }
    return view(db, me, settled);
  }, 'collection:' + me));
});

/** Wear an owned border, or none (`id: null`). Needs a Social profile, where the border is kept for others to see. */
collection.put('/border', async (req, res) => {
  const me = res.locals.user.id, id = req.body?.id ?? null;
  if (id !== null && !(typeof id === 'string' && Object.hasOwn(BORDERS, id))) throw new CommunityError(400, 'Choose a border.');
  res.json(await transaction(async db => {
    const settled = await settle(db, me);
    if (id && !settled.master && !(await db.query('SELECT 1 FROM game.owned WHERE user_id=$1 AND item=$2', [me, 'border:' + id])).rowCount)
      throw new CommunityError(409, 'Exchange this border first.');
    const updated = await db.query('UPDATE social.profile SET border=$2 WHERE user_id=$1', [me, id]);
    if (!updated.rowCount) throw new CommunityError(409, 'Set up your Social profile first.', 'SOCIAL_SETUP');
    return view(db, me, settled);
  }, 'collection:' + me));
});

/** The badges shown on the profile: up to three earned ones, in order. */
collection.put('/badges', async (req, res) => {
  const me = res.locals.user.id, ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
  if (!ids || ids.length > SHOWN_MAX || ids.some(x => typeof x !== 'string') || new Set(ids).size !== ids.length)
    throw new CommunityError(400, `Choose up to ${SHOWN_MAX} badges.`);
  res.json(await transaction(async db => {
    const settled = await settle(db, me);
    if (ids.some(x => !settled.badges.earned.has(x))) throw new CommunityError(409, 'You can show only badges you have earned.');
    await db.query('DELETE FROM community.badge_shown WHERE user_id=$1', [me]);
    for (const [i, badge] of ids.entries()) await db.query('INSERT INTO community.badge_shown(user_id, position, badge) VALUES($1,$2,$3)', [me, i + 1, badge]);
    return view(db, me, settled);
  }, 'collection:' + me));
});

collection.use(errors);
