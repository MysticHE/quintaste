/** Canonical food snapshots, shared with the app server. Only fixed queries and public/submitted food fields. */
import { createHash } from 'node:crypto';
import { recipeClarityNotes } from './food-clarity.mjs';
export const FOOD_KINDS = ['recipe', 'listing', 'class', 'gathering', 'cooked-photo', 'editorial-recipe', 'editorial-event'];
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const pick = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key] ?? null]));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' && !(value instanceof Date)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value;
export const foodStamp = snapshot => sha(JSON.stringify(canonical({ edition:snapshot.edition??'pending',data: snapshot.data, photos: snapshot.photos.map(p => ({ slot: p.slot, digest: p.digest })).sort((a,b)=>a.slot.localeCompare(b.slot)) })));
export function foodCandidate(kind,data,sources=[]){
  const fields=pick(data,kind==='recipe'
    ? ['name','description','dietary','ingredients','steps','nutrition']
    : ['title','organiser','dietEvidence','feeNote','registrationUrl','startsAt','endsAt','sources']);
  // These are upstream source captures, not new QT dietary certifications. They are part of the exact fingerprint.
  fields.sourceEvidence=(Array.isArray(sources)?sources:[]).slice(0,12)
    .map(source=>pick(source,['url','checkedAt','fetchedAt','contentSha256','evidence']));
  return fields;
}

export async function foodSource(db, kind, target, edition = 'pending', lock = false) {
  if (!FOOD_KINDS.includes(kind) || !uuid.test(String(target))) return null;
  const suffix = lock ? ' FOR UPDATE' : '';
  let row, data, photos = [];
  if (kind === 'recipe') {
    if (!['pending', 'live'].includes(edition)) return null;
    row = (await db.query('SELECT id,pending,pending_revision,pending_state,live,live_revision,private,hidden_at,hidden_reason FROM recipes.recipe WHERE id=$1' + suffix, [target])).rows[0];
    if (!row || row.private || !row[edition] || edition === 'pending' && row.pending_state !== 'review') return null;
    const recipe = row[edition];
    data = pick(recipe, ['title', 'description', 'ingredients', 'steps', 'contains', 'categories', 'servings', 'minutes']);
    data.legacyDiet = recipe.diet ?? null;
    data.foodRequirements = recipe.foodRequirements??null;
    data.sourceNotes = String(recipe.source?.notes??'').slice(0,500);
    data.clarityNotes = recipeClarityNotes(recipe);
    data.revision = row[edition + '_revision'];
    photos = (await db.query('SELECT slot,bytes,digest FROM recipes.photo WHERE recipe_id=$1 AND version=$2 ORDER BY slot', [target, edition])).rows;
  } else if (kind === 'listing') {
    row = (await db.query('SELECT *, (extract(epoch FROM updated_at)*1000000)::bigint::text AS food_revision FROM market.listing WHERE id=$1' + suffix, [target])).rows[0];
    if (!row || !['active','draft'].includes(row.status) || row.status === 'draft' && row.removed_reason !== 'QT food review pending') return null;
    data = pick(row, ['kind', 'name', 'description', 'ingredients', 'contains', 'may_contain', 'diets', 'storage', 'date_mark', 'lot', 'category', 'portion']);
    photos = (await db.query('SELECT slot,bytes,digest FROM market.photo WHERE listing_id=$1 ORDER BY slot', [target])).rows;
  } else if (kind === 'class') {
    row = (await db.query('SELECT *, (extract(epoch FROM updated_at)*1000000)::bigint::text AS food_revision FROM social.class WHERE id=$1' + suffix, [target])).rows[0];
    if (!row || row.status !== 'posted') return null;
    data = pick(row, ['title', 'makes', 'diets', 'starts', 'ends']);
  } else if (kind === 'gathering') {
    row = (await db.query('SELECT *, (extract(epoch FROM updated_at)*1000000)::bigint::text AS food_revision FROM social.gathering WHERE id=$1' + suffix, [target])).rows[0];
    if (!row || row.state === 'draft' || row.state === 'cancelled') return null;
    data = pick(row, ['title', 'food', 'diets', 'description']);
  } else if (kind === 'cooked-photo') {
    row = (await db.query('SELECT *, (extract(epoch FROM updated_at)*1000000)::bigint::text AS food_revision FROM community.cooked_photo WHERE id=$1' + suffix, [target])).rows[0];
    if (!row) return null;
    data = pick(row, ['recipe_id', 'note']);
    photos = [{ slot: 'photo', bytes: row.bytes, digest: row.digest }];
  } else {
    return null; // editorial snapshots are supplied by the signed publisher, never fetched from arbitrary URLs
  }
  // Revision intent prevents a late approval from reviving a withdrawn/resubmitted item.
  if(kind!=='recipe')data.submittedAt=row.food_revision;
  // Recipe authors and Market sellers are never part of a food-review payload.
  return { kind, target, edition, data, photos, visibility: kind === 'listing' ? row.status : row.hidden_at ? 'hidden' : 'visible',
    hiddenReason: row.hidden_reason ?? null };
}

export async function applyFoodVisibility(db, snapshot, verdict) {
  const { kind, target } = snapshot;
  const pendingReason = 'QT food review pending';
  if (kind === 'recipe' && snapshot.edition === 'pending') return; // Peach owns recipe publication
  if (kind === 'listing') {
    if (verdict === 'clear') {
      const result=await db.query("UPDATE market.listing SET status='active',removed_reason='' WHERE id=$1 AND status='draft' AND removed_reason=$2 AND EXISTS(SELECT 1 FROM market.seller s WHERE s.user_id=market.listing.seller_id AND s.status='active' AND s.declarations_version>=3) AND NOT EXISTS(SELECT 1 FROM ops.restriction r WHERE r.user_id=market.listing.seller_id AND r.active)", [target,pendingReason]);
      if(!(result.rowCount??result.affectedRows))await db.query("UPDATE market.listing SET removed_reason='' WHERE id=$1 AND status='draft' AND removed_reason=$2",[target,pendingReason]);
    } else {
      await db.query("UPDATE market.listing SET status='paused',removed_reason='QT food review held' WHERE id=$1 AND status IN ('active','draft') AND (status='active' OR removed_reason=$2)", [target,pendingReason]);
    }
    return;
  }
  const tables = { recipe: 'recipes.recipe', class: 'social.class', gathering: 'social.gathering', 'cooked-photo': 'community.cooked_photo' };
  const table = tables[kind];
  if (!table) return;
  if (verdict === 'clear') await db.query(`UPDATE ${table} SET hidden_at=NULL,hidden_reason=NULL WHERE id=$1 AND hidden_reason=$2`, [target,pendingReason]);
  else await db.query(`UPDATE ${table} SET hidden_at=now(),hidden_reason='QT food review held' WHERE id=$1 AND (hidden_at IS NULL OR hidden_reason=$2)`, [target,pendingReason]);
}
