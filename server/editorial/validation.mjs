import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const categories = ['Breakfast', 'Noodles', 'Rice meals', 'With rice', 'Soups', 'Snacks & kueh', 'Desserts & drinks'];
const exclusions = ['Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida', 'Eggs', 'Dairy', 'Honey', 'Peanuts', 'Tree nuts', 'Gluten', 'Mushrooms', 'Root vegetables'];
export function requireValue(test, message) { if (!test) throw Object.assign(new Error(message), { status: 422 }); }
const text = (v, max, empty = false) => typeof v === 'string' && (empty || v.trim().length > 0) && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const keys = (o, allowed) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every(k => allowed.includes(k));
export const validId = v => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{2,150}$/.test(v);
export const validHash = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
export function publicUrl(v) {
  try { const u = new URL(v); return text(v, 600) && u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) && !/^(localhost|.*\.(local|internal))$/.test(u.hostname); } catch { return false; }
}
const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v && Date.parse(v) <= Date.now() + 86400000;
/** A branch photo the owner approved in Telegram travels with its enhanced asset (signed by the publisher). */
export function ownerReference(p) {
  const ref = p?.reference, photo = ref?.photo;
  const valid = keys(ref, ['venueId', 'sha256', 'rightsApprovalId', 'approvedBy', 'approvedAt', 'photo']) && /^owner-telegram-[a-f0-9]{24}$/.test(ref.rightsApprovalId)
    && ref.rightsApprovalId === p.rightsApprovalId && ref.venueId === p.venueId && ref.sha256 === p.referenceSha256 && validHash(ref.sha256)
    && ref.approvedBy === 'telegram-owner' && date(ref.approvedAt)
    && keys(photo, ['author', 'sourceUrl', 'license', 'licenseUrl', 'capturedAt']) && text(photo.author, 180) && publicUrl(photo.sourceUrl)
    && text(photo.license, 80) && (photo.licenseUrl === null || publicUrl(photo.licenseUrl)) && (photo.capturedAt === null || date(photo.capturedAt));
  return valid ? { status: 'approved', venueId: ref.venueId, sha256: ref.sha256, rightsApprovalId: ref.rightsApprovalId, photo } : null;
}
export function validateSources(sources) {
  requireValue(Array.isArray(sources) && sources.length > 0 && sources.length <= 12, 'Source evidence is required');
  for (const s of sources) requireValue(keys(s, ['url', 'checkedAt', 'fetchedAt', 'contentSha256', 'evidence']) && publicUrl(s.url) && date(s.checkedAt) && Number.isFinite(Date.parse(s.fetchedAt)) && Date.parse(s.fetchedAt) <= Date.now() + 60000 && Date.now() - Date.parse(s.fetchedAt) < 35 * 86400000 && validHash(s.contentSha256) && text(s.evidence, 1200), 'Missing or stale source capture');
}
export function validateRecipe(r) {
  requireValue(keys(r, ['id', 'name', 'description', 'minutes', 'servings', 'cuisine', 'dietary', 'categories', 'onePot', 'ingredients', 'steps', 'author', 'language', 'revision', 'updatedAt', 'adaptationNote', 'image', 'provenance', 'withdrawal', 'sourceRating', 'nutrition']) && validId(r.id) && text(r.name, 160) && text(r.description, 700, true) && text(r.cuisine, 80) && text(r.author, 160) && text(r.language, 40) && date(r.updatedAt), 'Invalid recipe identity');
  const rating = r.sourceRating;
  requireValue(rating === undefined || keys(rating, ['value', 'count', 'site', 'url', 'checkedAt']) && typeof rating.value === 'number' && rating.value >= 0 && rating.value <= 5
    && Number.isInteger(rating.count) && rating.count >= 1 && rating.count <= 10000000 && text(rating.site, 80) && publicUrl(rating.url) && date(rating.checkedAt), 'Invalid source rating');
  const n = r.nutrition, figures = n?.perServing, bounded = (v, max) => v === undefined || typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  requireValue(n === undefined || keys(n, ['basis', 'site', 'coverage', 'checkedAt', 'perServing']) && ['source', 'estimate'].includes(n.basis) && date(n.checkedAt)
    && (n.basis === 'source' ? text(n.site, 80) : typeof n.coverage === 'number' && n.coverage >= 0.9 && n.coverage <= 1)
    && keys(figures, ['kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium']) && typeof figures.kcal === 'number' && figures.kcal > 0 && figures.kcal <= 3000
    && ['protein', 'fat', 'carbs', 'fibre', 'sugar'].every(k => bounded(figures[k], 3000)) && bounded(figures.sodium, 20000), 'Invalid recipe nutrition');
  requireValue(Number.isInteger(r.servings) && r.servings >= 1 && r.servings <= 8 && Number.isInteger(r.minutes) && r.minutes >= 1 && r.minutes <= 180 && Number.isInteger(r.revision) && r.revision > 0 && (r.onePot === undefined || typeof r.onePot === 'boolean'), 'Invalid recipe quantities');
  requireValue(Array.isArray(r.categories) && r.categories.length >= 1 && r.categories.length <= 2 && r.categories.every(c => categories.includes(c)), 'Invalid recipe category');
  requireValue(keys(r.dietary, ['diet', 'contains', 'ingredientsKnown', 'evidence']) && ['Vegetarian', 'Vegan'].includes(r.dietary.diet) && r.dietary.ingredientsKnown === true && Array.isArray(r.dietary.contains) && r.dietary.contains.every(x => exclusions.includes(x)), 'Unverified recipe diet');
  requireValue(keys(r.dietary.evidence, ['source', 'kind', 'checkedAt']) && r.dietary.evidence.kind === 'editorial' && text(r.dietary.evidence.source, 300) && date(r.dietary.evidence.checkedAt), 'Invalid diet evidence');
  requireValue(Array.isArray(r.ingredients) && r.ingredients.length >= 1 && r.ingredients.length <= 30 && Array.isArray(r.steps) && r.steps.length >= 1 && r.steps.length <= 20, 'Invalid recipe size');
  const ids = new Set();
  for (const i of r.ingredients) {
    requireValue(keys(i, ['id', 'name', 'amount', 'unit']) && validId(i.id) && !ids.has(i.id) && text(i.name, 160) && text(i.unit, 40, true) && (i.amount === null || typeof i.amount === 'number' && Number.isFinite(i.amount) && i.amount > 0 && i.amount <= 10000), 'Invalid ingredient'); ids.add(i.id);
  }
  const names = r.ingredients.map(i => i.name.toLowerCase()).join(' ');
  requireValue(!/\b(chicken|pork|beef|lard|shrimp|prawn|fish sauce|oyster sauce|gelatin|gelatine)\b/.test(names), 'Ingredient requires vegetarian review');
  for (const [pattern, tag] of /** @type {[RegExp, string][]} */ ([[/\beggs?\b/, 'Eggs'], [/\b(milk|cream|butter|cheese)\b/, 'Dairy'], [/\bhoney\b/, 'Honey'], [/\bgarlic\b/, 'Garlic'], [/\bonions?\b/, 'Onion'], [/\bsoy sauce|\bwheat\b/, 'Gluten']])) {
    if (pattern.test(names)) requireValue(r.dietary.contains.includes(tag), 'Missing ingredient exclusion');
  }
  requireValue(r.dietary.diet !== 'Vegan' || !r.dietary.contains.some(x => ['Eggs', 'Dairy', 'Honey'].includes(x)), 'Conflicting vegan claim');
  requireValue(!/\b(dark soy|stock|bouillon|seasoning|curry paste|laksa paste|mock meat)\b/.test(names), 'Compound ingredient requires composition review');
  for (const s of r.steps) requireValue(keys(s, ['title', 'instruction', 'ingredientIds', 'timer']) && text(s.title, 120) && text(s.instruction, 1400) && Array.isArray(s.ingredientIds) && s.ingredientIds.length <= 30 && s.ingredientIds.every(id => ids.has(id)) && (!s.timer || keys(s.timer, ['label', 'seconds']) && text(s.timer.label, 80) && Number.isInteger(s.timer.seconds) && s.timer.seconds > 0 && s.timer.seconds <= 10800), 'Invalid recipe step');
  requireValue(keys(r.provenance, ['sources', 'checkedAt', 'kitchenTested', 'reviewedBy']) && r.provenance.kitchenTested === false && r.provenance.reviewedBy === 'QT Manager' && date(r.provenance.checkedAt) && Array.isArray(r.provenance.sources) && r.provenance.sources.length > 0 && r.provenance.sources.length <= 12 && r.provenance.sources.every(publicUrl), 'Recipe provenance required');
  if (r.adaptationNote !== undefined) requireValue(text(r.adaptationNote, 700), 'Invalid adaptation');
  if (r.withdrawal !== undefined) requireValue(text(r.withdrawal, 300), 'Invalid withdrawal');
  if (r.image) requireValue(keys(r.image, ['path', 'width', 'height', 'credit']) && /^\/api\/editorial\/assets\/[a-f0-9]{64}\.jpg$/.test(r.image.path) && Number.isInteger(r.image.width) && r.image.width >= 320 && r.image.width <= 1600 && Number.isInteger(r.image.height) && r.image.height >= 240 && r.image.height <= 1600 && text(r.image.credit, 180), 'Invalid recipe image');
}
export function validateEvent(e) {
  requireValue(keys(e, ['id', 'title', 'organiser', 'startsAt', 'endsAt', 'location', 'address', 'feeAmount', 'currency', 'feeNote', 'registrationUrl', 'registrationDeadline', 'dietEvidence', 'status', 'checkedAt', 'sources']) && validId(e.id) && text(e.title, 180) && text(e.organiser, 160) && text(e.location, 180) && text(e.address, 300) && text(e.dietEvidence, 600) && date(e.checkedAt), 'Invalid external event');
  requireValue(typeof e.startsAt === 'string' && /\+08:00$/.test(e.startsAt) && Date.parse(e.startsAt) > Date.now() && Date.parse(e.startsAt) < Date.now() + 366 * 86400000 && (e.endsAt === null || /\+08:00$/.test(e.endsAt) && Date.parse(e.endsAt) > Date.parse(e.startsAt)) && ['scheduled', 'cancelled', 'rescheduled'].includes(e.status), 'Invalid event date/status');
  requireValue((e.feeAmount === null && e.currency === null || typeof e.feeAmount === 'number' && e.feeAmount >= 0 && e.feeAmount < 10000 && e.currency === 'SGD') && text(e.feeNote, 300, true) && (e.registrationUrl === null || publicUrl(e.registrationUrl)) && (e.registrationDeadline === null || Number.isFinite(Date.parse(e.registrationDeadline)) && Date.parse(e.registrationDeadline) <= Date.parse(e.startsAt)) && Array.isArray(e.sources) && e.sources.length > 0 && e.sources.length <= 12 && e.sources.every(publicUrl), 'Invalid event source/price');
}
/** An owner-approved branch cover (enhanced from an exact-branch reference), shared by venue patches and places. */
function validateCoverPhoto(p) {
  requireValue(keys(p, ['path', 'width', 'height', 'author', 'sourceUrl', 'license', 'licenseUrl', 'capturedAt', 'checkedAt', 'changes']) && /^\/api\/catalogue-photos\/[a-f0-9]{64}\.jpg$/.test(p.path) && Number.isInteger(p.width) && p.width >= 320 && p.width <= 1600 && Number.isInteger(p.height) && p.height >= 240 && p.height <= 1600 && text(p.author, 180) && publicUrl(p.sourceUrl) && text(p.license, 80) && (p.licenseUrl === null || publicUrl(p.licenseUrl)) && (p.capturedAt === null || date(p.capturedAt)) && date(p.checkedAt) && text(p.changes, 300), 'Invalid approved branch cover');
}
function validateHours(h) {
  requireValue(keys(h, ['summary', 'schedule', 'notes', 'sourceUrl', 'checkedAt', 'timezone']) && text(h.summary, 120) && Array.isArray(h.schedule) && h.schedule.length >= 1 && h.schedule.length <= 8 && h.schedule.every(s => text(s, 220)) && text(h.notes, 500, true) && publicUrl(h.sourceUrl) && date(h.checkedAt) && h.timezone === 'Asia/Singapore', 'Invalid branch hours');
}
const placeFields = ['id', 'kitchen', 'name', 'branch', 'address', 'postalCode', 'point', 'googlePlaceId', 'venueDiet', 'alliumFreeClaim', 'hours', 'photo', 'sourceUrls', 'checkedAt', 'menu'];
const optionalPlaceFields = ['hours', 'photo'];
/** A complete Mixed Kitchen place created by QT Explorer: only its venue-labelled V/VG dishes are published. */
export function validatePlace(p) {
  requireValue(keys(p, placeFields) && placeFields.every(k => optionalPlaceFields.includes(k) || k in p) && typeof p.id === 'string' && /^vo-[a-z0-9][a-z0-9-]{2,110}$/.test(p.id) && p.kitchen === 'options'
    && text(p.name, 120) && text(p.branch, 120, true) && text(p.address, 300) && typeof p.postalCode === 'string' && /^\d{6}$/.test(p.postalCode) && date(p.checkedAt), 'Invalid veg options place');
  requireValue(keys(p.point, ['latitude', 'longitude']) && typeof p.point.latitude === 'number' && p.point.latitude >= 1.15 && p.point.latitude <= 1.48 && typeof p.point.longitude === 'number' && p.point.longitude >= 103.6 && p.point.longitude <= 104.1, 'Invalid Singapore coordinates');
  requireValue(p.googlePlaceId === null || typeof p.googlePlaceId === 'string' && /^[A-Za-z0-9_-]{10,200}$/.test(p.googlePlaceId), 'Invalid Google place ID');
  requireValue(Array.isArray(p.sourceUrls) && p.sourceUrls.length >= 1 && p.sourceUrls.length <= 12 && p.sourceUrls.every(publicUrl), 'Invalid venue sources');
  if (p.hours !== undefined) validateHours(p.hours);
  if (p.photo !== undefined) validateCoverPhoto(p.photo);
  const m = p.menu;
  requireValue(keys(m, ['sourceUrl', 'sourceLabel', 'checkedAt', 'items']) && publicUrl(m.sourceUrl) && text(m.sourceLabel, 80) && date(m.checkedAt) && Array.isArray(m.items) && m.items.length >= 2 && m.items.length <= 200, 'A veg options place needs 2 to 200 labelled dishes');
  const ids = new Set(), names = new Set();
  for (const i of m.items) {
    const price = i?.price;
    requireValue(keys(i, ['id', 'name', 'category', 'price', 'diet']) && typeof i.id === 'string' && /^[a-z0-9][a-z0-9-]{0,80}$/.test(i.id) && !ids.has(i.id) && text(i.name, 120) && !names.has(i.name.trim().toLowerCase())
      && (i.category === undefined || text(i.category, 40, true)), 'Invalid or repeated dish'); ids.add(i.id); names.add(i.name.trim().toLowerCase());
    requireValue(i.diet === 'V' || i.diet === 'VG', "Every dish of a veg options place needs the venue's V or VG label");
    requireValue(keys(price, ['amount', 'currency', 'type', 'maxAmount']) && typeof price.amount === 'number' && Number.isFinite(price.amount) && price.amount >= 0 && price.amount <= 10000 && price.currency === 'SGD' && ['displayed', 'from'].includes(price.type)
      && (price.maxAmount === undefined || typeof price.maxAmount === 'number' && Number.isFinite(price.maxAmount) && price.maxAmount >= price.amount && price.maxAmount <= 10000), 'Price requires an explicit SGD amount or supported range');
  }
  requireValue(['Vegetarian', 'Vegan'].includes(p.venueDiet) && (p.venueDiet !== 'Vegan' || m.items.every(i => i.diet === 'VG')), 'A veg options place is Vegan only when every dish is VG');
  requireValue(p.alliumFreeClaim === false, 'A veg options place cannot claim allium-free food');
}
export function validateVenue(v, base, menu) {
  requireValue(base && keys(v, ['id', 'hours', 'photo', 'sourceUrls', 'evidenceNotes', 'point', 'venueDiet', 'alliumFreeClaim', 'menuTotal', 'menuPrices', 'closed']) && v.id === base.id && Object.keys(v).length > 1, 'Unknown venue or unsupported field');
  // A stored page (often Google Maps) says the venue is permanently closed: it leaves Explore until the owner reverts it.
  if (v.closed) requireValue(keys(v.closed, ['status', 'sourceUrl', 'quote', 'checkedAt']) && v.closed.status === 'permanently-closed' && publicUrl(v.closed.sourceUrl) && text(v.closed.quote, 200) && /closed|结业|停业/i.test(v.closed.quote) && date(v.closed.checkedAt), 'Invalid venue closure');
  if (v.menuPrices) {
    requireValue(Array.isArray(v.menuPrices) && v.menuPrices.length > 0 && v.menuPrices.length <= 100 && menu, 'Invalid menu price patch');
    const seen = new Set();
    for (const update of v.menuPrices) {
      const section = menu.sections.find(s => s.id === update.sectionId), item = section?.items.find(i => i.id === update.itemId), p = update.price;
      requireValue(keys(update, ['sectionId', 'itemId', 'name', 'scope', 'sourceUrl', 'checkedAt', 'price']) && item && item.name === update.name && section.scope === update.scope && section.sourceUrl === update.sourceUrl && date(update.checkedAt) && !seen.has(update.sectionId + ':' + update.itemId), 'Price change must match the exact dish and sales-channel source');
      seen.add(update.sectionId + ':' + update.itemId);
      requireValue(keys(p, ['amount', 'maxAmount', 'currency', 'type']) && typeof p.amount === 'number' && Number.isFinite(p.amount) && p.amount >= 0 && p.amount <= 10000 && p.currency === 'SGD' && ['displayed', 'from'].includes(p.type) && (p.maxAmount === undefined || typeof p.maxAmount === 'number' && Number.isFinite(p.maxAmount) && p.maxAmount >= p.amount && p.maxAmount <= 10000), 'Price requires an explicit SGD amount or supported range');
    }
  }
  if (v.hours) validateHours(v.hours);
  if (v.point) requireValue(keys(v.point, ['latitude', 'longitude']) && typeof v.point.latitude === 'number' && v.point.latitude >= 1.13 && v.point.latitude <= 1.48 && typeof v.point.longitude === 'number' && v.point.longitude >= 103.59 && v.point.longitude <= 104.09, 'Invalid Singapore coordinates');
  if ('venueDiet' in v) requireValue(['Vegetarian', 'Vegan'].includes(v.venueDiet), 'Invalid venue diet');
  if ('alliumFreeClaim' in v) requireValue(typeof v.alliumFreeClaim === 'boolean', 'Invalid allium claim');
  if ('menuTotal' in v) requireValue(Number.isInteger(v.menuTotal) && v.menuTotal >= 1 && v.menuTotal <= 2000, 'Invalid full-menu dish count');
  // The kitchen type is never changed by a bot patch: fully vegetarian places are never downgraded automatically.
  requireValue(base.kitchen === undefined || base.kitchen === 'options', 'Invalid venue kitchen');
  if (base.kitchen === 'options') {
    const items = (menu?.sections ?? []).flatMap(s => s.items);
    requireValue(items.length > 0 && items.every(i => i.diet === 'V' || i.diet === 'VG'), "Every dish of a veg options place needs the venue's V or VG label");
    requireValue(v.alliumFreeClaim !== true, 'A veg options place cannot claim allium-free food');
    requireValue(v.venueDiet !== 'Vegan' || items.every(i => i.diet === 'VG'), 'A veg options place is Vegan only when every dish is VG');
  }
  if ('sourceUrls' in v) requireValue(Array.isArray(v.sourceUrls) && v.sourceUrls.length > 0 && v.sourceUrls.length <= 12 && v.sourceUrls.every(publicUrl), 'Invalid venue sources');
  if ('evidenceNotes' in v) requireValue(Array.isArray(v.evidenceNotes) && v.evidenceNotes.length <= 6 && v.evidenceNotes.every(s => text(s, 700)), 'Invalid evidence notes');
  if (v.photo) validateCoverPhoto(v.photo);
  requireValue(!Object.values(v).some(x => x === null), 'Cannot erase prior facts with missing data');
}
