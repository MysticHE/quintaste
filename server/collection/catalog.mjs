/**
 * What the Collection offers (owner decisions, 1 Nov 2026; docs/COLLECTION_PLAN.md). Credits are café credits
 * (game.ledger). The app's twin with names and art is src/config/collection.ts; keep ids and numbers in step.
 */

/** Avatar borders bought with credits. Owned borders are game.owned items 'border:<id>'. */
export const BORDERS = {
  sprout: { rarity: 'common', credits: 300 },
  bamboo: { rarity: 'rare', credits: 800 },
  'lotus-pond': { rarity: 'rare', credits: 1500 },
  mochi: { rarity: 'epic', credits: 2500 },
  'golden-lotus': { rarity: 'legend', credits: 5000 },
};

/** One-off tasks: ledger kind 'task_start', source 'start:<key>'. */
export const START = { profile: 50, 'photo-check': 100, 'first-friend': 30, 'first-review': 50, 'first-photo': 50, 'first-dinner': 150 };

/**
 * Everyday actions, each paid once per thing (the source) and up to `limit` a Singapore day or week. Reviews and photos
 * are paid 24 hours after posting, if still visible; a paid one that is later hidden or deleted is taken back.
 */
export const EVERYDAY = {
  cook: { kind: 'task_cook', credits: 15, limit: 3, per: 'day' },
  review: { kind: 'task_review', credits: 20, limit: 3, per: 'day' },
  photo: { kind: 'task_photo', credits: 10, limit: 2, per: 'day' },
  dinner: { kind: 'task_dinner', credits: 80, limit: 2, per: 'week' },
};
/** A review counts with a rating and at least this many characters of text. */
export const REVIEW_MIN_CHARS = 40;
/** Hours before a review or a cooked photo pays, so staff can hide it first. */
export const SETTLE_HOURS = 24;

/** Milestones: ledger kind 'task_milestone', source 'milestone:<ladder>-<at>'. */
export const MILESTONES = {
  recipes: [[10, 100], [25, 250], [50, 500]],
  reviews: [[10, 100], [25, 250], [50, 500]],
  dinners: [[5, 200], [15, 500], [30, 1000]],
};

/** Badges in order, with the tasks each needs. Dining badges show only to members who can use Dining (unless earned). */
export const BADGES = {
  'tea-for-two': { tier: 'bronze', dining: true },
  'good-company': { tier: 'silver', dining: true },
  explorer: { tier: 'gold', dining: false },
  'home-cook': { tier: 'gold', dining: false },
  'lotus-legend': { tier: 'mythic', dining: false },
};
/** Most badges a member may show on their profile. */
export const SHOWN_MAX = 3;

/** Gifts (phase 2): store prices in Singapore cents, and how many glints the opening plays. */
export const GIFTS = {
  rose: { tier: 'little', priceCents: 98, burst: 2 },
  lotus: { tier: 'sweet', priceCents: 298, burst: 3 },
  bouquet: { tier: 'grand', priceCents: 498, burst: 4 },
  mochi: { tier: 'grand', priceCents: 498, burst: 4 },
  'golden-lotus': { tier: 'signature', priceCents: 998, burst: 6 },
};
/** Every member's one free gift a Singapore week (owner, 1 Nov 2026). */
export const WEEKLY_GIFT = 'rose';
