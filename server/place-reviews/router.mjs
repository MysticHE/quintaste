import { Buffer } from 'node:buffer';
import { pool } from '../config.mjs';
import { communityRouter, CommunityError, errors, member, requireId, text, throttle, transaction, uuid } from '../community/http.mjs';
import { fileReport, notBlocked, notRestricted } from '../community/router.mjs';
import { photoPath, reviewPhotos } from './photos.mjs';
import { catalogueVenues, publishedPlaceIds } from '../catalogue-places.mjs';
import { digest, priorSubmission, queueReview, submissionKey } from '../explore-work/core.mjs';

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
  if (!ids.length || ids.length > 160) throw new CommunityError(400, 'Choose published places.');
  // Hidden or unknown places count zero, so one stale card never empties a whole page of ratings.
  const published = await publishedPlaceIds(ids), canonical = [...new Set(published.filter(Boolean))], viewer = res.locals.user?.id ?? null;
  const rows = (await pool.query(`SELECT pr.place_id AS id,count(*)::int AS count,round(avg(pr.rating),1)::float AS rating
    FROM community.place_review pr WHERE pr.place_id=ANY($1) AND pr.published AND pr.hidden_at IS NULL AND ${notRestricted('pr.user_id')} AND ${notBlocked('pr.user_id', '$2')}
    GROUP BY pr.place_id`, [canonical, viewer])).rows;
  res.json({ items: ids.map((id, i) => { const row = rows.find(r => r.id === published[i]); return { id, count: row?.count ?? 0, rating: row?.rating ?? null }; }) });
});
placeReviews.param('placeId', async (req, res, next, raw) => {
  try {
    const [id] = await publishedPlaceIds([raw]);
    if (!id) throw new CommunityError(404, 'Place unavailable.');
    res.locals.place = { id, name: catalogueVenues.find(v => v.id === id)?.name ?? id }; next();
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
  const visible = `pr.place_id=$1 AND pr.published AND pr.hidden_at IS NULL AND ${notRestricted('pr.user_id')} AND ${notBlocked('pr.user_id', '$2')}`;
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
    viewer ? pool.query(`SELECT ${fields} FROM community.place_review pr JOIN public."user" u ON u.id=pr.user_id WHERE pr.place_id=$1 AND pr.user_id=$2 AND pr.published`, [place, viewer]) : { rows: [] },
    pool.query(`SELECT ${fields} FROM community.place_review pr JOIN public."user" u ON u.id=pr.user_id WHERE ${visible} AND pr.user_id IS DISTINCT FROM $2${after} ORDER BY ${sorts[sort]} LIMIT 21`, params),
  ]);
  const distribution = [1, 2, 3, 4, 5].map(rating => totals.rows.find(pr => pr.rating === rating)?.count ?? 0);
  const count = distribution.reduce((a, b) => a + b, 0), items = page.rows.slice(0, 20), last = items.at(-1);
  const nextCursor = page.rows.length > 20 ? Buffer.from(JSON.stringify({ place, sort, id: last.id, rating: last.rating, at: last.createdAt.toISOString() })).toString('base64url') : null;
  let pending=null;
  if(viewer) {
    const w=(await pool.query(`SELECT w.*,r.id AS review FROM ops.explore_work w JOIN community.place_review r ON r.id=w.review_id
      WHERE r.place_id=$1 AND r.user_id=$2 AND w.kind='review' AND w.state NOT IN ('published','superseded','cancelled') ORDER BY w.created_at DESC LIMIT 1`,[place,viewer])).rows[0];
    if(w) pending={id:w.review,rating:w.payload.rating,body:w.payload.body,name:'',createdAt:w.created_at,updatedAt:w.updated_at,
      state:w.state,message:w.message,workId:w.id,photos:(await pool.query('SELECT id FROM ops.explore_photo WHERE work_id=$1 ORDER BY position',[w.id])).rows.map(p=>'/api/explore-work/'+w.id+'/photos/'+p.id)};
  }
  if(typeof req.query.reviewId==='string' && uuid(req.query.reviewId) && !items.some(r=>r.id===req.query.reviewId)) {
    const linked=(await pool.query(`SELECT ${fields} FROM community.place_review pr JOIN public."user" u ON u.id=pr.user_id WHERE ${visible} AND pr.id=$3`,[place,viewer,req.query.reviewId])).rows[0];
    if(linked && linked.id!==mine.rows[0]?.id) items.unshift(linked);
  }
  res.json({ placeId: place, count, rating: count ? Math.round(distribution.reduce((sum, n, i) => sum + n * (i + 1), 0) / count * 10) / 10 : null,
    distribution, mine: mine.rows[0] ?? null, pending, items, nextCursor });
});

placeReviews.put('/:placeId/me', member, async (req, res) => {
  const rating = req.body?.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new CommunityError(400, 'Choose 1 to 5 stars.');
  if (typeof req.body?.body !== 'string') throw new CommunityError(400, 'Enter a written review or leave it blank.');
  const body = text(req.body.body, 2000, { field: 'Review' });
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body)) throw new CommunityError(400, 'Remove unsupported characters from your review.');
  const place = res.locals.place.id, me = res.locals.user.id,key=submissionKey(req.body.submissionKey);
  const hash=digest({place,rating,body,photos:req.body.photos ?? null});
  const prior=await priorSubmission(pool,me,key,hash);
  if(prior) return res.status(202).json({id:(await pool.query('SELECT review_id FROM ops.explore_work WHERE id=$1',[prior.work_id])).rows[0].review_id,workId:prior.work_id,state:prior.state});
  await throttle('place-review-write:' + me, 20, 3600);
  // Pending photo links can be retained only by their original owner; they never become public before approval.
  const rawPhotos=req.body.photos;
  if(rawPhotos!==undefined && (!Array.isArray(rawPhotos)||rawPhotos.length>3)) throw new CommunityError(400,'Add up to 3 photos.');
  const privatePhotos=new Map();
  for(const uri of rawPhotos ?? []) {
    const match=typeof uri==='string' && uri.match(/^\/api\/explore-work\/([a-f0-9-]{36})\/photos\/([a-f0-9-]{36})$/);
    if(match) {
      const photo=(await pool.query(`SELECT p.* FROM ops.explore_photo p JOIN ops.explore_submission s ON s.work_id=p.work_id WHERE p.work_id=$1 AND p.id=$2 AND s.user_id=$3 LIMIT 1`,[match[1],match[2],me])).rows[0];
      if(!photo) throw new CommunityError(400,'That photo is unavailable.');
      privatePhotos.set(uri,photo);
    }
  }
  const photos=rawPhotos===undefined?undefined:await reviewPhotos(rawPhotos.filter(uri=>!privatePhotos.has(uri)),place);
  const receipt=await transaction(async db=>{
    const prior=await priorSubmission(db,me,key,hash);
    if(prior) return {id:(await db.query('SELECT review_id FROM ops.explore_work WHERE id=$1',[prior.work_id])).rows[0].review_id,workId:prior.work_id,state:prior.state};
    const review=(await db.query(`INSERT INTO community.place_review(place_id,user_id,rating,body,published) VALUES($1,$2,$3,'',false)
      ON CONFLICT(place_id,user_id) DO UPDATE SET user_id=excluded.user_id RETURNING id`,[place,me,rating])).rows[0].id;
    const stored=(await db.query('SELECT id,bytes,digest FROM community.place_review_photo WHERE review_id=$1 ORDER BY position',[review])).rows;
    let next=photos===undefined?stored:photos.map(p=>p.keep?stored.find(s=>photoPath(place,s)===p.keep):p);
    if(privatePhotos.size) {
      let i=0;
      next=rawPhotos.map(uri=>privatePhotos.get(uri) ?? next[i++]);
    }
    if(next.some(p=>!p)) throw new CommunityError(400,'A photo changed. Reopen your review.');
    const work=await queueReview(db,{user:me,review,target:place,rating,body,photos:next.map(({bytes,digest})=>({bytes,digest})),key,hash});
    return {id:review,workId:work.id,state:work.state};
  },'place-review:'+place+':'+me);
  res.status(202).json(receipt);
});
placeReviews.get('/:placeId/photos/:photoId', async (req, res) => {
  const row = (await pool.query(`SELECT p.bytes FROM community.place_review_photo p JOIN community.place_review pr ON pr.id=p.review_id
    WHERE p.id=$1 AND pr.place_id=$2 AND pr.published AND (pr.hidden_at IS NULL OR pr.user_id=$3) AND ${notRestricted('pr.user_id')} AND ${notBlocked('pr.user_id', '$3')}`,
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
  const row = (await pool.query(`SELECT pr.user_id,pr.rating,pr.body FROM community.place_review pr WHERE pr.id=$1 AND pr.place_id=$2 AND pr.published AND pr.hidden_at IS NULL AND ${notRestricted('pr.user_id')} AND ${notBlocked('pr.user_id', '$3')}`, [id, res.locals.place.id, res.locals.user.id])).rows[0];
  if (!row) throw new CommunityError(404, 'Review unavailable.');
  if (row.user_id === res.locals.user.id) throw new CommunityError(400, 'You can edit or delete your own review.');
  const receipt=await transaction(async db=>{
    const reference=await fileReport(res.locals.user.id,{subject:'place:review:'+id,title:'Place review report · '+reason,
      description:`Place: ${res.locals.place.name}\nReview: ${id}\nReason: ${reason}\n${details}`},db);
    const photos=(await db.query('SELECT * FROM community.place_review_photo WHERE review_id=$1 ORDER BY position',[id])).rows;
    const w=(await db.query(`INSERT INTO ops.explore_work(kind,target,review_id,payload) VALUES('review-report',$1,$2,$3) RETURNING *`,
      [res.locals.place.id,id,{rating:row.rating,body:row.body,photos:photos.map(p=>p.digest),reason}])).rows[0];
    await db.query('INSERT INTO ops.explore_submission(user_id,submission_key,input_hash,work_id,case_id,details) VALUES($1,$2,$3,$4,$5,$6)',[res.locals.user.id,submissionKey(undefined),digest({reason,details}),w.id,reference,details]);
    for(const p of photos) await db.query('INSERT INTO ops.explore_photo(id,work_id,owner_id,position,bytes,digest) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5)',[w.id,row.user_id,p.position,p.bytes,p.digest]);
    await db.query("SELECT pg_notify('qt_explore_work','ready')");
    return {reference,id:w.id};
  });
  res.status(201).json(receipt);
});
placeReviews.use(errors);

