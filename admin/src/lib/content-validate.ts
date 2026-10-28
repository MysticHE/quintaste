import 'server-only';
import { choice, HttpError, text } from './http';
import type { Hours, MenuItem, Photo, Price } from './content-base';

// Mirrors what the app accepts (src/utils/catalogue-page.ts, menu-catalogue.ts, services/editorial.ts), so a staff
// change can never make a member's screen reject a whole page.
export const categories = ['Breakfast', 'Noodles', 'Rice meals', 'With rice', 'Soups', 'Snacks & kueh', 'Desserts & drinks'] as const;
export const exclusions = ['Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida', 'Eggs', 'Dairy', 'Honey', 'Peanuts', 'Tree nuts', 'Gluten', 'Mushrooms', 'Root vegetables'] as const;
export const asRecord = (value: unknown, name: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, `Check ${name}.`);
  return value as Record<string, unknown>;
};
export const asList = (value: unknown, name: string, max: number) => {
  if (!Array.isArray(value) || value.length > max) throw new HttpError(400, `Check ${name}.`);
  return value as unknown[];
};
export const today = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
export function url(value: unknown, name: string) {
  const raw = text(value, name, 600);
  try {
    const u = new URL(raw);
    if (u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)
      && !/(^|\.)(localhost|local|internal|test|invalid)$/i.test(u.hostname)) return u.href;
  } catch { /* Reported below. */ }
  throw new HttpError(400, `Enter a public https link for ${name}.`);
}
export const optionalUrl = (value: unknown, name: string) => value === null || value === '' || value === undefined ? null : url(value, name);
export function day(value: unknown, name: string) {
  const v = text(value, name, 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v || v > today()) throw new HttpError(400, `Check ${name}.`);
  return v;
}
function amount(value: unknown, name: string) {
  if (value === null || value === '' || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10000) throw new HttpError(400, `Check ${name}.`);
  return Math.round(n * 100) / 100;
}

export function hours(value: unknown): Hours | null {
  if (value === null) return null;
  const h = asRecord(value, 'opening hours');
  const schedule = asList(h.schedule, 'opening hours lines', 8).map(line => text(line, 'an opening hours line', 220));
  if (!schedule.length) throw new HttpError(400, 'Add at least one opening hours line.');
  return { summary: text(h.summary, 'hours summary', 120), schedule, notes: text(h.notes ?? '', 'hours notes', 500, 0),
    sourceUrl: url(h.sourceUrl, 'the hours source'), checkedAt: day(h.checkedAt, 'hours checked date'), timezone: 'Asia/Singapore' };
}
/** A place photo: an uploaded or packaged JPEG with credit and source. Whether the file exists is checked by the caller. */
export function photo(value: unknown): Photo | null {
  if (value === null) return null;
  const p = asRecord(value, 'photo');
  const path = text(p.path, 'photo', 120);
  if (!/^\/api\/catalogue-photos\/[a-f0-9]{64}\.jpg$/.test(path)) throw new HttpError(400, 'Upload the photo again.');
  const size = (v: unknown) => { if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > 1600) throw new HttpError(400, 'Upload the photo again.'); return v as number; };
  return { path, width: size(p.width), height: size(p.height), author: text(p.author, 'photo credit', 180), sourceUrl: url(p.sourceUrl, 'the photo source'),
    license: text(p.license, 'photo licence', 80), licenseUrl: optionalUrl(p.licenseUrl, 'the licence link'), capturedAt: p.capturedAt ? day(p.capturedAt, 'photo date') : null,
    checkedAt: day(p.checkedAt ?? today(), 'photo checked date'), changes: text(p.changes, 'photo changes', 300),
    ...(p.provider === 'Google Maps' ? { provider: 'Google Maps' as const } : {}) };
}
export function price(value: unknown): Price {
  const p = asRecord(value, 'price'), currency = choice(p.currency ?? 'SGD', ['SGD', 'unknown'] as const, 'currency');
  const low = amount(p.amount, 'price'), high = amount(p.maxAmount, 'highest price');
  if (high !== null && (low === null || high < low)) throw new HttpError(400, 'The highest price must be above the price.');
  return { amount: low, currency: low === null ? 'unknown' : currency, type: choice(p.type ?? 'displayed', ['displayed', 'from'] as const, 'price type'), ...(high !== null ? { maxAmount: high } : {}) };
}
export function menuItem(value: unknown, id: string): MenuItem {
  const v = asRecord(value, 'dish'), category = text(v.category ?? '', 'category', 100, 0);
  const diet = v.diet === undefined || v.diet === null || v.diet === '' ? undefined : choice(v.diet, ['V', 'VG'] as const, 'dish label');
  return { id, name: text(v.name, 'dish name', 300), ...(category ? { category } : {}), price: price(v.price), qualifier: '', ...(diet ? { diet } : {}) };
}
/** Dishes on the venue's full menu, used for "6 of 38"; empty clears it. */
export function menuTotal(value: unknown) {
  if (value === null || value === '' || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2000) throw new HttpError(400, 'Enter the full menu dish count as a whole number from 1 to 2000.');
  return n;
}
/** Every dish a veg options place shows must carry the venue's own V or VG label, so meat and seafood dishes never appear. */
export function checkOptionsMenu(kitchen: 'options' | null | undefined, venueDiet: string | undefined, diets: (string | undefined)[]) {
  if (kitchen == null) return;
  if (diets.some(diet => diet !== 'V' && diet !== 'VG')) throw new HttpError(409, 'Label every dish V or VG before listing this place as Mixed Kitchen.');
  if (venueDiet === 'Vegan' && diets.some(diet => diet !== 'VG')) throw new HttpError(409, 'A Mixed Kitchen place is Vegan only when every dish is VG.');
}
export function point(value: unknown) {
  if (value === null) return null;
  const p = asRecord(value, 'map point'), latitude = Number(p.latitude), longitude = Number(p.longitude);
  if (!(latitude >= 1.16 && latitude <= 1.48 && longitude >= 103.6 && longitude <= 104.1)) throw new HttpError(400, 'Choose a map point in Singapore.');
  return { latitude, longitude };
}

const meat = /\b(chicken|pork|beef|lard|shrimp|prawn|fish sauce|oyster sauce|gelatin|gelatine|anchov(?:y|ies)|bacon|ham)\b/i;
/** The fields staff edit on any recipe; the caller merges them over the packaged or bot recipe. */
export function recipeFields(value: unknown) {
  const v = asRecord(value, 'recipe'), whole = (x: unknown, name: string, min: number, max: number) => {
    const n = Number(x); if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `Check ${name}.`); return n; };
  const cats = asList(v.categories, 'categories', 2).map(c => choice(c, categories, 'category'));
  if (!cats.length) throw new HttpError(400, 'Choose a category.');
  const contains = [...new Set(asList(v.contains ?? [], 'contains', exclusions.length).map(c => choice(c, exclusions, 'contains')))];
  const diet = choice(v.diet, ['Vegetarian', 'Vegan'] as const, 'diet');
  if (diet === 'Vegan' && contains.some(c => ['Eggs', 'Dairy', 'Honey'].includes(c))) throw new HttpError(400, 'A vegan recipe cannot contain eggs, dairy or honey.');
  const used = new Set<string>();
  const ingredients = asList(v.ingredients, 'ingredients', 30).map((raw, index) => {
    const i = asRecord(raw, 'an ingredient'), name = text(i.name, 'ingredient name', 160);
    const wanted = typeof i.id === 'string' && /^[a-z0-9][a-z0-9-]{0,49}$/.test(i.id) ? i.id : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
    let id = wanted;
    for (let n = index + 2; used.has(id); n++) id = wanted + '-' + n;
    used.add(id);
    const quantity = amount(i.amount, 'ingredient amount');
    return { id, name, amount: quantity === 0 ? null : quantity, unit: text(i.unit ?? '', 'ingredient unit', 30, 0) };
  });
  if (!ingredients.length) throw new HttpError(400, 'Add at least one ingredient.');
  const bad = ingredients.find(i => meat.test(i.name));
  if (bad) throw new HttpError(400, `"${bad.name}" is not vegetarian. Change it before saving.`);
  const steps = asList(v.steps, 'steps', 20).map(raw => {
    const s = asRecord(raw, 'a step'), ids = asList(s.ingredientIds ?? [], 'step ingredients', 30).map(id => String(id)).filter(id => used.has(id));
    const timer = s.timer ? asRecord(s.timer, 'timer') : null;
    const photo = s.photo === null || s.photo === undefined || s.photo === '' ? undefined : text(s.photo, 'step photo', 140);
    if (photo && !/^\/api\/(catalogue-photos|editorial\/assets)\/[a-f0-9]{64}\.jpg$/.test(photo)) throw new HttpError(400, 'Upload the step photo again.');
    const image = photo && s.image ? choice(s.image, ['frame', 'illustration'] as const, 'step image type') : undefined;
    const at = s.at === undefined || s.at === null ? undefined : Number(s.at);
    if (at !== undefined && (!Number.isFinite(at) || at < 0 || at > 86400)) throw new HttpError(400, 'Check the step video time.');
    return { title: text(s.title, 'step title', 120), instruction: text(s.instruction, 'step instructions', 1400), ingredientIds: [...new Set(ids)],
      ...(photo ? { photo, ...(image ? { image } : {}) } : {}), ...(at !== undefined ? { at } : {}),
      ...(timer ? { timer: { label: text(timer.label, 'timer label', 80), seconds: whole(timer.seconds, 'timer length', 1, 10800) } } : {}) };
  });
  if (!steps.length) throw new HttpError(400, 'Add at least one step.');
  const image = v.image ? asRecord(v.image, 'photo') : null;
  if (image && !/^\/api\/(catalogue-photos|editorial\/assets)\/[a-f0-9]{64}\.jpg$/.test(String(image.path))) throw new HttpError(400, 'Upload the photo again.');
  return {
    name: text(v.name, 'recipe name', 160), description: text(v.description ?? '', 'description', 700, 0), cuisine: text(v.cuisine, 'cuisine', 60),
    minutes: whole(v.minutes, 'total minutes', 1, 180), servings: whole(v.servings, 'servings', 1, 8), categories: cats, onePot: v.onePot === true,
    dietary: { diet, contains, ingredientsKnown: true }, ingredients, steps, removeCover: v.removeCover === true,
    image: image ? { path: String(image.path), width: whole(image.width, 'photo width', 1, 1600), height: whole(image.height, 'photo height', 1, 1600), credit: text(image.credit, 'photo credit', 180) } : null,
    sources: asList(v.sources ?? [], 'sources', 12).filter(s => s !== '').map(s => url(s, 'a source')),
  };
}
const sgTime = (value: unknown, name: string) => {
  const v = text(value, name, 40);
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? v + ':00+08:00' : v;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(iso) || !Number.isFinite(Date.parse(iso))) throw new HttpError(400, `Check ${name}.`);
  return iso;
};
/** A complete external event in the shape the app and the bot use. */
export function event(value: unknown, id: string) {
  const e = asRecord(value, 'event'), startsAt = sgTime(e.startsAt, 'start time');
  const endsAt = e.endsAt ? sgTime(e.endsAt, 'end time') : null, deadline = e.registrationDeadline ? sgTime(e.registrationDeadline, 'registration deadline') : null;
  if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new HttpError(400, 'The end time must be after the start.');
  if (deadline && Date.parse(deadline) > Date.parse(startsAt)) throw new HttpError(400, 'Registration must close before the event starts.');
  const fee = amount(e.feeAmount, 'fee'), sources = asList(e.sources, 'sources', 12).filter(s => s !== '').map(s => url(s, 'a source'));
  if (!sources.length) throw new HttpError(400, 'Add the public page this event comes from.');
  return { id, title: text(e.title, 'title', 180), organiser: text(e.organiser, 'organiser', 160), startsAt, endsAt,
    location: text(e.location, 'venue', 180), address: text(e.address, 'address', 300), feeAmount: fee, currency: fee === null ? null : 'SGD',
    feeNote: text(e.feeNote ?? '', 'fee note', 300, 0), registrationUrl: optionalUrl(e.registrationUrl, 'the registration link'), registrationDeadline: deadline,
    dietEvidence: text(e.dietEvidence, 'diet evidence', 600), status: choice(e.status, ['scheduled', 'cancelled', 'rescheduled'] as const, 'status'),
    checkedAt: today(), sources };
}
