import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { CommunityError, list, pick, text } from '../community/http.mjs';
import { maxInputPixels, withDecodeSlot } from '../community/images.mjs';

// Mirrors src/config/market.ts and src/config/market-ingredients.ts; the server is the authority.
export const categories = ['Bakes', 'Kueh & sweets', 'Savoury', 'Frozen', 'Sauces & pantry', 'Drinks'];
export const ingredients = ['Eggs', 'Dairy', 'Honey', 'Peanuts', 'Tree nuts', 'Gluten', 'Mushrooms', 'Soy', 'Sesame', 'Mustard', 'Celery', 'Lupin', 'Sulphites',
  'Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida'];
export const alliums = ['Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida'];
export const diets = ['vegan', 'no-egg', 'five-pungent-free', 'jain'];
export const slots = ['item', 'detail', 'label'];
export const declarationsVersion = 3;
/** Home cooking stays small-scale under SFA's home-based business rules. QuinTaste policy until SFA sets numbers. */
export const limits = { perOrder: 10, perSlot: 20 };

const always = /\b(chewing gum|bubble gum|raw milk|unpasteuri[sz]ed|sashimi|raw oysters?|supplements?|insects?|crickets?|mealworms?|wild mushrooms?|cbd|cannabis)\b/i;
const liquor = /\b(beer|wine|sake|soju|whisky|whiskey|vodka|liqueur|cocktails?|spirits|brandy|rum|gin|tequila|alcohol)\b/i;
/** Soft drinks named after beer, and drinks stated to be non-alcoholic, are not liquor. */
const notLiquor = /\b(ginger|root|birch) beer\b|\bnon[- ]?alcoholic\b|\balcohol[- ]free\b/gi;
const notSmallScale = /\b(catering|caterer|buffet|party (tray|set|platter)s?|events?|corporate|office (lunch|order)s?|bento for|\d+\s*pax|wholesale|resellers?|for (cafes?|shops?|restaurants?)|bulk orders?|meal (plans?|subscriptions?)|weekly meals)\b/i;
const animalIngredients = 'lard|gelatine?|bonito|anchov(?:y|ies)|ikan bilis|belacan|chicken|beef|fish|prawns?|shrimps?|pork|bacon|duck|goose|geese|turkey|mutton|lamb|venison|ham|crab|lobsters?|oysters?|squid|clams?|mussels?|seafood';
const meat = new RegExp('\\b(?:' + animalIngredients + ')\\b', 'i');
// Remove only explicitly qualified alternatives/absence claims, never an entire ingredient list.
const qualifiedAlternative = new RegExp('(?<!\\b(?:non[- ]|not ))\\b(?:vegetarian|vegan|mock|plant[- ]based|meatless|meat[- ]free|no|without|free from)(?:[-\\s]+(?:roast(?:ed)?|fried|smoked|grilled|shredded|sliced|braised|crispy)){0,2}[-\\s]+(?:' + animalIngredients + ')\\b', 'gi');
const nonMeatIngredients = /\boyster mushrooms?\b|\bfish mint\b|\b(?:chicken|duck|goose|quail|turkey) eggs?\b/gi;
export const containsMeat = value => meat.test(value.replace(nonMeatIngredients, '').replace(qualifiedAlternative, ''));
const jainRoots = /\b(potato(es)?|carrots?|beetroots?|radish(es)?|ginger|garlic|onions?|turnips?|yams?|cassava|tapioca|turmeric|leeks?|shallots?|scallions?)\b/i;
const contactDetails = /https?:\/\/|www\.|\bt\.me\/|\bwa\.me\/|\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b|(?:\+?65[\s-]?)?\b[3689]\d{3}[\s-]?\d{4}\b|\bpaynow\s*:?\s*\d/i;

/** Contact and payment details stay out of listings and chat; they are shared in person. */
export function noContactDetails(value, field = 'Message') {
  if (contactDetails.test(value)) throw new CommunityError(400, `${field} can't include links, emails, phone numbers or payment details. Share them in person at collection.`);
  return value;
}
function readDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CommunityError(400, 'Choose a valid date.');
  const at = Date.parse(value + 'T00:00:00+08:00');
  if (!Number.isFinite(at) || new Date(at + 8 * 3600000).toISOString().slice(0, 10) !== value) throw new CommunityError(400, 'Choose a valid date.');
  return value;
}
const whole = (value, min, max, message) => { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) throw new CommunityError(400, message); return n; };

/** Shop profile fields; a draft may be incomplete. */
export function readSeller(body) {
  body ??= {};
  return {
    tradingName: text(body.tradingName, 60, { field: 'Shop name' }), about: noContactDetails(text(body.about, 300, { field: 'About' }), 'About'),
    area: text(body.area, 60, { field: 'Area' }), meetup: body.meetup !== false, delivery: body.delivery === true,
    deliveryFeeCents: whole(body.deliveryFeeCents ?? 0, 0, 10000, 'Enter a delivery fee from S$0 to S$100.'),
    deliveryAreas: text(body.deliveryAreas, 160, { field: 'Delivery areas' }),
    payCash: body.payCash !== false, payPaynow: body.payPaynow === true,
  };
}
/** The first reason a shop can't open (or, once open, can't be saved), or null. */
export function sellerProblem(s) {
  if (!s.tradingName) return 'Add your shop name.';
  if (!s.area) return 'Add the area you sell from.';
  if (!s.meetup && !s.delivery) return 'Offer meetup collection, delivery or both.';
  if (s.delivery && !s.deliveryAreas) return 'Add the areas you deliver to.';
  if (!s.payCash && !s.payPaynow) return 'Choose how buyers pay you at handover.';
  return null;
}
/** Listing fields; drafts may be incomplete. `made` is food the seller cooks at home; `prepacked` is a sealed item bought from a shop in Singapore. */
export function readListing(body) {
  body ??= {};
  const contains = list(body.contains, ingredients), mayContain = list(body.mayContain, ingredients).filter(tag => !contains.includes(tag));
  const kind = pick(body.kind, ['made', 'prepacked'], 'made'), limit = limits.perOrder;
  return {
    kind, name: noContactDetails(text(body.name, 80, { field: 'Item name' }), 'Item name'), category: pick(body.category, categories, 'Bakes'),
    priceCents: whole(body.priceCents ?? 0, 0, 100000, 'Enter a price up to S$1,000.'), portion: text(body.portion, 40, { field: 'Portion' }),
    description: noContactDetails(text(body.description, 500, { field: 'Description' }), 'Description'),
    ingredients: text(body.ingredients, 5000, { field: 'Ingredient list' }), contains, mayContain, diets: list(body.diets, diets),
    storage: text(body.storage, 200, { field: 'Storage' }), dateMark: kind === 'prepacked' ? readDate(body.dateMark) : null,
    lot: kind === 'prepacked' ? text(body.lot, 40, { field: 'Lot' }) : '',
    leadDays: whole(body.leadDays ?? 1, 0, 30, 'Enter a lead time from 0 to 30 days.'),
    maxPerOrder: whole(body.maxPerOrder ?? 5, 1, limit, `Allow 1 to ${limit} per order.`),
  };
}
/** The first reason a listing can't be published, or null. `photos` is the set of slots saved for it. */
export function listingProblem(l, photos, today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)) {
  const words = [l.name, l.description, l.portion].join(' ');
  if (!l.name) return 'Add an item name.';
  if (always.test(words + ' ' + l.ingredients)) return "This item can't be sold on Market.";
  if (l.category === 'Drinks' && !/\bnon[- ]?alcoholic\b|\balcohol[- ]free\b/i.test(words) && liquor.test(words.replace(notLiquor, ' '))) {
    return 'Alcoholic drinks need a liquor licence and are not sold on Market.';
  }
  if (notSmallScale.test(words)) return 'Market items can’t be catering, party or group meals, bulk or wholesale lots, or supplied to other businesses.';
  if (l.priceCents < 1) return 'Enter a price.';
  if (!l.portion) return 'Add the portion or pack size.';
  if (!l.ingredients) return 'List every ingredient.';
  if (containsMeat(l.ingredients)) return 'Market is vegetarian. Remove meat, fish or animal-derived ingredients such as gelatine or lard.';
  if (!l.storage) return 'Add storage and how soon to eat it.';
  if (!photos.has('item')) return 'Add a photo of the food.';
  if (l.kind === 'prepacked') {
    if (!photos.has('label')) return 'Add a clear photo of the product label.';
    if (!l.dateMark || l.dateMark <= today) return 'Add the date mark printed on the pack; it must be in the future.';
    if (!l.lot) return 'Add the lot or batch number printed on the pack, so a recall can reach your buyers.';
  }
  return dietProblem(l);
}
/** Declared diets must agree with the declared allergens and ingredients. */
export function dietProblem(l) {
  const has = tag => l.contains.includes(tag);
  if (l.diets.includes('vegan') && ['Eggs', 'Dairy', 'Honey'].some(has)) return 'A vegan item can’t contain egg, dairy or honey.';
  if (l.diets.includes('no-egg') && has('Eggs')) return 'An egg-free item can’t contain eggs.';
  if ((l.diets.includes('five-pungent-free') || l.diets.includes('jain')) && alliums.some(has)) return 'Five-pungent-free and Jain items can’t contain onion, garlic, leek, chives, scallion, shallot or asafoetida.';
  if (l.diets.includes('jain') && (has('Honey') || jainRoots.test(l.ingredients))) return 'Jain items can’t contain honey, root vegetables or alliums.';
  return null;
}
async function encode(uri, { edge, quality, max, inputMax }) {
  if (typeof uri !== 'string' || uri.length > inputMax || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) {
    throw new CommunityError(400, 'Use a JPG, PNG or WebP photo under 1 MB.');
  }
  const input = Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
  try {
    const bytes = await withDecodeSlot(() => sharp(input, { limitInputPixels: maxInputPixels, failOn: 'error' }).rotate()
      .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer());
    if (bytes.length > max) throw new CommunityError(400, 'That photo is too detailed. Use a smaller photo.');
    return { bytes, digest: createHash('sha256').update(bytes).digest('hex') };
  } catch (error) {
    if (error instanceof CommunityError) throw error;
    throw new CommunityError(400, 'That photo could not be read.');
  } finally { input.fill(0); }
}
/** Listing photos: EXIF rotation applied, metadata stripped, bounded JPEG. */
export const processPhoto = uri => encode(uri, { edge: 1280, quality: 78, max: 600000, inputMax: 1400000 });
export const money = cents => 'S$' + (cents / 100).toFixed(cents % 100 ? 2 : 0);
/** A seller whose shop buyers can see and order from: open on the current declarations, and not suspended or removed by staff. */
export const liveSeller = alias => `${alias}.status='active' AND ${alias}.declarations_version >= ${declarationsVersion}`;
