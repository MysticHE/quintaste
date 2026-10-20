import { pool, logger } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { CommunityError, communityRouter, errors, member, throttle, transaction, uuid } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { encodePhoto } from '../market/rules.mjs';
import { like, visibleListings, visibleShop } from '../market/shop.mjs';
import { categories, draftKey, publicId, readRecipe, rowId } from './rules.mjs';
import { animal, containsFor, labelsFor } from '../diet-labels.mjs';

/**
 * Member recipes. Browsing and recipe pages are readable by guests; submitting needs a signed-in member.
 * Nothing a member submits is public until staff publish it in the admin console.
 */
export const recipes = communityRouter({ guests: true, bodyLimit: '64kb', photoLimit: '2mb',
  photos: req => req.method === 'PUT' && /^\/mine\/[^/]+$/.test(req.path) });
const live = `mr.live IS NOT NULL AND mr.hidden_at IS NULL AND ${notRestricted('mr.author_id')}`;
const photoPath = (id, slot, digest) => `/api/recipes/photos/${id}/${slot}?v=${digest.slice(0, 12)}`;
const day = at => new Date(at).toISOString().slice(0, 10);
const coverColumn = `(SELECT digest FROM recipes.photo p WHERE p.recipe_id=mr.id AND p.version='live' AND p.slot='cover') AS cover`;
function summary(row) {
  const r = row.live;
  return { id: publicId(row.id), name: r.title, description: r.description, minutes: r.minutes, servings: r.servings, categories: r.categories,
    diet: r.diet, author: r.author, language: r.language, sponsorship: r.sponsorship, revision: row.live_revision, updatedAt: day(row.published_at),
    // Diet labels come from the ingredients (server/diet-labels.mjs); recipes saved before 20 Oct 2026 are read here.
    ...(r.nutrition ? { nutrition: r.nutrition } : {}), ...(r.source ? { source: r.source } : {}), contains: Array.isArray(r.contains) ? r.contains : containsFor(r.ingredients),
    image: row.cover ? photoPath(row.id, 'cover', row.cover) : null, ingredientNames: r.ingredients.map(i => i.name) };
}

recipes.get('/', async (req, res) => {
  const viewer = res.locals.user?.id ?? null, q = req.query, params = [], where = [live];
  const add = value => { params.push(value); return '$' + params.length; };
  if (viewer) where.push(notBlocked('mr.author_id', add(viewer)));
  if (typeof q.q === 'string' && q.q.trim()) {
    where.push(`(mr.live->>'title' || ' ' || coalesce((SELECT string_agg(i->>'name', ' ') FROM jsonb_array_elements(mr.live->'ingredients') i), '')) ILIKE ${add(like(q.q))}`);
  }
  if (categories.includes(q.category)) where.push(`mr.live->'categories' ? ${add(q.category)}`);
  const offset = Math.min(Math.max(Number(q.cursor) || 0, 0), 2000);
  const rows = (await pool.query(`SELECT mr.id, mr.live, mr.live_revision, mr.published_at, ${coverColumn} FROM recipes.recipe mr
    WHERE ${where.join(' AND ')} ORDER BY mr.published_at DESC, mr.id LIMIT 21 OFFSET ${add(offset)}`, params)).rows;
  res.json({ items: rows.slice(0, 20).map(summary), next: rows.length > 20 ? offset + 20 : null });
});

/** The author's own recipes and where each one stands; the app shows this beside the matching draft. */
recipes.get('/mine', member, async (_req, res) => {
  const rows = (await pool.query(`SELECT mr.id, mr.draft_key AS "draftKey", mr.live IS NOT NULL AS live, mr.live_revision AS "liveRevision",
      mr.pending_state AS state, mr.pending_revision AS "pendingRevision", mr.decision_note AS note, mr.hidden_at IS NOT NULL AS hidden
    FROM recipes.recipe mr WHERE mr.author_id=$1 ORDER BY mr.updated_at DESC`, [res.locals.user.id])).rows;
  res.json({ items: rows.map(({ id, ...row }) => ({ ...row, id: publicId(id) })) });
});

/** Linked items must be the author's own, saved (on sale or paused), and free of dairy, egg and honey when the recipe is Vegan. */
async function checkLinks(db, me, recipe) {
  const ids = recipe.ingredients.map(i => i.listingId).filter(Boolean);
  if (!ids.length) return;
  const rows = (await db.query(`SELECT id, name, contains, may_contain, status FROM market.listing WHERE id = ANY($1::uuid[]) AND seller_id=$2`, [ids, me])).rows;
  const vegan = labelsFor(recipe.contains).includes('Vegan');
  for (const ingredient of recipe.ingredients.filter(i => i.listingId)) {
    const item = rows.find(row => row.id === ingredient.listingId);
    if (!item || !['active', 'paused'].includes(item.status)) throw new CommunityError(400, `The shop item linked to “${ingredient.name}” is no longer in your shop. Remove the link.`);
    if (vegan && [...item.contains, ...item.may_contain].some(tag => animal.includes(tag))) throw new CommunityError(400, `“${item.name}” has dairy, egg or honey, so it can't be linked to a vegan recipe.`);
  }
}
async function readPhotos(body, steps) {
  const cover = body?.photos?.cover;
  if (typeof cover !== 'string') throw new CommunityError(400, 'Add a recipe photo.');
  const options = { edge: 1280, quality: 76, max: 500000, inputMax: 320000 };
  const photos = [{ slot: 'cover', ...await encodePhoto(cover, options) }];
  for (let index = 0; index < steps; index++) {
    const step = body?.photos?.['step-' + index];
    if (typeof step === 'string') photos.push({ slot: 'step-' + index, ...await encodePhoto(step, options) });
  }
  return photos;
}
/** Submits a recipe, or an update to one, for staff review. A published version stays live until staff publish the update. */
recipes.put('/mine/:key', member, async (req, res) => {
  const me = res.locals.user.id, key = draftKey(req.params.key), recipe = readRecipe(req.body?.recipe);
  await throttle('recipe-submit:' + me, 20, 86400, 'You can submit 20 recipes a day. Try again tomorrow.');
  const photos = await readPhotos(req.body, recipe.steps.length);
  const id = await transaction(async db => {
    const count = (await db.query('SELECT count(*)::int AS n FROM recipes.recipe WHERE author_id=$1 AND draft_key<>$2', [me, key])).rows[0].n;
    if (count >= 40) throw new CommunityError(409, 'You have 40 shared recipes. Remove one from Cook first.');
    await checkLinks(db, me, recipe);
    // A version in review is never replaced in place, so staff always publish exactly what they opened.
    const current = (await db.query('SELECT pending_state, pending_revision FROM recipes.recipe WHERE author_id=$1 AND draft_key=$2 FOR UPDATE', [me, key])).rows[0];
    if (current?.pending_state === 'review' && current.pending_revision === recipe.revision) throw new CommunityError(409, 'This version is already in review.');
    const row = (await db.query(`INSERT INTO recipes.recipe(author_id, draft_key, pending, pending_revision, pending_state, submitted_at)
      VALUES($1,$2,$3,$4,'review',now())
      ON CONFLICT (author_id, draft_key) DO UPDATE SET pending=$3, pending_revision=$4, pending_state='review', decision_note='', submitted_at=now(), updated_at=now()
      RETURNING id`, [me, key, JSON.stringify(recipe), recipe.revision])).rows[0];
    await db.query("DELETE FROM recipes.photo WHERE recipe_id=$1 AND version='pending'", [row.id]);
    for (const photo of photos) {
      await db.query("INSERT INTO recipes.photo(recipe_id, version, slot, bytes, digest) VALUES($1,'pending',$2,$3,$4)", [row.id, photo.slot, photo.bytes, photo.digest]);
    }
    return row.id;
  }, 'recipe:' + me);
  logger.info({ event: 'member_recipe_submitted' });
  res.json({ id: publicId(id), state: 'review' });
});
/** Removes the recipes shared from several drafts (`?keys=a,b`), for example before a device collection is cleared. */
recipes.delete('/mine', member, async (req, res) => {
  const keys = typeof req.query.keys === 'string' ? req.query.keys.split(',').slice(0, 40).map(draftKey) : [];
  if (!keys.length) throw new CommunityError(400, 'Choose the recipes to remove.');
  const removed = (await pool.query('DELETE FROM recipes.recipe WHERE author_id=$1 AND draft_key = ANY($2::text[])', [res.locals.user.id, keys])).rowCount;
  res.json({ removed });
});
/** Removes the recipe from Cook and withdraws any submission. The device draft is untouched. */
recipes.delete('/mine/:key', member, async (req, res) => {
  const removed = (await pool.query('DELETE FROM recipes.recipe WHERE author_id=$1 AND draft_key=$2', [res.locals.user.id, draftKey(req.params.key)])).rowCount;
  res.json({ removed: removed > 0 });
});

recipes.get('/photos/:id/:slot', async (req, res) => {
  if (!uuid(req.params.id) || !/^(cover|step-[0-9]{1,2})$/.test(req.params.slot)) throw new CommunityError(404, 'Photo unavailable.');
  const row = (await pool.query(`SELECT p.bytes FROM recipes.photo p JOIN recipes.recipe mr ON mr.id=p.recipe_id
    WHERE p.recipe_id=$1 AND p.version='live' AND p.slot=$2 AND ${live}`, [req.params.id, req.params.slot])).rows[0];
  if (!row) throw new CommunityError(404, 'Photo unavailable.');
  // Private and short: a hidden recipe's photo must not outlive it in shared caches.
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300', 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Content-Type-Options': 'nosniff' }).send(row.bytes);
});

/** A published recipe. Linked ingredients carry a shop label only while the viewer can open and buy that item. */
recipes.get('/:id', async (req, res) => {
  const viewer = res.locals.user?.id ?? null, id = rowId(req.params.id);
  const row = (await pool.query(`SELECT mr.id, mr.author_id, mr.live, mr.live_revision, mr.published_at, ${coverColumn},
      (SELECT json_object_agg(p.slot, p.digest) FROM recipes.photo p WHERE p.recipe_id=mr.id AND p.version='live') AS photos
    FROM recipes.recipe mr WHERE mr.id=$1 AND ${live} ${viewer ? `AND ${notBlocked('mr.author_id', '$2')}` : ''}`, viewer ? [id, viewer] : [id])).rows[0];
  if (!row) throw new CommunityError(404, 'This recipe is unavailable.');
  // Wanted recipes have no author, so a guest (no viewer) must not match an empty author.
  const r = row.live, own = !!viewer && viewer === row.author_id;
  const [market, linked, author] = await Promise.all([allowed('market'), visibleListings(r.ingredients.map(i => i.listingId).filter(Boolean), row.author_id, viewer), visibleShop(row.author_id)]);
  const [items, shop] = market ? [linked, author] : [new Map(), null];
  const photos = row.photos ?? {};
  res.json({ ...summary(row), own, shop,
    ingredients: r.ingredients.map(({ listingId, ...i }) => {
      const item = listingId && items.get(listingId);
      return { ...i, ...(item ? { shop: { listingId: item.id, name: item.name, priceCents: item.priceCents } } : {}) };
    }),
    steps: r.steps.map((step, index) => ({ ...step, photo: photos['step-' + index] ? photoPath(row.id, 'step-' + index, photos['step-' + index]) : null })) });
});
recipes.use(errors);
