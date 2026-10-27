import express from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { json, raw, signed } from '../bot-signature.mjs';

/**
 * The public Mochi kitchen (docs/MOCHI_KITCHEN_PLAN.md §4–5). The QT coordinator pushes one small snapshot built from verified
 * publication receipts; the static page at /kitchen reads it. No member, seller or reporter data is accepted, and nothing here
 * touches the database. The snapshot lives in the persistent state volume, so it survives a redeploy.
 */
const root = process.env.QT_KITCHEN_ROOT || path.resolve('.local/kitchen');
const feedFile = path.join(root, 'feed.json');
const pageRoot = path.resolve('server-assets/kitchen');

export const CHEFS = ['head', 'scout', 'wok', 'host', 'artist', 'writer', 'storyteller', 'fixer', 'safety'];
const STATES = ['working', 'reviewing', 'resting', 'waiting'];
const REASONS = ['price-not-on-menu', 'hours-unclear', 'branch-unclear', 'diet-not-proven', 'photo-rights-unclear', 'date-not-confirmed', 'other'];
const FIELDS = ['hours', 'menu', 'address', 'diet'];
/** The fields each ticket type must carry; the page renders every type from fixed English and Chinese templates. */
const TYPES = {
  'menu-prices': ['place', 'n'], hours: ['place'], 'new-place': ['place'], cover: ['place'], recipe: ['title'],
  event: ['title', 'date'], closures: ['n'], 'event-removed': ['n'], art: ['n'], 'member-recipes': ['n'],
  fixed: ['place', 'field'], 'sfa-notice': ['title', 'url'], 'lunar-picks': ['n', 'date'],
};
const ROUTE = /^\/(menu|place|cook|social|explore)(\/[A-Za-z0-9._~%-]{1,140})*(\?[A-Za-z0-9=&%._-]{1,80})?$/;
const SFA = /^https:\/\/www\.sfa\.gov\.sg\/[A-Za-z0-9/._~%-]{1,300}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY = { version: 1, generatedAt: null, chefs: [], today: null, sentBack: [], items: [], diary: [] };

class FeedError extends Error {}
const fail = what => { throw new FeedError(what); };
const text = (value, max, what) => {
  const clean = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  return clean && clean.length <= max ? clean : fail(what);
};
const count = (value, what) => Number.isInteger(value) && value >= 0 && value <= 100000 ? value : fail(what);
/** A timestamp from the last 14 days, allowing five minutes of clock drift. */
const recent = (value, what) => {
  const at = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(at) && at > Date.now() - 14 * 864e5 && at < Date.now() + 3e5 ? new Date(at).toISOString() : fail(what);
};
const upcoming = (value, what) => {
  const at = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(at) && at < Date.now() + 864e5 ? new Date(at).toISOString() : fail(what);
};
const list = (value, max, what) => Array.isArray(value) && value.length <= max ? value : fail(what);

function readChef(c) {
  if (!c || !CHEFS.includes(c.id) || !STATES.includes(c.state)) fail('chef');
  const chef = { id: c.id, state: c.state };
  if (c.since != null) chef.since = recent(c.since, 'chef.since');
  if (c.nextShift != null) chef.nextShift = upcoming(c.nextShift, 'chef.nextShift');
  if (c.waiting != null) chef.waiting = count(c.waiting, 'chef.waiting');
  return chef;
}

function readItem(i) {
  if (!i || !CHEFS.includes(i.chef) || !Object.hasOwn(TYPES, i.type)) fail('item');
  const item = { chef: i.chef, type: i.type, at: recent(i.at, 'item.at') };
  for (const key of TYPES[i.type]) {
    if (key === 'place' || key === 'title') item[key] = text(i[key], 90, 'item.' + key);
    else if (key === 'n') item.n = count(i.n, 'item.n');
    else if (key === 'field') item.field = FIELDS.includes(i.field) ? i.field : fail('item.field');
    else if (key === 'date') item.date = typeof i.date === 'string' && DAY.test(i.date) ? i.date : fail('item.date');
    else if (key === 'url') item.url = typeof i.url === 'string' && SFA.test(i.url) ? i.url : fail('item.url');
  }
  if (i.route != null) item.route = typeof i.route === 'string' && ROUTE.test(i.route) ? i.route : fail('item.route');
  return item;
}

/** The whole snapshot, rebuilt from known fields only; one malformed part refuses the push so nothing is half-shown. */
export function readFeed(body) {
  if (!body || body.version !== 1 || body.sample != null) fail('feed');
  const today = body.today ?? {};
  return {
    version: 1,
    generatedAt: recent(body.generatedAt, 'generatedAt'),
    delayMinutes: count(body.delayMinutes ?? 30, 'delayMinutes'),
    chefs: list(body.chefs ?? [], CHEFS.length, 'chefs').map(readChef),
    today: Object.fromEntries(['published', 'sentBack', 'fixedFromReports', 'waitingForOwner']
      .filter(key => today[key] != null).map(key => [key, count(today[key], 'today.' + key)])),
    sentBack: list(body.sentBack ?? [], REASONS.length, 'sentBack').map(s =>
      REASONS.includes(s?.reason) ? { reason: s.reason, count: count(s.count, 'sentBack.count') } : fail('sentBack.reason')),
    items: list(body.items ?? [], 40, 'items').map(readItem),
    diary: list(body.diary ?? [], CHEFS.length, 'diary').map(d =>
      CHEFS.includes(d?.chef) ? { chef: d.chef, en: text(d.en, 140, 'diary.en'), zh: text(d.zh, 140, 'diary.zh') } : fail('diary.chef')),
  };
}

export const kitchen = express.Router();
kitchen.get('/feed', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  try { res.type('application/json').send(await fs.readFile(feedFile)); }
  catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    res.json(EMPTY);
  }
});
kitchen.post('/bot/feed', raw('16kb'), signed, async (req, res) => {
  let feed;
  try { feed = readFeed(json(req)); }
  catch (error) {
    if (error instanceof FeedError) return res.status(400).json({ error: 'Invalid ' + error.message + '.' });
    throw error;
  }
  await fs.mkdir(root, { recursive: true });
  const temporary = feedFile + '.' + randomUUID() + '.tmp';  // unique, so two pushes at once never share a file
  await fs.writeFile(temporary, JSON.stringify(feed));
  await fs.rename(temporary, feedFile);
  res.json({ ok: true, items: feed.items.length });
});

/** The static page. Page, styles and scripts revalidate on every load so a release never mixes old and new files;
 * art and fonts cache for a day. */
export const kitchenPage = express.static(pageRoot, { index: 'index.html', maxAge: '1d',
  setHeaders: (res, file) => { if (/\.(html|css|js)$/.test(file)) res.setHeader('Cache-Control', 'no-cache'); } });
