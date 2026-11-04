import { FOOD_POLICY_VERSION, foodFindings } from './food-policy.mjs';
import { foodSource, foodStamp,applyFoodVisibility } from './food-sources.mjs';

export async function foodReviewEnabled(db) {
  const row=(await db.query("SELECT enabled,notice FROM ops.control WHERE key='chef_food_checks'")).rows[0];
  return Boolean(row?.enabled && /(^|\s)mode=on(\s|$)/.test(row.notice ?? ''));
}
/** Enqueue inside the content transaction; no member identifier, contact details or private chat is accepted here. */
export async function enqueueFoodReview(db, kind, target, payload, photos = []) {
  if (!await foodReviewEnabled(db)) return null;
  const fingerprint = foodStamp({ data: payload.data, photos,edition:payload.edition });
  const row = (await db.query(`INSERT INTO ops.food_review(kind,target,fingerprint,policy_version,payload,photos)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(kind,target,fingerprint,policy_version) WHERE state<>'superseded' DO UPDATE SET target=excluded.target RETURNING id,state`,
  [kind, String(target), fingerprint, FOOD_POLICY_VERSION, JSON.stringify(payload), JSON.stringify(photos.map(p=>({slot:p.slot,digest:p.digest})))])).rows[0];
  await db.query("UPDATE ops.food_review SET state='superseded',token=NULL,lease_until=NULL,updated_at=now() WHERE kind=$1 AND target=$2 AND (fingerprint<>$3 OR policy_version<>$5) AND payload->>'edition'=$4 AND state IN ('queued','working','asked')", [kind,String(target),fingerprint,payload.edition,FOOD_POLICY_VERSION]);
  for (const photo of photos) {
    if (!photo.bytes) continue;
    await db.query('INSERT INTO ops.food_review_photo(review_id,slot,digest,bytes) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [row.id,photo.slot,photo.digest,photo.bytes]);
  }
  return { ...row, fingerprint };
}

/** Withdrawal cancels pending work. A later publication request explicitly stages a fresh review. */
export async function cancelFoodReview(db,kind,target){
  await db.query("UPDATE ops.food_review SET state='superseded',token=NULL,lease_until=NULL,updated_at=now() WHERE kind=$1 AND target=$2 AND state<>'superseded'",[kind,String(target)]);
}

/** Save exact snapshots after the content/photos exist, in the same transaction as the member's write. */
export async function stageFoodReview(db, kind, target, edition = 'pending', hold = true) {
  if (!await foodReviewEnabled(db)) return null;
  const snapshot = await foodSource(db,kind,target,edition,true);
  if (!snapshot) throw Object.assign(new Error('Food submission is unavailable for review.'), { status:409 });
  if (snapshot.photos.reduce((n,p)=>n+p.bytes.length,0)>25_000_000) throw Object.assign(new Error('Use fewer or smaller food photos.'),{status:413});
  const row = await enqueueFoodReview(db,kind,target,{ data:snapshot.data,edition },snapshot.photos);
  if (!hold || row.state==='clear') return row;
  if(row.state==='held'){await applyFoodVisibility(db,snapshot,'held');return row;}
  const reason = 'QT food review pending';
  if (kind==='listing') await db.query("UPDATE market.listing SET status='draft',removed_reason=$2 WHERE id=$1 AND status IN ('active','draft')",[target,reason]);
  const tables = { class:'social.class', gathering:'social.gathering', 'cooked-photo':'community.cooked_photo', ...(kind==='recipe'&&edition==='live'?{recipe:'recipes.recipe'}:{}) };
  if (tables[kind]) await db.query(`UPDATE ${tables[kind]} SET hidden_at=now(),hidden_reason=$2 WHERE id=$1 AND (hidden_at IS NULL OR hidden_reason IN ($2,'QT food review held'))`,[target,reason]);
  return row;
}

export function assertMeatFree(fields) {
  const findings = foodFindings(fields);
  if (findings.length) throw Object.assign(new Error(findings[0].message), { status: 422, findings });
}
