import { Buffer } from 'node:buffer';
import { pool } from '../config.mjs';
import { operationsEnabled } from '../operations.mjs';
import { communityRouter, CommunityError, errors, member, requireId, text, throttle, transaction, uuid } from '../community/http.mjs';
import { fileReport, notBlocked, notRestricted } from '../community/router.mjs';
import { photoPath, reviewPhotos } from './photos.mjs';
import { catalogueVenues, placeAliases } from '../catalogue-places.mjs';

const catalogue = catalogueVenues, aliases = placeAliases;
const sorts = { newest: 'pr.created_at DESC,pr.id DESC', highest: 'pr.rating DESC,pr.created_at DESC,pr.id DESC', lowest: 'pr.rating ASC,pr.created_at DESC,pr.id DESC' };
const reasons = ['Spam', 'Not about this place', 'Offensive content', 'Conflict of interest', 'Other'];
const fields = `pr.id,pr.rating,pr.body,pr.created_at AS "createdAt",pr.updated_at AS "updatedAt",left(coalesce(nullif(u.name,''),'Member'),50) AS name,
  coalesce((SELECT json_agg('/api/place-reviews/'||pr.place_id||'/photos/'||p.id||'?v='||left(p.digest,12) ORDER BY p.position)
    FROM community.place_review_photo p WHERE p.review_id=pr.id),'[]') AS photos`;

// Only saving your own review carries photos.
export const placeReviews = communityRouter({ guests: true, bodyLimit: '64kb', photoLimit: '4250kb',
  photos: req => req.method === 'PUT' && /^\/[^/]+\/me$/.test(req.path) });
// One bounded aggregate query for the gallery; never one request per card.
placeReviews.get('/summaries', async (req, res) => {
  const ids = typeof req.query.ids === 'string' ? [...new Set(req.query.ids.split(','))] : [];
  if (!ids.length || ids.length > 160 || ids.some(id => !/^[a-z0-9][a-z0-9-]{2,119}$/.test(id) || !catalogue.some(v => v.id === (aliases.get(id) ?? id)))) throw new CommunityError(400, 'Choose published places.');
  const canonical = [...new Set(ids.map(id => aliases.get(id) ?? id))], viewer = res.locals.user?.id ?? null;
  const rows = (await pool.query(`SELECT pr.place_id AS id,count(*)::int AS count,round(avg(pr.rating),1)::float AS rating
    FROM community.place_review pr WHERE pr.place_id=ANY($1) AND ${notRestricted('pr.user_id')} AND ${notBlocked('pr.user_id', '$2')}
    AND NOT EXISTS(SELECT 1 FROM ops.content_decision d WHERE d.content_id=pr.place_id AND d.decision='withdrawn') GROUP BY pr.place_id`, [canonical, viewer])).rows;
  res.json({ items: ids.map(id => { const row = rows.find(r => r.id === (aliases.get(id) ?? id)); return { id, count: row?.count ?? 0, rating: row?.rating ?? null }; }) });
});
placeReviews.param('placeId', async (req, res, next, raw) => {
  try {
    if (!/^[a-z0-9][a-z0-9-]{2,119}$/.test(raw)) throw new CommunityError(404, 'Place unavailable.');
    const id = aliases.get(raw) ?? raw, venue = catalogue.find(v => v.id === id);
    if (!venue) throw new CommunityError(404, 'Place unavailable.');
    if (operationsEnabled && (await pool.query("SELECT 1 FROM ops.content_decision WHERE content_id=$1 AND decision='withdrawn' LIMIT 1", [id])).rowCount) throw new CommunityError(404, 'Place unavailable.');
    res.locals.place = venue; next();
  } catch (error) { next(error); }
});

placeReviews.get('/:placeId', async (req, res) => {
  const place = res.locals.place.id, viewer = res.locals.user?.id ?? null;
  const sort = req.query.sort ?? 'newest';
  if (typeof sort !== 'string' || !Object.hasOwn(sorts, sort)) throw new CommunityError(400, 'Choose a review order.');
  let cursor;
  if (req.query.cursor !== undefined) {
    try {
      if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 300 || !/^[A-Za-z0-9_-]+$/.test(req.query.cursor)) throw Error();
      cursor = JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString());
      if (cursor.sort !== sort || cursor.place !== place || !uuid(cursor.id) || !Number.isInteger(cursor.rating) || cursor.rating < 1 || cursor.rating > 5 || typeof cursor.at !== 'string' || !Number.isFinite(Date.parse(cursor.at))) throw Error();
    } catch { throw new CommunityError(400, 'Refresh the reviews.'); }
  }
  const visible = `pr.place_id=$1 AND ${notRestricted('pr.user_id')} AND ${notBlocked('pr.user_id', '$2')}`;
  const params = [place, viewer];
  let after = '';
  if (cursor) {
    params.push(cursor.at, cursor.id);
    if (sort !== 'newest') params.push(cursor.rating);
    const recent = '(pr.created_at,pr.id)<($3::timestamptz,$4::uuid)';
    after = sort === 'newest' ? ' AND ' + recent : ` AND (pr.rating${sort === 'highest' ? '<' : '>'}$5 OR (pr.rating=$5 AND ${recent}))`;
  }
  const [totals, mine, page] = await Promise.all([
    pool.query(`SELECT rating,count(*)::int AS count FROM community.place_review pr WHERE ${visible} GROUP BY rating`, [place, viewer]),
    viewer ? pool.query(`SELECT ${fields} FROM community.place_review pr JOIN public."user" u ON u.id=pr.user_id WHERE pr.place_id=$1 AND pr.user_id=$2`, [place, viewer]) : { rows: [] },
    pool.query(`SELECT ${fields} FROM community.place_review pr JOIN public."user" u ON u.id=pr.user_id WHERE ${visible} AND pr.user_id IS DISTINCT FROM $2${after} ORDER BY ${sorts[sort]} LIMIT 21`, params),
  ]);
  const distribution = [1, 2, 3, 4, 5].map(rating => totals.rows.find(pr => pr.rating === rating)?.count ?? 0);
  const count = distribution.reduce((a, b) => a + b, 0), items = page.rows.slice(0, 20), last = items.at(-1);
  const nextCursor = page.rows.length > 20 ? Buffer.from(JSON.stringify({ place, sort, id: last.id, rating: last.rating, at: last.createdAt.toISOString() })).toString('base64url') : null;
  res.json({ placeId: place, count, rating: count ? Math.round(distribution.reduce((sum, n, i) => sum + n * (i + 1), 0) / count * 10) / 10 : null,
    distribution, mine: mine.rows[0] ?? null, items, nextCursor });
});

placeReviews.put('/:placeId/me', member, async (req, res) => {
  const rating = req.body?.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new CommunityError(400, 'Choose 1 to 5 stars.');
  if (typeof req.body?.body !== 'string') throw new CommunityError(400, 'Enter a written review or leave it blank.');
  const body = text(req.body.body, 2000, { field: 'Review' });
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body)) throw new CommunityError(400, 'Remove unsupported characters from your review.');
  await throttle('place-review-write:' + res.locals.user.id, 20, 3600);
  const place = res.locals.place.id, me = res.locals.user.id, photos = await reviewPhotos(req.body?.photos, place);
  const id = await transaction(async db => {
    const result = await db.query(`INSERT INTO community.place_review(place_id,user_id,rating,body) VALUES($1,$2,$3,$4)
      ON CONFLICT(place_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,updated_at=now() RETURNING id`, [place, me, rating, body]);
    const review = result.rows[0].id;
    if (photos !== undefined) {
      const stored = (await db.query('SELECT id,bytes,digest FROM community.place_review_photo WHERE review_id=$1', [review])).rows;
      const next = photos.map(photo => {
        if (!photo.keep) return photo;
        const existing = stored.find(row => photoPath(place, row) === photo.keep);
        if (!existing) throw new CommunityError(400, 'A photo changed. Reopen your review and try again.');
        return existing;
      });
      if (new Set(next.map(p => p.id)).size !== next.length) throw new CommunityError(400, 'Remove duplicate photos.');
      await db.query('DELETE FROM community.place_review_photo WHERE review_id=$1', [review]);
      for (let position = 0; position < next.length; position++) {
        const photo = next[position];
        await db.query('INSERT INTO community.place_review_photo(id,review_id,position,bytes,digest) VALUES($1,$2,$3,$4,$5)', [photo.id, review, position, photo.bytes, photo.digest]);
      }
    }
    return review;
  }, 'place-review:' + place + ':' + me);
  res.json({ id });
});
placeReviews.get('/:placeId/photos/:photoId', async (req, res) => {
  const row = (await pool.query(`SELECT p.bytes FROM community.place_review_photo p JOIN community.place_review pr ON pr.id=p.review_id
    WHERE p.id=$1 AND pr.place_id=$2 AND ${notRestricted('pr.user_id')} AND ${notBlocked('pr.user_id', '$3')}`,
  [requireId(req.params.photoId), res.locals.place.id, res.locals.user?.id ?? null])).rows[0];
  if (!row) throw new CommunityError(404, 'Photo unavailable.');
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin' }).send(row.bytes);
});
placeReviews.delete('/:placeId/me', member, async (_req, res) => {
  await throttle('place-review-write:' + res.locals.user.id, 20, 3600);
  await pool.query('DELETE FROM community.place_review WHERE place_id=$1 AND user_id=$2', [res.locals.place.id, res.locals.user.id]);
  res.json({ deleted: true });
});
placeReviews.post('/:placeId/:reviewId/report', member, async (req, res) => {
  const id = requireId(req.params.reviewId), reason = req.body?.reason;
  if (!reasons.includes(reason)) throw new CommunityError(400, 'Choose a report reason.');
  const details = text(req.body?.details, 1000, { field: 'Details' });
  const row = (await pool.query(`SELECT pr.user_id,pr.rating,pr.body FROM community.place_review pr WHERE pr.id=$1 AND pr.place_id=$2 AND ${notRestricted('pr.user_id')} AND ${notBlocked('pr.user_id', '$3')}`, [id, res.locals.place.id, res.locals.user.id])).rows[0];
  if (!row) throw new CommunityError(404, 'Review unavailable.');
  if (row.user_id === res.locals.user.id) throw new CommunityError(400, 'You can edit or delete your own review.');
  const reference = await fileReport(res.locals.user.id, { subject: 'place:review:' + id,
    title: 'Place review report Â· ' + reason,
    description: `Place: ${res.locals.place.name} (${res.locals.place.id})\nReview: ${id}\nAuthor account: ${row.user_id}\nRating: ${row.rating}\nReview text: ${row.body}\n\nReason: ${reason}\n${details}` });
  res.status(201).json({ reference });
});
placeReviews.use(errors);

