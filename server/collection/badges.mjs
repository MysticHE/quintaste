import { allowed } from '../operations.mjs';
import { placeAreas } from './areas.mjs';
import { BADGES } from './catalog.mjs';

/**
 * Badges (docs/COLLECTION_PLAN.md §4): each needs every task in its list, worked out from facts() (earn.mjs). A badge
 * is recorded the first time its list is complete and kept after that, unless staff revoke it; a revoked badge is not
 * earned again. Restricted members see their progress but earn nothing while restricted. The master account has every
 * badge unlocked (owner, 1 Nov 2026) without awards being written, so its own progress stays real underneath.
 */
const distinct = list => new Set(list).size;
const task = (key, done, of) => ({ key, done: Math.min(done, of), of });

/** Each badge's tasks with progress. `earned` is the set of badges already awarded (for Lotus Legend). */
async function tasksFor(f, earned) {
  const area = await placeAreas();
  const reviewAreas = f.goodReviews.map(r => area(r.placeId)).filter(Boolean), dinnerAreas = f.dinners.map(d => area(d.placeId)).filter(Boolean);
  const partners = distinct(f.dinners.map(d => d.partner)), withRecipes = await allowed('recipes');
  return {
    'tea-for-two': [task('dinners', f.dinners.length, 5), task('friends', partners, 3), task('again', f.dinners.filter(d => d.again).length, 3)],
    'good-company': [task('friends', f.friends, 20), task('dinnerFriends', partners, 8), task('noMissed', f.missed === 0 ? 1 : 0, 1)],
    explorer: [task('reviews', f.goodReviews.length, 25), task('areas', distinct(reviewAreas), 10),
      task('photos', f.goodReviews.filter(r => r.photo).length, 10), task('dinnerAreas', distinct(dinnerAreas), 5)],
    'home-cook': [task('cooked', f.counted.length, 30), task('cookedPhotos', f.goodPhotos.length, 15), ...(withRecipes ? [task('ownRecipe', f.ownRecipe ? 1 : 0, 1)] : [])],
    'lotus-legend': [task('badges', ['tea-for-two', 'good-company', 'explorer', 'home-cook'].filter(b => earned.has(b)).length, 4),
      task('lifetime', f.lifetime, 10000), task('year', f.yearOld && !f.restrictedYear ? 1 : 0, 1)],
  };
}

/** Records newly finished badges; returns the badge list for the app and the ids earned just now. */
export async function settleBadges(db, userId, f, master = false) {
  const rows = (await db.query('SELECT badge, earned_at, revoked_at FROM community.badge_award WHERE user_id=$1', [userId])).rows;
  const earned = new Set(rows.filter(r => !r.revoked_at).map(r => r.badge)), blocked = new Set(rows.map(r => r.badge)), fresh = [];
  // Lotus Legend counts the other four, so they are settled first (object order) and the list is worked out again after.
  let progress = await tasksFor(f, earned);
  for (const id of Object.keys(BADGES)) {
    const done = progress[id].every(t => t.done >= t.of);
    if (done && !blocked.has(id) && !f.restricted && !master) {
      await db.query('INSERT INTO community.badge_award(user_id, badge) VALUES($1,$2) ON CONFLICT DO NOTHING', [userId, id]);
      earned.add(id); blocked.add(id); fresh.push(id);
      if (id !== 'lotus-legend') progress = await tasksFor(f, earned);
    }
  }
  if (master) for (const id of Object.keys(BADGES)) earned.add(id);
  const at = new Map(rows.map(r => [r.badge, r]));
  const list = Object.entries(BADGES)
    // A Dining badge shows to members who can use Dining, and to anyone who earned it or had it removed by staff.
    .filter(([id, b]) => !b.dining || f.state.canMeet || earned.has(id) || !!at.get(id)?.revoked_at)
    .map(([id, b]) => ({ id, tier: b.tier, earned: earned.has(id), revoked: !!at.get(id)?.revoked_at,
      earnedAt: earned.has(id) ? (at.get(id)?.earned_at ?? new Date().toISOString()) : null, tasks: progress[id] }));
  return { list, fresh, earned };
}
