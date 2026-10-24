import express from 'express';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readSnapshot, publish, recordState, removeRecord, revertRecord } from './store.mjs';
import { hash } from './validation.mjs';
import { publisherKey } from './key.mjs';
import { staffContent, staffCreated, staffEdited, staffPlace, staffRecord } from '../staff-content.mjs';
import { logger } from '../config.mjs';

export const editorial = express.Router();
const root = process.env.QT_EDITORIAL_ROOT || path.resolve('.local/editorial');
const baseline = JSON.parse(fs.readFileSync(path.resolve('server-assets/editorial-baseline.json'), 'utf8'));
let lastWrite = 0;
/** Header checks run before any body is read; only publication batches (which carry assets) get the large limit. */
function precheck(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    const time = req.get('X-QT-Time'), signature = req.get('X-QT-Signature');
    if (publisherKey().length < 48 || !/^\d{10}$/.test(time ?? '') || Math.abs(Date.now() / 1000 - Number(time)) > 300 || !/^[a-f0-9]{64}$/.test(signature ?? '')) return res.sendStatus(401);
    next();
  } catch { res.sendStatus(401); }
}
const smallBody = express.raw({ type: 'application/json', limit: '64kb' }), batchBody = express.raw({ type: 'application/json', limit: '2mb' });
function authenticate(req, res, next) {
  try {
    const secret = publisherKey(), time = req.get('X-QT-Time'), signature = req.get('X-QT-Signature');
    const route = req.originalUrl.split('?')[0].slice('/api/editorial'.length);
    const expected = createHmac('sha256', secret).update(time + '\n' + req.method + '\n' + route + '\n' + hash(req.body ?? Buffer.alloc(0))).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return res.sendStatus(401);
    next();
  } catch { res.sendStatus(401); }
}
editorial.use('/control', precheck, (req, res, next) => (req.path === '/publish' ? batchBody : smallBody)(req, res, next), authenticate);
editorial.get('/control/state', async (_req, res, next) => {
  try {
    const [snapshot, staff] = await Promise.all([readSnapshot(root), staffContent().catch(error => {
      logger.warn({ event: 'editorial_state_staff_places_unavailable', error: error instanceof Error ? error.message : String(error) });
      return null;
    })]);
    // Owner, 24 Oct 2026: the bots skip a place Explore already lists under a staff- id (staffPlaces, identity only, the places
    // Explore shows) and treat places staff hid as not listed (staffHidden). Unreadable staff content leaves both empty: the bots
    // then check packaged and bot places only, as before.
    const places = staff ? [...staff.items.values()].filter(item => item.kind === 'place') : [];
    const staffPlaces = places.filter(item => staffPlace(staff, item.id)).map(({ id, data }) => ({ id, name: data?.name ?? '', branch: data?.branch ?? '',
      address: data?.address ?? '', postalCode: data?.postalCode ?? '', kitchen: data?.kitchen ?? null, googlePlaceId: null }));
    const staffHidden = places.filter(item => item.hidden).map(item => item.id);
    res.json({ revision: snapshot.revision, removals: Object.values(snapshot.removals ?? {}), reverts: Object.values(snapshot.reverts ?? {}), changes: Object.values(snapshot.records).map(r => r.change).filter(Boolean), venues: baseline.venues.map(v => ({ id: v.id, ...recordState(snapshot, baseline, 'venue', v.id) })), records: Object.values(snapshot.records).filter(r => r.kind !== 'venue').map(r => ({ kind: r.kind, id: r.id, hash: hash(r.data), data: r.data })), recipeIdentities: baseline.recipes, staffPlaces, staffHidden });
  } catch (e) { next(e); }
});
editorial.post('/control/publish', async (req, res) => {
  if (Date.now() - lastWrite < 1000) return res.status(429).json({ error: 'Retry publication shortly.' });
  lastWrite = Date.now();
  try { const result = await publish(root, baseline, JSON.parse(req.body.toString())); res.json(result); }
  catch (error) { res.status(error.status ?? (error instanceof SyntaxError ? 400 : 503)).json({ error: error.status ? error.message : 'Publication unavailable; prior content retained.' }); }
});
editorial.post('/control/remove', async (req, res) => {
  if (Date.now() - lastWrite < 1000) return res.status(429).json({ error: 'Retry shortly.' });
  lastWrite = Date.now();
  try { res.json(await removeRecord(root, JSON.parse(req.body.toString()))); }
  catch (error) { res.status(error.status ?? (error instanceof SyntaxError ? 400 : 503)).json({ error: error.status ? error.message : 'Removal unavailable; check current state before retrying.' }); }
});
editorial.post('/control/revert', async (req, res) => {
  if (Date.now() - lastWrite < 1000) return res.status(429).json({ error: 'Retry shortly.' });
  lastWrite = Date.now();
  try { res.json(await revertRecord(root, baseline, JSON.parse(req.body.toString()))); }
  catch (error) { res.status(error.status ?? (error instanceof SyntaxError ? 400 : 503)).json({ error: error.status ? error.message : 'Revert unavailable; check current state before retrying.' }); }
});
function conditional(req, res, value) {
  const etag = '"' + hash(value) + '"'; res.set({ ETag: etag, 'Cache-Control': 'public, max-age=60, must-revalidate', 'X-Content-Type-Options': 'nosniff' });
  return req.get('If-None-Match') === etag ? res.status(304).end() : res.json(value);
}
editorial.get('/status', async (req, res, next) => {
  try { const s = await readSnapshot(root); conditional(req, res, { revision: s.revision, publishedAt: s.publishedAt ?? null, counts: Object.values(s.records).reduce((n, r) => ({ ...n, [r.kind]: (n[r.kind] ?? 0) + 1 }), {}) }); } catch (e) { next(e); }
});
editorial.get('/recipes/:id', async (req, res, next) => {
  try {
    const [snapshot, staff] = await Promise.all([readSnapshot(root), staffContent()]), id = req.params.id;
    const item = staff.items.get('recipe:' + id), row = snapshot.records['recipe:' + id];
    const recipe = row || item?.origin === 'staff' ? staffRecord(staff, 'recipe', id, row?.data ?? null) : null;
    recipe ? conditional(req, res, recipe) : res.sendStatus(404);
  } catch (e) { next(e); }
});
/** Staff edits and hides of the recipes bundled in the app (bot and staff-created recipes come through /recipes). */
/** A saved event remains viewable after its date; hidden/cancelled records do not. */
editorial.get('/events/:id', async (req, res, next) => {
  try {
    const [snapshot, staff] = await Promise.all([readSnapshot(root), staffContent()]);
    const id = String(req.params.id), item = staffRecord(staff, 'event', id, snapshot.records['event:' + id]?.data ?? null)
      ?? staffCreated(staff, 'event').find(item => item.id === id);
    if (!item || item.status === 'cancelled') return res.sendStatus(404);
    conditional(req, res, item);
  } catch (error) { next(error); }
});
editorial.get('/staff-recipes', async (req, res, next) => {
  try {
    const [snapshot, staff] = await Promise.all([readSnapshot(root), staffContent()]);
    const items = [...staff.items.values()].filter(item => item.kind === 'recipe');
    conditional(req, res, { revision: staff.revision, hidden: items.filter(item => item.hidden).map(item => item.id),
      recipes: items.filter(item => !item.hidden && item.origin === 'edit' && staffEdited(item) && !snapshot.records['recipe:' + item.id]).map(item => staffRecord(staff, 'recipe', item.id, null)) });
  } catch (e) { next(e); }
});
for (const kind of ['recipe', 'event']) editorial.get('/' + kind + 's', async (req, res, next) => {
  try {
    const [snapshot, staff] = await Promise.all([readSnapshot(root), staffContent()]), revision = hash(snapshot.revision + staff.revision), q = String(req.query.q ?? '').trim().toLowerCase().slice(0, 160), category = String(req.query.category ?? '').slice(0, 40);
    let offset = 0;
    if (req.query.cursor) {
      try { const cursor = JSON.parse(Buffer.from(String(req.query.cursor).slice(0, 300), 'base64url').toString()); if (cursor.revision !== revision || cursor.q !== q || cursor.category !== category || !Number.isInteger(cursor.offset) || cursor.offset < 0 || cursor.offset > 2000 || cursor.offset % 20) throw Error(); offset = cursor.offset; }
      catch { return res.status(409).json({ error: 'Results changed. Refresh the list.' }); }
    }
    // Staff edits replace bot records, staff hides remove them, and staff-created records join them.
    const records = [...Object.values(snapshot.records).filter(r => r.kind === kind).map(r => staffRecord(staff, kind, r.id, r.data)), ...staffCreated(staff, kind)];
    const rows = records.filter(Boolean).filter(r => kind === 'recipe' ? !r.withdrawal && (!category || r.categories.includes(category)) && (!q || (r.name + ' ' + r.ingredients.map(i => i.name).join(' ')).toLowerCase().includes(q)) : r.status !== 'cancelled' && Date.parse(r.startsAt) > Date.now() && (!q || (r.title + ' ' + r.organiser + ' ' + r.address).toLowerCase().includes(q)))
      .sort((a, b) => kind === 'event' ? a.startsAt.localeCompare(b.startsAt) : a.name.localeCompare(b.name));
    // Only the requested page is returned. Full recipe steps load at detail time.
    const items = rows.slice(offset, offset + 20).map(r => kind === 'event' ? r : { ...Object.fromEntries(Object.entries(r).filter(([key]) => !['ingredients', 'steps', 'adaptationNote'].includes(key))), ingredientNames: r.ingredients.map(i => i.name) });
    conditional(req, res, { revision, items, total: rows.length, nextCursor: offset + 20 < rows.length ? Buffer.from(JSON.stringify({ revision, offset: offset + 20, q, category })).toString('base64url') : null });
  } catch (e) { next(e); }
});
/** Bot and staff-created recipes members can see now, with staff edits and hides applied (Cook suggestions index these). */
export async function editorialRecipes() {
  const [snapshot, staff] = await Promise.all([readSnapshot(root), staffContent()]);
  return [...Object.values(snapshot.records).filter(r => r.kind === 'recipe').map(r => staffRecord(staff, 'recipe', r.id, r.data)), ...staffCreated(staff, 'recipe')]
    .filter(r => r && !r.withdrawal);
}
/** Whether a bundled, bot or staff-created recipe is published and not hidden or withdrawn (likes and shares use this). */
export async function publishedRecipe(id) {
  const [snapshot, staff] = await Promise.all([readSnapshot(root), staffContent()]), item = staff.items.get('recipe:' + id);
  if (item?.hidden) return false;
  const row = snapshot.records['recipe:' + id];
  if (row || item?.origin === 'staff') { const recipe = staffRecord(staff, 'recipe', id, row?.data ?? null); return !!recipe && !recipe.withdrawal; }
  return baseline.recipes.some(recipe => recipe.id === id);
}
export const editorialAssetRoot = path.join(root, 'assets');
export const editorialAssets = express.Router();
editorialAssets.use((req, res, next) => {
  if (!/^\/[a-f0-9]{64}\.jpg$/.test(req.path)) return res.sendStatus(404);
  res.set({ 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Content-Type-Options': 'nosniff' }); next();
}, express.static(editorialAssetRoot, { maxAge: '1y', immutable: true, index: false, fallthrough: false }), (_e, _req, res, _next) => res.sendStatus(404));
editorial.use('/assets', editorialAssets);
