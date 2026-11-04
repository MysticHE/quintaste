import 'server-only';
import { query, transaction } from './db';
import { audit } from './audit';
import { authorize, lockPermission, type Session } from './session';
import { choice, HttpError, integer, text, uuid } from './http';
import { listedPlaces } from './content-catalogue';
import { samePlace } from './place-identity';
import { placeWorkspaceAction } from './place-workspace';
import { queueAlert } from './push-alerts';
import { consentedCovers, coverImage, coverPhoto } from './member-cover.mjs';

/**
 * Places members suggested (server/explore-work/suggestions.mjs), after Coco's screening and Pandan's research. Phase 1:
 * staff decide every one. Approving creates a staff place with the existing workspace rules (duplicate refusal, Mixed Kitchen
 * labels, a source), then the app worker confirms it is live before telling the member. Members' names never show here.
 */
type Suggested = { name: string; address: string; unit?: string; postalCode: string; point?: { latitude: number; longitude: number } | null; kitchen: 'veg' | 'mixed' };
type Entry = Suggested & { dishes: string; details: string; sourceUrl: string; worksHere: boolean };
/** The parts of Pandan's checked draft (server/explore-work/suggestions.mjs) a new listing keeps. */
type Draft = { decision?: string; place?: Suggested; sources?: { url: string }[]; dietProof?: Record<string, unknown> | null; hours?: Record<string, unknown> | null; listing?: { id: string };
  editorialSources?: { fetchedAt: string }[] };
type Work = { revision: number; state: string; payload: { place: Suggested; suggestions?: { coverPhoto?: string | null }[]; known?: { id: string; name: string; branch: string; address: string; state: string; why: string }[] };
  result: { pandan?: Draft; kaya?: { decision: string; reason: string }; outcome?: { kind: string; placeId?: string } } };

export async function suggestionList(member: Session, view: string) {
  authorize(member, 'content');
  const all = choice(view || 'waiting', ['waiting', 'all'] as const, 'view') === 'all';
  return (await query(`SELECT w.id,w.revision,w.state,w.stage,w.message,w.created_at,w.updated_at,w.payload->'place' AS place,
      w.result->'pandan'->>'decision' AS draft,w.result->'outcome'->>'kind' AS outcome,
      (SELECT count(DISTINCT s.user_id) FROM ops.explore_submission s WHERE s.work_id=w.id)::int AS members
    FROM ops.explore_work w WHERE w.kind='suggestion' AND ($1 OR w.state IN ('queued','working','staff','needs-input'))
    ORDER BY w.state='staff' DESC,w.created_at LIMIT 100`, [all])).rows;
}
export async function suggestionDetail(member: Session, raw: string) {
  authorize(member, 'content');
  const id = uuid(raw, 'suggestion');
  const w = (await query(`SELECT id,revision,state,stage,message,payload,result,created_at,updated_at FROM ops.explore_work WHERE id=$1 AND kind='suggestion'`, [id])).rows[0];
  if (!w) throw new HttpError(404, 'Suggestion not found.');
  // Each photo with whether its member agreed it may be the cover (only those can be chosen).
  const covers = consentedCovers(w.payload);
  const photos = (await query('SELECT id,digest FROM ops.explore_photo WHERE work_id=$1 ORDER BY position', [id])).rows.map(p => ({ id: p.id as string, cover: covers.has(p.digest) ? p.digest as string : null }));
  // The same check the server ran for Pandan, now against staff's current view, for the member's place and Pandan's draft.
  const draft = w.result?.pandan?.place, wanted = [w.payload.place as Suggested, ...((w.payload.suggestions ?? []) as Entry[]), ...(draft ? [draft] : [])];
  const matches = (await listedPlaces()).flatMap(p => {
    const why = wanted.map(s => samePlace({ name: s.name, address: [s.address, s.unit].filter(Boolean).join(' '), postalCode: s.postalCode ?? w.payload.place.postalCode }, p)).find(Boolean);
    return why ? [{ ...p, why }] : [];
  });
  // Places the owner removed are only in the app's own list, which Pandan received with the job.
  for (const k of (w.payload.known ?? []) as NonNullable<Work['payload']['known']>) if (!matches.some(m => m.id === k.id)) matches.push({ ...k, postalCode: w.payload.place.postalCode, state: k.state as 'live', why: k.why as 'same name' });
  return { ...w, suggestions: w.payload.suggestions as Entry[], photos, matches: matches.slice(0, 10), app: process.env.CUSTOMER_APP_URL ?? null };
}
export async function suggestionPhoto(member: Session, workId: string, photoId: string) {
  authorize(member, 'content');
  const row = (await query(`SELECT p.bytes FROM ops.explore_photo p JOIN ops.explore_work w ON w.id=p.work_id WHERE p.id=$1 AND w.id=$2 AND w.kind='suggestion'`,
    [uuid(photoId, 'photo'), uuid(workId, 'suggestion')])).rows[0];
  if (!row) throw new HttpError(404, 'Photo unavailable.');
  return row.bytes as Buffer;
}

const record = (value: unknown, name: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Check ' + name + '.');
  return value as Record<string, unknown>;
};
/** The listing staff approve, from the form (Pandan's draft, as staff edited it), in the workspace's create input. */
/** A photo its member agreed may be the cover, stored as a content photo (resized only) with the member credit. */
async function staffCover(w: { id: string; payload: Work['payload'] }, digest: string, member: Session) {
  if (!consentedCovers(w.payload).has(digest)) throw new HttpError(400, 'Only a photo its member agreed may be the cover can be used.');
  const row = (await query<{ bytes: Buffer }>('SELECT bytes FROM ops.explore_photo WHERE work_id=$1 AND digest=$2 LIMIT 1', [w.id, digest])).rows[0];
  const image = row && await coverImage(row.bytes);
  if (!image) throw new HttpError(400, 'This photo is too small to be a cover.');
  const site = process.env.CUSTOMER_APP_URL;
  if (!site) throw new HttpError(503, 'The app address is not set, so the cover cannot be credited.');
  // Stored and audited like a photo uploaded in Places (content.photo.upload), so the cover has a trail even if adding the place fails.
  await transaction(async db => {
    await lockPermission(db, member, 'content');
    await db.query('INSERT INTO content.asset(sha256,bytes,width,height,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [image.sha256, image.bytes, image.width, image.height, member.id]);
    await audit(db, member.id, 'content.photo.upload', 'asset:' + image.sha256, 'Member cover for place suggestion ' + w.id, { bytes: image.bytes.length, suggestion: w.id, photoDigest: digest });
  });
  return coverPhoto(image, new URL('/', site).href, new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10));
}
function createInput(input: Record<string, unknown>, w: { payload: { place: Suggested }; result: { pandan?: Draft } }, photo?: Record<string, unknown>) {
  const place = record(input.place, 'the place'), draft: Draft = w.result.pandan ?? {};
  const dishes = Array.isArray(input.dishes) ? input.dishes.map(d => record(d, 'a dish')) : [];
  if (!dishes.length) throw new HttpError(400, 'Add at least one dish.');
  const postalCode = text(place.postalCode, 'postal code', 6, 6), sourceUrl = text(place.sourceUrl, 'place source', 1000);
  // The map point is the member's chosen address; a different postal code means it is another building.
  const point = postalCode === w.payload.place.postalCode ? w.payload.place.point ?? null : null;
  const sources = (draft.sources ?? []).map(s => s.url);
  return {
    action: 'create-workspace', version: 0, menuVersion: 0, allowDuplicate: input.allowDuplicate === true,
    fields: { name: place.name, branch: place.branch ?? '', address: place.address, postalCode, aliases: '', point,
      kitchen: place.kitchen === 'mixed' ? 'options' : null, venueDiet: place.venueDiet, alliumFreeClaim: place.alliumFreeClaim === true, menuTotal: null, sourceUrl,
      research: { sourceUrls: [...new Set([sourceUrl, ...sources])].slice(0, 30), checkedAt: new Date().toISOString().slice(0, 10) },
      ...(draft.dietProof && place.kitchen !== 'mixed' ? { dietProof: draft.dietProof } : {}), ...(draft.hours ? { hours: draft.hours } : {}), ...(photo ? { photo } : {}) },
    dishes: dishes.map((d, i) => ({ kind: 'new', key: 'suggested-' + i, item: { name: d.name, price: { amount: d.amount === '' || d.amount == null ? null : Number(d.amount), currency: 'SGD' },
      ...(d.diet === 'V' || d.diet === 'VG' ? { diet: d.diet } : {}) } })),
  };
}
async function members(db: Parameters<Parameters<typeof transaction>[0]>[0], id: string) {
  return (await db.query('SELECT DISTINCT user_id FROM ops.explore_submission WHERE work_id=$1', [id])).rows.map(r => r.user_id as string);
}
export async function decideSuggestion(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'content');
  const id = uuid(input.id, 'suggestion'), revision = integer(input.revision, 'revision', 1);
  const act = choice(input.action, ['approve', 'publish', 'duplicate', 'ask', 'decline', 'recheck'] as const, 'decision');
  const waiting = act === 'recheck' ? ['staff', 'needs-input', 'resolved'] : ['staff', 'needs-input'];
  const current = (await query<Work>(`SELECT * FROM ops.explore_work WHERE id=$1 AND kind='suggestion'`, [id])).rows[0];
  if (!current || current.revision !== revision || !waiting.includes(current.state)) throw new HttpError(409, 'This suggestion changed. Refresh before deciding.');
  // An added place whose live check failed is not added again: Check again repeats the live check.
  const added = current.result.outcome?.kind === 'added';
  if (added && act !== 'recheck') throw new HttpError(409, 'This place was already added. Use Check again to confirm it is live.');
  // Publish is the listing exactly as Kaya approved it (a QT Explorer place), for the Watch lane; staff edits use Add to Explore.
  if (act === 'publish' && !(current.result.pandan?.decision === 'propose' && current.result.pandan.listing && current.result.kaya?.decision === 'approve'))
    throw new HttpError(409, 'Only a listing Kaya approved can be published as checked. Use Add to Explore.');
  // Published research must be recent: older captures are checked again first (the store refuses captures over 35 days old).
  const oldest = Math.min(...(current.result.pandan?.editorialSources ?? []).map(s => Date.parse(s.fetchedAt)));
  if (act === 'publish' && !(Date.now() - oldest < 28 * 86400000)) throw new HttpError(409, 'This research is over four weeks old. Use Check again before publishing.');
  // Approval writes the place first (its own audited transaction and duplicate check); the job then moves only if it is unchanged.
  const cover = act === 'approve' && typeof input.cover === 'string' && input.cover ? await staffCover({ ...current, id }, input.cover, member) : undefined;
  const placeId = act === 'approve' ? (await placeWorkspaceAction(member, createInput(input, current, cover), reason)).id
    : act === 'duplicate' ? text(input.placeId, 'listed place', 120) : null;
  // A duplicate may be a place staff hid or the owner removed (only in the app's list Pandan received); members get no link to those.
  const match = act === 'duplicate' ? [...(await listedPlaces()), ...(current.payload.known ?? [])].find(p => p.id === placeId) : undefined;
  if (act === 'duplicate' && !match) throw new HttpError(400, 'Choose a place Explore lists.');
  const message = act === 'ask' || act === 'decline' ? text(input.message, 'message to the member', 600, 5) : '';
  return transaction(async db => {
    await lockPermission(db, member, 'content');
    const w = (await db.query(`SELECT * FROM ops.explore_work WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!w || w.revision !== revision || !waiting.includes(w.state))
      throw new HttpError(409, placeId && act === 'approve' ? `The place was created (${placeId}) but this suggestion changed. Refresh and mark it as a duplicate of that place.` : 'This suggestion changed. Refresh before deciding.');
    const outcome = act === 'approve' ? { kind: 'added', placeId, by: member.id } : act === 'duplicate' ? { kind: 'duplicate', placeId, live: match?.state === 'live', by: member.id } : act === 'decline' ? { kind: 'declined', by: member.id } : undefined;
    const result = { ...w.result, ...(outcome ? { outcome } : {}), ...(act === 'publish' ? { kaya: { ...w.result.kaya, staff: member.id } } : {}) };
    const [stage, state, note] = act === 'approve' || (act === 'recheck' && added) ? ['verify', 'queued', 'Being added to Explore.'] : act === 'publish' ? ['publish', 'queued', 'Being added to Explore.']
      : act === 'recheck' ? ['coco', 'queued', ''] : act === 'ask' ? ['done', 'needs-input', message] : act === 'duplicate' ? ['done', 'resolved', 'This place is already on QuinTaste.'] : ['done', 'resolved', message];
    if (act === 'recheck' && !added) delete result.outcome;
    // The app re-reads staff places every 10 seconds; its live check of a new place starts after that.
    await db.query(`UPDATE ops.explore_work SET stage=$2,state=$3,result=$4,message=$5,attempts=0,token=NULL,lease_until=NULL,due_at=now()+make_interval(secs=>$6),updated_at=now() WHERE id=$1`,
      [id, stage, state, result, note, act === 'approve' ? 11 : 0]);
    await audit(db, member.id, 'explore.suggestion.' + act, 'explore:work:' + id, reason, { revision, ...(placeId ? { placeId } : {}) });
    if (act === 'ask' || act === 'duplicate' || act === 'decline')
      for (const to of await members(db, id)) await queueAlert(db, to, act === 'ask' ? 'exploreSuggestionNeedsInfo' : 'exploreSuggestionClosed', '/explore-contributions/' + id);
    return { saved: true, ...(placeId ? { placeId } : {}) };
  });
}
/** Suggestions waiting for staff, for the Overview's attention count. */
export const waitingSuggestions = async () => (await query(`SELECT count(*)::int AS n FROM ops.explore_work WHERE kind='suggestion' AND state='staff'`)).rows[0].n as number;
