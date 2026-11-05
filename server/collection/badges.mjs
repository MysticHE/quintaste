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
  const reviewAreas = f.goodReviews.map(r => area(r.placeId)).filter(Boolean);
  const partners = distinct(f.dinners.map(d => d.partner));
  return {
    'tea-for-two': [task('dinners', f.dinners.length, 1)],
    'good-company': [task('dinners', f.dinners.length, 5), task('dinnerFriends', partners, 3)],
    explorer: [task('reviews', distinct(f.goodReviews.map(r => r.placeId)), 10), task('areas', distinct(reviewAreas), 3),
      task('photos', distinct(f.goodReviews.filter(r => r.photo).map(r => r.placeId)), 5)],
    // Badge milestones count distinct recipes, independently of the daily credit payout cap.
    'home-cook': [task('cooked', distinct(f.cooked.map(c => c.recipeId)), 10), task('cookedPhotos', distinct(f.goodPhotos.map(p => p.recipeId)), 5)],
    'lotus-legend': [task('badges', ['explorer', 'home-cook'].filter(b => earned.has(b)).length, 2), task('lifetime', f.lifetime, 10000)],
  };
}

/** Records newly finished badges; returns the badge list for the app and the ids earned just now. */
export async function settleBadges(db, userId, f, master = false) {
  const rows = (await db.query('SELECT badge, earned_at, revoked_at FROM community.badge_award WHERE user_id=$1', [userId])).rows;
  const earned = new Set(rows.filter(r => !r.revoked_at).map(r => r.badge)), blocked = new Set(rows.map(r => r.badge)), fresh = [];
  const at = new Map(rows.map(r => [r.badge, r]));
  // Settle Explorer and Home Cook before Lotus Legend, including awards earned in this request.
  let progress = await tasksFor(f, earned);
  for (const id of Object.keys(BADGES)) {
    const done = progress[id].every(t => t.done >= t.of);
    if (done && !blocked.has(id) && !f.restricted && !master) {
      const added = (await db.query('INSERT INTO community.badge_award(user_id, badge) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING earned_at', [userId, id])).rows[0];
      if (!added) continue;
      at.set(id, added);
      earned.add(id); blocked.add(id); fresh.push(id);
      if (id !== 'lotus-legend') progress = await tasksFor(f, earned);
    }
  }
  if (master) for (const id of Object.keys(BADGES)) if (!at.get(id)?.revoked_at) earned.add(id);
  const list = Object.entries(BADGES)
    // A Dining badge shows to members who can use Dining, and to anyone who earned it or had it removed by staff.
    .filter(([id, b]) => !b.dining || f.state.canMeet || earned.has(id) || !!at.get(id)?.revoked_at)
    .map(([id, b]) => ({ id, tier: b.tier, earned: earned.has(id), revoked: !!at.get(id)?.revoked_at,
      accessUnlocked: master && !at.get(id)?.earned_at,
      earnedAt: at.get(id)?.earned_at ?? null, tasks: progress[id] }));
  return { list, fresh, earned };
}
