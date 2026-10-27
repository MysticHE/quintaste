// Local preview of the Mochi kitchen page with a SAMPLE feed (marked sample: true, so the page says so). Never deployed:
// scripts/ is not in the release. Run: node scripts/kitchen-preview.mjs  → http://localhost:8095/kitchen/
import express from 'express';
import path from 'node:path';

process.env.QT_KITCHEN_ROOT = path.resolve('.local/kitchen/preview-data');
const { kitchenPage } = await import('../server/kitchen/router.mjs');

const minutes = m => new Date(Date.now() - m * 6e4).toISOString();
const sgtHour = () => (new Date().getUTCHours() + 8) % 24;
const nextAt = hour => {
  const d = new Date();
  d.setUTCHours(hour - 8, 0, 0, 0);
  if (d <= new Date()) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
};
const evening = sgtHour() >= 18 && sgtHour() < 22;

const base = [
  { chef: 'scout', type: 'menu-prices', place: 'Whole Earth', n: 12, route: '/menu/whole-earth-peck-seah', ago: 4 },
  { chef: 'scout', type: 'hours', place: 'Lin Lin Vegetarian Delight', route: '/place/catalogue-research-linlin-bedok-north', ago: 22 },
  { chef: 'artist', type: 'art', n: 3, ago: 48 },
  { chef: 'scout', type: 'new-place', place: 'Ascend Vegetarian', route: '/place/catalogue-research-ascend-cross-lead', ago: 75 },
  { chef: 'writer', type: 'member-recipes', n: 2, ago: 110 },
  { chef: 'scout', type: 'cover', place: 'Original Greens', route: '/place/catalogue-research-originalgreens-shaw-plaza', ago: 160 },
  { chef: 'wok', type: 'recipe', title: 'Kaya toast', route: '/cook/recipe/kaya-toast', ago: 980 },
  { chef: 'host', type: 'event', title: 'Vegetarian cooking class', date: '2026-11-08', route: '/social?tab=events', ago: 1010 },
  { chef: 'scout', type: 'closures', n: 1, ago: 1200 },
];
const arrivals = [
  { chef: 'scout', type: 'hours', place: 'Su Xiang Vegetarian', route: '/place/catalogue-research-su-xiang-lau-pa-sat-46' },
  { chef: 'scout', type: 'menu-prices', place: 'Ascend Vegetarian', n: 8, route: '/menu/research-ascend-cross-lead' },
  { chef: 'artist', type: 'art', n: 1 },
];
const started = Date.now();

function feed() {
  const extra = Math.min(arrivals.length, Math.floor((Date.now() - started) / 75_000));
  const items = [
    ...arrivals.slice(0, extra).map((a, i) => ({ ...a, at: new Date(started + (i + 1) * 75_000).toISOString() })).reverse(),
    ...base.map(({ ago, ...item }) => ({ ...item, at: minutes(ago) })),
  ];
  return {
    version: 1, sample: true, generatedAt: new Date().toISOString(), delayMinutes: 30,
    chefs: [
      { id: 'head', state: 'reviewing', since: minutes(6) },
      { id: 'scout', state: 'working', since: minutes(41) },
      { id: 'wok', state: evening ? 'working' : 'resting', nextShift: nextAt(18) },
      { id: 'host', state: evening ? 'working' : 'resting', nextShift: nextAt(18) },
      { id: 'artist', state: 'waiting', waiting: 3 },
      { id: 'writer', state: 'resting' },
    ],
    today: { published: 9 + extra, sentBack: 2, waitingForOwner: 3 },
    sentBack: [{ reason: 'price-not-on-menu', count: 1 }, { reason: 'hours-unclear', count: 1 }],
    items,
  };
}

const app = express();
app.get('/api/kitchen/feed', (_req, res) => res.set('Cache-Control', 'no-store').json(feed()));
app.use('/kitchen', kitchenPage);
app.get('/', (_req, res) => res.redirect('/kitchen/'));
app.listen(8095, () => console.log('Mochi kitchen preview on http://localhost:8095/kitchen/'));
