import { createHash } from 'node:crypto';
import { postCredits } from '../game/ledger.mjs';
import { standing } from '../social/access.mjs';
import { EVERYDAY, MILESTONES, REVIEW_MIN_CHARS, SETTLE_HOURS, START } from './catalog.mjs';

/**
 * Credits from tasks (docs/COLLECTION_PLAN.md §2), worked out from what the app already records and paid through the café
 * credit ledger. Every payment is a ledger row unique per (account, kind, source), so working it out again pays nothing
 * twice: Collection calls settle() whenever it is opened or used. No streaks and no resets.
 */

/** Singapore calendar day ("YYYY-MM-DD") and the Monday that starts its week. */
const sgDay = at => new Date(new Date(at).getTime() + 8 * 3600000).toISOString().slice(0, 10);
function sgWeek(at) {
  const d = new Date(sgDay(at) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Everything the tasks and badges need about one member, read inside the caller's transaction. */
export async function facts(db, userId) {
  const q = (sql, params = [userId]) => db.query(sql, params).then(r => r.rows);
  const [state, friends, reviews, photos, cooked, dinners, misc] = await Promise.all([
    standing(userId, db),
    q('SELECT count(*)::int AS n FROM social.friend WHERE a_id=$1 OR b_id=$1').then(r => r[0].n),
    q(`SELECT r.place_id AS "placeId", r.created_at AS at, r.hidden_at IS NOT NULL AS hidden, length(trim(r.body)) >= ${REVIEW_MIN_CHARS} AS long,
        EXISTS (SELECT 1 FROM community.place_review_photo p WHERE p.review_id=r.id) AS photo FROM community.place_review r WHERE r.user_id=$1`),
    q('SELECT recipe_id AS "recipeId", created_at AS at, hidden_at IS NOT NULL AS hidden FROM community.cooked_photo WHERE user_id=$1'),
    q("SELECT target AS \"recipeId\", created_at AS at FROM community.reaction WHERE user_id=$1 AND kind='recipe' AND action='cooked'"),
    // Dinners where both people said "We met" (a "They didn't come" claim means one of them did not).
    q(`SELECT d.id, d.starts AS at, d.place_id AS "placeId", CASE WHEN d.host_id=$1 THEN d.guest_id ELSE d.host_id END AS partner,
        bool_and(r.eat_again IS TRUE) AS again FROM social.dinner d JOIN social.dinner_report r ON r.dinner_id=d.id
      WHERE d.status='accepted' AND (d.host_id=$1 OR d.guest_id=$1) AND d.starts < now() GROUP BY d.id HAVING count(*) FILTER (WHERE r.met='yes') = 2`),
    q(`SELECT
        (SELECT count(*)::int FROM social.dinner d WHERE (d.host_id=$1 OR d.guest_id=$1) AND d.status='accepted' AND d.starts > now() - interval '90 days' AND d.starts < now() AND (
          EXISTS (SELECT 1 FROM social.dinner_report r WHERE r.dinner_id=d.id AND r.user_id=$1 AND r.met='didnt_go')
          OR (EXISTS (SELECT 1 FROM social.dinner_report r WHERE r.dinner_id=d.id AND r.user_id<>$1 AND r.met='no_show')
            AND NOT EXISTS (SELECT 1 FROM social.dinner_report r WHERE r.dinner_id=d.id AND r.user_id=$1 AND r.met='yes')))) AS missed,
        (SELECT coalesce(sum(amount), 0)::int FROM game.ledger WHERE user_id=$1 AND amount > 0 AND kind <> 'staff') AS lifetime,
        (SELECT u."createdAt" <= now() - interval '365 days' FROM public."user" u WHERE u.id=$1) AS "yearOld",
        EXISTS (SELECT 1 FROM ops.restriction r WHERE r.user_id=$1 AND (r.active OR r.updated_at > now() - interval '365 days')) AS "restrictedYear",
        EXISTS (SELECT 1 FROM ops.restriction r WHERE r.user_id=$1 AND r.active) AS restricted,
        EXISTS (SELECT 1 FROM recipes.recipe x WHERE x.author_id=$1 AND x.live IS NOT NULL AND x.hidden_at IS NULL) AS "ownRecipe"`).then(r => r[0]),
  ]);
  const settled = Date.now() - SETTLE_HOURS * 3600000;
  const goodReviews = reviews.filter(r => r.long && !r.hidden), goodPhotos = photos.filter(p => !p.hidden);
  return { state, friends, reviews, photos, cooked, counted: firstPerPeriod(cooked, EVERYDAY.cook.limit), dinners, ...misc, goodReviews, goodPhotos,
    payableReviews: goodReviews.filter(r => new Date(r.at).getTime() <= settled), payablePhotos: goodPhotos.filter(p => new Date(p.at).getTime() <= settled) };
}

/**
 * A ledger source for a recipe, place or dinner id. Sources allow 64 letters, digits and dashes after the prefix; longer or
 * unusual ids (recipe and place ids may run to 120 characters) become a short digest of the id, so they always fit.
 */
export function source(prefix, id) {
  return prefix + ':' + (/^[A-Za-z0-9-]{1,64}$/.test(id) ? id : 'h' + createHash('sha256').update(String(id)).digest('hex').slice(0, 40));
}

/** Groups things by Singapore day (or week) and keeps the earliest `limit` of each group. */
function firstPerPeriod(items, limit, per = 'day') {
  const period = per === 'week' ? sgWeek : sgDay, groups = new Map();
  for (const item of items) groups.set(period(item.at), [...(groups.get(period(item.at)) ?? []), item]);
  return [...groups.values()].flatMap(group => group.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(0, limit));
}

/** Pays the earliest unpaid things in each day or week, up to the limit, counting what that period already paid. */
async function payLimited(db, userId, paid, items, rule) {
  const period = rule.per === 'week' ? sgWeek : sgDay, groups = new Map();
  for (const item of items) groups.set(period(item.at), [...(groups.get(period(item.at)) ?? []), item]);
  let total = 0;
  for (const group of groups.values()) {
    let used = group.filter(item => paid.has(rule.kind + '|' + item.source)).length;
    for (const item of group.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())) {
      if (used >= rule.limit) break;
      if (paid.has(rule.kind + '|' + item.source)) continue;
      if (await postCredits(db, userId, rule.credits, rule.kind, item.source)) { total += rule.credits; used += 1; paid.add(rule.kind + '|' + item.source); }
    }
  }
  return total;
}

/**
 * Takes back, in full, what a review or photo paid once it is hidden or deleted. When the balance can't cover it yet, the
 * amount is owed instead (returned), and is taken back in full on a later visit; owed credits can't be spent meanwhile.
 */
async function takeBack(db, userId, paid, rule, sources) {
  let owed = 0;
  for (const s of sources) {
    if (!paid.has(rule.kind + '|' + s) || paid.has('task_undo|' + s)) continue;
    const balance = (await db.query('SELECT credits FROM game.profile WHERE user_id=$1', [userId])).rows[0].credits;
    if (balance < rule.credits) { owed += rule.credits; continue; }
    if (await postCredits(db, userId, -rule.credits, 'task_undo', s)) paid.add('task_undo|' + s);
  }
  return owed;
}

/** The ledger sources each kind of task uses, worked out once from facts(). */
const sourcesOf = f => ({
  cook: f.counted.map(c => ({ at: c.at, source: source('recipe', c.recipeId) })),
  review: f.goodReviews.map(r => ({ at: r.at, source: source('place', r.placeId) })),
  payableReviews: f.payableReviews.map(r => ({ at: r.at, source: source('place', r.placeId) })),
  photo: f.goodPhotos.map(p => ({ at: p.at, source: source('recipe', p.recipeId) })),
  payablePhotos: f.payablePhotos.map(p => ({ at: p.at, source: source('recipe', p.recipeId) })),
  dinner: f.dinners.map(d => ({ at: d.at, source: source('dinner', d.id) })),
});

/**
 * Pays everything now due and takes back what is owed. Returns the credits paid, the set of paid 'kind|source' keys (for
 * taskStatus, so the ledger is read once) and the credits still owed. The caller holds the game profile lock (lockProfile).
 */
export async function payTasks(db, userId, f) {
  const paid = new Set((await db.query("SELECT kind || '|' || source AS k FROM game.ledger WHERE user_id=$1 AND kind LIKE 'task%'", [userId])).rows.map(r => r.k));
  const src = sourcesOf(f);
  if (f.restricted) return { total: 0, paid, owed: 0, src };
  let total = 0;
  const pay = async (amount, kind, s) => { if (!paid.has(kind + '|' + s) && await postCredits(db, userId, amount, kind, s)) { total += amount; paid.add(kind + '|' + s); } };
  const start = { profile: !['photos', 'basics'].includes(f.state.step), 'photo-check': f.state.verified, 'first-friend': f.friends > 0,
    'first-review': f.goodReviews.length > 0, 'first-photo': f.goodPhotos.length > 0, 'first-dinner': f.dinners.length > 0 };
  for (const [key, credits] of Object.entries(START)) if (start[key]) await pay(credits, 'task_start', 'start:' + key);
  total += await payLimited(db, userId, paid, src.cook, EVERYDAY.cook);
  total += await payLimited(db, userId, paid, src.payableReviews, EVERYDAY.review);
  total += await payLimited(db, userId, paid, src.payablePhotos, EVERYDAY.photo);
  total += await payLimited(db, userId, paid, src.dinner, EVERYDAY.dinner);
  const gone = (kind, visible) => [...paid].filter(k => k.startsWith(kind + '|')).map(k => k.slice(kind.length + 1)).filter(s => !visible.has(s));
  const owed = await takeBack(db, userId, paid, EVERYDAY.review, gone('task_review', new Set(src.review.map(x => x.source))))
    + await takeBack(db, userId, paid, EVERYDAY.photo, gone('task_photo', new Set(src.photo.map(x => x.source))));
  const counts = milestoneCounts(f);
  for (const [ladder, steps] of Object.entries(MILESTONES)) for (const [at, credits] of steps) if (counts[ladder] >= at) await pay(credits, 'task_milestone', `milestone:${ladder}-${at}`);
  return { total, paid, owed, src };
}

/** Cooking counts only up to the daily limit (the "cooked" mark comes from the member's own app), here and for badges. */
const milestoneCounts = f => ({ recipes: f.counted.length, reviews: f.goodReviews.length, dinners: f.dinners.length });

/** The Tasks tab: what each task pays and where the member stands, after settling (from payTasks, no second read). */
export function taskStatus(f, { paid, src }) {
  const has = (kind, s) => paid.has(kind + '|' + s), now = Date.now(), counts = milestoneCounts(f);
  const current = (rule, at) => rule.per === 'week' ? sgWeek(at) === sgWeek(now) : sgDay(at) === sgDay(now);
  return {
    start: Object.entries(START).map(([key, credits]) => ({ key, credits, done: has('task_start', 'start:' + key) })),
    everyday: Object.entries(EVERYDAY).map(([key, rule]) => ({ key, credits: rule.credits, limit: rule.limit, per: rule.per,
      used: src[key].filter(item => current(rule, item.at) && has(rule.kind, item.source)).length,
      waiting: key === 'review' ? f.goodReviews.length - f.payableReviews.length : key === 'photo' ? f.goodPhotos.length - f.payablePhotos.length : 0 })),
    milestones: Object.entries(MILESTONES).map(([key, steps]) => ({ key, count: counts[key],
      steps: steps.map(([at, credits]) => ({ at, credits, done: has('task_milestone', `milestone:${key}-${at}`) })) })),
  };
}
