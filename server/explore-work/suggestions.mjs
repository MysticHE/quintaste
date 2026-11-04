import { CommunityError, text } from '../community/http.mjs';
import { listedPlaces } from '../catalogue-places.mjs';
import { nameTokens, placeUnit, samePlace } from '../../admin/src/lib/place-identity.mjs';
import { requirePlaceDatesNotFuture, validatePlace } from '../editorial/validation.mjs';
import { attachPhotos, capacity, digest, event, reference, wake } from './core.mjs';
import { publicSource } from './reports.mjs';
import { checkContact, checkHours, checkSources } from './corrections.mjs';
import { COVER_CONSENT } from '../../admin/src/lib/member-cover.mjs';

/**
 * A member's suggestion of a vegetarian place Explore does not list yet (owner, 4 Nov 2026). It is a lead, never a listing:
 * Coco screens it, Pandan researches the exact outlet and drafts a listing, Kaya checks that exact listing, and the app
 * publishes it as a QT Explorer place only while the Place reports lane is On; otherwise staff decide in Place suggestions.
 * Several members suggesting the same place share one job, each keeping their own receipt.
 */
const inSingapore = p => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && p.latitude >= 1.16 && p.latitude <= 1.48 && p.longitude >= 103.6 && p.longitude <= 104.1;

/** "01-23", "#1-23" and "# 01 - 23" all become "#01-23"; an empty unit stays empty. */
export function unitText(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  const unit = placeUnit('#' + value.replace(/^#\s*/, ''));
  if (!unit || value.length > 20) throw new CommunityError(400, 'Write the unit like #01-23.');
  const [floor, number] = unit.split('-');
  return '#' + floor.replace(/^(B?)(\d)$/, '$10$2') + '-' + number.padStart(2, '0');
}
export function suggestionInput(body) {
  const name = text(body.name, 200, { min: 2, field: 'The name' }), address = text(body.address, 300, { min: 5, field: 'The address' });
  const postalCode = String(body.postalCode ?? '');
  if (!/^\d{6}$/.test(postalCode)) throw new CommunityError(400, 'Choose the address from the list.');
  const point = body.point && { latitude: Number(body.point.latitude), longitude: Number(body.point.longitude) };
  if (!inSingapore(point)) throw new CommunityError(400, 'Choose an address in Singapore.');
  if (!['veg', 'mixed'].includes(body.kitchen)) throw new CommunityError(400, 'Choose what the place serves.');
  const sourceUrl = text(body.sourceUrl ?? '', 1000);
  if (sourceUrl && !publicSource(sourceUrl)) throw new CommunityError(400, 'Use a public HTTPS link.');
  return { name, address, unit: unitText(body.unit), postalCode, point, kitchen: body.kitchen, dishes: text(body.dishes ?? '', 1000),
    details: text(body.details ?? '', 1000), sourceUrl, worksHere: body.worksHere === true, coverConsent: body.coverConsent === true };
}
/** The suggestion as a place for samePlace: the unit belongs in the address. */
export const identityOf = place => ({ name: place.name, address: [place.address, place.unit].filter(Boolean).join(' '), postalCode: place.postalCode });
/** Listed places that are the same listing as `place` (live, hidden, closed or removed by the owner), same unit first. Pass `listed`
 * to check several identities against one read of the catalogue. */
export async function placeMatches(place, listed = null) {
  const identity = identityOf(place);
  return (listed ?? await listedPlaces()).flatMap(p => { const why = samePlace(identity, p); return why ? [{ ...p, why }] : []; })
    .sort((a, b) => (a.why === 'same unit' ? 0 : 1) - (b.why === 'same unit' ? 0 : 1));
}
/** One job per place: the postal code and the unit, or else the name. A name of only generic words ("Vegetarian Food Stall")
 * keeps its full letters, so two different stalls without units do not share a job. */
export function suggestionKey(place) {
  const words = nameTokens(place.name).join(' ') || String(place.name).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return digest({ suggest: place.postalCode, at: placeUnit(identityOf(place).address) ?? words });
}

export async function queueSuggestion(db, { user, key, input, photos, count }) {
  await capacity(db);
  // The member agreed their own photo may be the cover: that photo's digest, never another member's.
  const issue = suggestionKey(input), entry = { ...input, coverPhoto: input.coverConsent && photos[0] ? photos[0].digest : null,
    ...(input.coverConsent && photos[0] ? { coverConsentVersion: COVER_CONSENT, coverConsentAt: new Date().toISOString() } : {}) };
  delete entry.point;
  await db.query('SELECT pg_advisory_xact_lock(1902915,hashtext($1))', ['explore-issue:' + issue]);
  let w = (await db.query("SELECT * FROM ops.explore_work WHERE issue_key=$1 AND state IN ('queued','working','needs-input','staff') FOR UPDATE", [issue])).rows[0];
  if (w) {
    const suggestions = w.payload.suggestions ?? [];
    if (suggestions.length >= 20) throw new CommunityError(503, 'This place has enough suggestions queued. Please try again after its check.');
    const existing = (await db.query('SELECT count(*)::int n FROM ops.explore_photo WHERE work_id=$1', [w.id])).rows[0].n;
    if (existing + photos.length > 60) throw new CommunityError(503, 'This place has enough photos queued. Please try again after its check.');
    // Only a job still at Coco (or waiting on its member) starts again; research, review and staff decisions already under way
    // keep going, with the new member's words beside them for staff and Kaya.
    await count();
    // Kaya checks every photo, so a photo added during its short check would be refused: that stage starts again too. During
    // Pandan's long research a joiner is added without a restart, and Kaya then screens their words and photo with the rest.
    const restart = w.stage === 'coco' || w.stage === 'kaya' || w.state === 'needs-input';
    w = (await db.query(`UPDATE ops.explore_work SET payload=jsonb_set(payload,'{suggestions}',$2),updated_at=now()${restart ? ",revision=revision+1,state='queued',stage='coco',token=NULL,lease_until=NULL,attempts=0,due_at=now()" : ''}
      WHERE id=$1 RETURNING *`, [w.id, JSON.stringify([...suggestions, entry])])).rows[0];
    await attachPhotos(db, w.id, photos, user, existing);
  } else {
    await count();
    const place = { name: input.name, address: input.address, unit: input.unit, postalCode: input.postalCode, point: input.point, kitchen: input.kitchen };
    w = (await db.query(`INSERT INTO ops.explore_work(kind,target,issue_key,payload) VALUES('suggestion',$1,$2,$3) RETURNING *`,
      ['suggest-' + input.postalCode, issue, { place, suggestions: [entry] }])).rows[0];
    await attachPhotos(db, w.id, photos, user);
  }
  await db.query('INSERT INTO ops.explore_submission(user_id,submission_key,input_hash,work_id,details,works_here) VALUES($1,$2,$3,$4,$5,$6)',
    [user, key, digest(input), w.id, input.details, input.worksHere]);
  await event(db, w, 'received'); await wake(db);
  return { reference: reference(w.id), id: w.id, state: w.state };
}

const captured = check => typeof check?.captureHash === 'string' && /^[a-f0-9]{64}$/.test(check.captureHash);
/** A Google record the bridge tied to an actual fetch of that page (its cache entry, hash and date): CHECKED when the page was
 * read, ACCESS_LIMITED when the attempt was blocked or challenged. The model's own word is never enough. */
const google = (check, maps) => {
  let url;
  try { url = new URL(check?.url); } catch { return false; }
  const host = url.hostname.replace(/^www\./, '');
  return ['CHECKED', 'ACCESS_LIMITED'].includes(check.status) && captured(check) && url.protocol === 'https:' && /^\d{4}-\d{2}-\d{2}/.test(check.checkedAt ?? '') && (check.note ?? '').length <= 300
    && (maps ? host === 'maps.google.com' || host === 'maps.app.goo.gl' || (host === 'google.com' && url.pathname.startsWith('/maps')) : host === 'google.com' && url.pathname === '/search');
};
const day = iso => iso.slice(0, 10);
const singaporeToday = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const slug = value => String(value).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/**
 * The QT Explorer place a Kaya-approved suggestion publishes (vk- whole vegetarian kitchen, vo- Mixed Kitchen), checked by the
 * publisher's own validator now, so a listing Kaya approves never fails at publication. Its map point is the member's chosen
 * address, so a different postal code leaves it for staff. Returns the listing and its source captures, or why staff must decide.
 */
function editorialListing(draft, point) {
  const { place, dishes, dietProof, hours, sources } = draft;
  if (!point) return { why: 'The map point needs staff: the address Pandan found has another postal code.' };
  // Owner's rule: a merchant or official current source, or one dated 2025 or later, places this exact outlet at its address.
  const unit = placeUnit(place.address);
  // The bridge grounds these labels in the fetched pages (merchant: the website the Maps listing shows; official: a .gov.sg host;
  // a date only when the page shows it); an ungrounded label never makes a listing publishable.
  const current = sources.some(s => s.grounded === true && (['merchant', 'official'].includes(s.kind) || (/^\d{4}-\d{2}-\d{2}$/.test(s.sourceDate ?? '') && s.sourceDate >= '2025-01-01'))
    && (s.quote.includes(place.postalCode) || (!!unit && placeUnit(s.quote) === unit)));
  if (!current) return { why: 'Staff decide: no merchant, official or 2025+ source places this outlet at its address.' };
  const vk = place.kitchen === 'veg', name = slug(place.name + ' ' + (place.branch || place.postalCode)).slice(0, 100) || 'place-' + place.postalCode;
  const counts = new Map();
  for (const d of dishes) counts.set(d.sourceUrl, (counts.get(d.sourceUrl) ?? 0) + 1);
  const menuSource = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? dietProof?.sourceUrl, at = url => day(sources.find(s => s.url === url).checkedAt);
  const items = dishes.map((d, i) => ({ id: (slug(d.name).slice(0, 70) || 'dish') + '-' + (i + 1), name: d.name.slice(0, 120),
    price: d.price.amount === null ? { amount: null, currency: 'unknown', type: 'displayed' } : { amount: d.price.amount, currency: 'SGD', type: 'displayed' }, ...(d.diet ? { diet: d.diet } : {}) }));
  const listing = { id: (vk ? 'vk-' : 'vo-') + name, ...(vk ? {} : { kitchen: 'options' }), name: place.name.slice(0, 120), branch: place.branch.slice(0, 120), address: place.address.slice(0, 300),
    postalCode: place.postalCode, point, googlePlaceId: null, venueDiet: place.venueDiet, alliumFreeClaim: false, ...(hours ? { hours } : {}),
    sourceUrls: [...new Set(sources.map(s => s.url))].slice(0, 12), checkedAt: singaporeToday(),
    ...(vk ? { dietProof: { sourceUrl: dietProof.sourceUrl, quote: dietProof.quote, checkedAt: dietProof.checkedAt } } : {}),
    menu: { sourceUrl: menuSource, sourceLabel: 'Merchant menu', checkedAt: at(menuSource), items } };
  try { validatePlace(listing); requirePlaceDatesNotFuture(listing); }
  catch (error) { return { why: 'Staff decide: ' + (error instanceof Error ? error.message : 'the listing does not meet the publication rules') + '.' }; }
  return { listing, editorialSources: sources.map(s => ({ url: s.url, checkedAt: day(s.checkedAt), fetchedAt: s.checkedAt, contentSha256: s.captureHash, evidence: s.quote.slice(0, 1200) })) };
}
/**
 * Pandan's answer for a suggestion, checked before Kaya or staff see it. Every outcome except "staff" carries both required
 * Google records (Search and Maps), tied to the pages actually fetched. A proposed listing names the exact outlet, has dishes
 * with captured sources (two merchant-labelled ones for a Mixed Kitchen, quoted whole-kitchen evidence for a Veg Kitchen) and is
 * not a place Explore already lists; a match turns it into a possible duplicate. Dates come from the captures, not the model.
 */
export function suggestionDraft(p, known, suggested) {
  if (!p || !['propose', 'duplicate', 'not-eligible', 'staff'].includes(p.decision)) throw new CommunityError(400, 'Invalid suggestion decision.');
  const reason = typeof p.reason === 'string' ? p.reason.trim().slice(0, 600) : '';
  if (p.decision === 'staff') return { decision: 'staff', reason: reason || 'Pandan could not confirm this place.' };
  if (!google(p.checks?.googleSearch, false) || !google(p.checks?.googleMaps, true)) throw new CommunityError(400, 'Record the Google Search and Google Maps checks.');
  const checks = { googleSearch: p.checks.googleSearch, googleMaps: p.checks.googleMaps };
  if (p.decision === 'duplicate') {
    const match = known.find(k => k.id === p.placeId);
    if (!match) throw new CommunityError(400, 'Name a listed place.');
    return { decision: 'duplicate', placeId: p.placeId, placeState: match.state, reason, checks };
  }
  if (p.decision === 'not-eligible') {
    if (reason.length < 5) throw new CommunityError(400, 'Explain why the place cannot be listed.');
    return { decision: 'not-eligible', reason, checks };
  }
  const sources = checkSources(p.sources), urls = new Set(sources.map(s => s.url)), q = p.place ?? {};
  const sourceDay = url => day(sources.find(s => s.url === url).checkedAt);
  const field = (value, max, label) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new CommunityError(400, 'Check the ' + label + '.');
    return value.trim();
  };
  const place = { name: field(q.name, 120, 'name'), branch: typeof q.branch === 'string' ? q.branch.trim().slice(0, 120) : '', address: field(q.address, 300, 'address'),
    postalCode: field(q.postalCode, 6, 'postal code'), kitchen: q.kitchen === 'mixed' ? 'mixed' : q.kitchen === 'veg' ? 'veg' : null,
    venueDiet: q.venueDiet === 'Vegan' ? 'Vegan' : 'Vegetarian', alliumFreeClaim: q.alliumFreeClaim === true };
  if (!/^\d{6}$/.test(place.postalCode) || !place.kitchen) throw new CommunityError(400, 'Check the postal code and kitchen.');
  if (place.kitchen === 'mixed' && place.alliumFreeClaim) throw new CommunityError(400, 'A Mixed Kitchen place cannot claim allium-free food.');
  if (!Array.isArray(p.dishes) || !p.dishes.length || p.dishes.length > 80) throw new CommunityError(400, 'List the dishes the sources show.');
  const dishes = p.dishes.map(d => {
    const amount = d?.price?.amount === null || d?.price?.amount === undefined ? null : Number(d.price.amount);
    if (amount !== null && !(Number.isFinite(amount) && amount >= 0 && amount <= 10000)) throw new CommunityError(400, 'Check the dish prices.');
    if (!urls.has(d?.sourceUrl)) throw new CommunityError(400, 'Every dish needs a captured source.');
    // A price in an unknown currency stays unknown: never published as SGD.
    const sgd = amount !== null && d.price.currency === 'SGD';
    return { name: field(d.name, 120, 'dish name'), price: { amount: sgd ? amount : null, currency: sgd ? 'SGD' : 'unknown' },
      diet: d.diet === 'V' || d.diet === 'VG' ? d.diet : null, sourceUrl: d.sourceUrl };
  });
  if (place.kitchen === 'mixed' && dishes.filter(d => d.diet).length < 2) throw new CommunityError(400, 'A Mixed Kitchen needs two dishes the merchant labels vegetarian or vegan.');
  if (place.kitchen === 'mixed' && dishes.some(d => !d.diet)) throw new CommunityError(400, 'List only the labelled vegetarian or vegan dishes.');
  let dietProof = null;
  if (place.kitchen === 'veg') {
    const proof = p.dietProof, source = sources.find(s => s.url === proof?.sourceUrl);
    if (!source || typeof proof.quote !== 'string' || proof.quote.length < 8 || proof.quote.length > 200 || !source.quote.includes(proof.quote))
      throw new CommunityError(400, 'A Veg Kitchen needs quoted evidence (up to 200 characters) that the whole kitchen is meat-free.');
    dietProof = { sourceUrl: proof.sourceUrl, quote: proof.quote, checkedAt: sourceDay(proof.sourceUrl) };
  }
  // Hours and phone carry their capture's date, and the hours fit every reader (admin, editorial and app limits).
  let hours = null, contact = null;
  if (p.hours) {
    const h = checkHours(p.hours);
    if (!urls.has(h.sourceUrl) || h.summary.length > 120 || h.schedule.some(line => line.length > 220) || h.notes.length > 500) throw new CommunityError(400, 'Keep the hours short and from a captured source.');
    hours = { summary: h.summary, schedule: h.schedule, notes: h.notes, sourceUrl: h.sourceUrl, checkedAt: sourceDay(h.sourceUrl), timezone: 'Asia/Singapore' };
  }
  if (p.contact) {
    const c = checkContact(p.contact);
    if (!urls.has(c.sourceUrl)) throw new CommunityError(400, 'The phone needs a captured source.');
    contact = { ...c, checkedAt: sourceDay(c.sourceUrl) };
  }
  const same = known.filter(k => samePlace(identityOf(place), k));
  const draft = { decision: same.length ? 'duplicate' : 'propose', ...(same.length ? { placeId: same[0].id, placeState: same[0].state } : {}), reason, checks, place, dishes, dietProof, hours, contact, sources };
  if (same.length) return draft;
  // The map point is the member's chosen address, so it only belongs to a listing at the same postal code.
  const published = editorialListing(draft, place.postalCode === suggested?.postalCode ? suggested.point ?? null : null);
  return { ...draft, ...published };
}
