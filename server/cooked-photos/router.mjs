import { pool } from '../config.mjs';
import { communityRouter, CommunityError, errors, member, requireId, text, throttle } from '../community/http.mjs';
import { fileReport, notBlocked, notRestricted } from '../community/router.mjs';
import { memberPhoto } from '../place-reviews/photos.mjs';
import { liveRecipeId } from '../reactions/router.mjs';

/**
 * "I cooked this" photos on Cook recipes (/api/cooked-photos): one photo per member per recipe with an optional note, shown
 * at once under the same rules as place reviews (restricted and blocked members drop out), reported to the staff case queue,
 * hidden or restored by staff in the admin console (Content › Cooked photos). Anyone can look; posting needs a signed-in member.
 */
const reasons = ['Spam', 'Not this recipe', 'Offensive content', 'Not their photo', 'Other'];
export const cookedPhotos = communityRouter({ guests: true, bodyLimit: '16kb', photoLimit: '1500kb', photos: req => req.method === 'PUT' && /^\/[^/]+\/me$/.test(req.path) });
const photoPath = (recipe, row) => `/api/cooked-photos/${recipe}/photos/${row.id}?v=${row.digest.slice(0, 12)}`;
const fields = `cp.id,cp.recipe_id,cp.digest,cp.note,cp.updated_at AS "updatedAt",left(coalesce(nullif(u.name,''),'Member'),50) AS name`;
const shape = row => ({ id: row.id, name: row.name, note: row.note, updatedAt: row.updatedAt, photo: photoPath(row.recipe_id, row) });

// Reading takes any well-formed recipe id (a recipe staff later hid simply shows its old photos to nobody new); writing checks it is live.
cookedPhotos.param('recipeId', (_req, res, next, raw) => {
  if (typeof raw !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(raw) || raw.startsWith('private-')) return next(new CommunityError(404, 'This recipe is unavailable.'));
  res.locals.recipe = raw; next();
});
cookedPhotos.get('/:recipeId', async (_req, res) => {
  const recipe = res.locals.recipe, viewer = res.locals.user?.id ?? null;
  const visible = `cp.recipe_id=$1 AND cp.hidden_at IS NULL AND ${notRestricted('cp.user_id')} AND ${notBlocked('cp.user_id', '$2')}`;
  // One pass: the newest visible photos with the visible total; the viewer's own photo (even a hidden one) comes separately.
  const [visibleRows, mine] = await Promise.all([
    pool.query(`SELECT ${fields}, cp.user_id IS NOT DISTINCT FROM $2 AS own, count(*) OVER ()::int AS total
      FROM community.cooked_photo cp JOIN public."user" u ON u.id=cp.user_id WHERE ${visible} ORDER BY cp.updated_at DESC, cp.id LIMIT 13`, [recipe, viewer]),
    viewer ? pool.query(`SELECT ${fields}, cp.hidden_at IS NOT NULL AS hidden FROM community.cooked_photo cp JOIN public."user" u ON u.id=cp.user_id
      WHERE cp.recipe_id=$1 AND cp.user_id=$2`, [recipe, viewer]) : { rows: [] },
  ]);
  const own = mine.rows[0], rows = visibleRows.rows;
  res.json({ recipeId: recipe, count: rows[0]?.total ?? 0, mine: own ? { ...shape(own), hidden: own.hidden } : null,
    items: rows.filter(row => !row.own).slice(0, 12).map(shape) });
});
cookedPhotos.put('/:recipeId/me', member, async (req, res) => {
  const recipe = await liveRecipeId(res.locals.recipe), me = res.locals.user.id;
  const note = text(req.body?.note ?? '', 280, { field: 'Note' });
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note)) throw new CommunityError(400, 'Remove unsupported characters from your note.');
  await throttle('cooked-photo-write:' + me, 20, 3600);
  const keep = req.body?.photo === 'keep';
  // Changing only the note keeps the stored photo; a new photo replaces it and moves it to the front. The row keeps its id, so open
  // reports stay attached, and a photo staff hid stays hidden: only staff restore it (its path changes with the digest).
  if (keep) {
    const result = await pool.query('UPDATE community.cooked_photo SET note=$3, updated_at=now() WHERE recipe_id=$1 AND user_id=$2', [recipe, me, note]);
    if (!result.rowCount) throw new CommunityError(400, 'Add a photo of what you cooked.');
  } else {
    const photo = await memberPhoto(req.body?.photo);
    await pool.query(`INSERT INTO community.cooked_photo(id,recipe_id,user_id,bytes,digest,note) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(recipe_id,user_id) DO UPDATE SET bytes=excluded.bytes,digest=excluded.digest,note=excluded.note,updated_at=now()`,
    [photo.id, recipe, me, photo.bytes, photo.digest, note]);
  }
  res.json({ saved: true });
});
cookedPhotos.delete('/:recipeId/me', member, async (_req, res) => {
  await throttle('cooked-photo-write:' + res.locals.user.id, 20, 3600);
  await pool.query('DELETE FROM community.cooked_photo WHERE recipe_id=$1 AND user_id=$2', [res.locals.recipe, res.locals.user.id]);
  res.json({ deleted: true });
});
cookedPhotos.get('/:recipeId/photos/:photoId', async (req, res) => {
  const viewer = res.locals.user?.id ?? null;
  const row = (await pool.query(`SELECT cp.bytes, cp.digest, cp.hidden_at IS NULL AS public FROM community.cooked_photo cp WHERE cp.id=$1 AND cp.recipe_id=$2
    AND (cp.hidden_at IS NULL OR cp.user_id=$3) AND ${notRestricted('cp.user_id')} AND ${notBlocked('cp.user_id', '$3')}`,
  [requireId(req.params.photoId), res.locals.recipe, viewer])).rows[0];
  if (!row) throw new CommunityError(404, 'Photo unavailable.');
  // The path carries the photo's digest (?v=), so a matching visible photo may be kept for an hour; a hidden one or an old digest never is.
  const current = row.public && typeof req.query.v === 'string' && row.digest.startsWith(req.query.v) && req.query.v.length === 12;
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': current ? 'private, max-age=3600' : 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'cross-origin' }).send(row.bytes);
});
cookedPhotos.post('/:recipeId/:photoId/report', member, async (req, res) => {
  const id = requireId(req.params.photoId), reason = req.body?.reason;
  if (!reasons.includes(reason)) throw new CommunityError(400, 'Choose a report reason.');
  const details = text(req.body?.details, 1000, { field: 'Details' }), me = res.locals.user.id;
  const row = (await pool.query(`SELECT cp.user_id,cp.note FROM community.cooked_photo cp WHERE cp.id=$1 AND cp.recipe_id=$2 AND cp.hidden_at IS NULL
    AND ${notRestricted('cp.user_id')} AND ${notBlocked('cp.user_id', '$3')}`, [id, res.locals.recipe, me])).rows[0];
  if (!row) throw new CommunityError(404, 'Photo unavailable.');
  if (row.user_id === me) throw new CommunityError(400, 'You can change or delete your own photo.');
  const reference = await fileReport(me, { subject: 'recipe:cooked:' + id, title: 'Cooked photo report · ' + reason,
    description: `Recipe: ${res.locals.recipe}\nPhoto: ${id}\nAuthor account: ${row.user_id}\nNote: ${row.note}\n\nReason: ${reason}\n${details}` });
  res.status(201).json({ reference });
});
cookedPhotos.use(errors);
