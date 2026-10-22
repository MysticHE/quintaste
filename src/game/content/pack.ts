/**
 * Level packs (docs/game/RECIPE_LEVELS_PLAN.md §8): a recipe level arrives as data, never code. A pack adds dishes and
 * the items they need on top of the built-in content; it can never change a built-in dish, item or rule, so the rules
 * version (sim/replay.ts) stays the built-in content's and a pack is identified by its own hash instead.
 */
import { DISHES, dishesChanged, STATIONS, type Dish, type Part, type Slot, type Stage, type StationKind } from "./dishes";
import { ITEM_FORM, ITEMS, type GameItem, type GameLabel, type ItemForm, type ItemTag, type ItemTone } from "./items";

export const PACK_FORMAT = 1;
export type LevelPack = {
  format: typeof PACK_FORMAT; id: string;
  /** The stations (techniques) the pack needs; an app that lacks one cannot play it. */
  techniques: StationKind[];
  dishes: Dish[]; items: GameItem[]; forms: Record<string, ItemForm>;
  /** Ingredients whose diet tags nobody has checked yet: a dish that needs one is never ordered by a guest who keeps a rule. */
  unreviewed?: string[];
};
export class PackError extends Error {}

/** The built-in content as it was when the game loaded, before any pack: what the rules version covers. */
export const BUILTIN = { dishes: { ...DISHES }, items: { ...ITEMS }, forms: { ...ITEM_FORM } } as const;

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/, PACK_ID = /^[a-z0-9][a-z0-9-]{2,63}$/, ART = /^[A-Za-z0-9][A-Za-z0-9-]{0,59}$/;
const TAGS = new Set<ItemTag>(["allium", "egg", "dairy", "honey", "root", "mushroom", "hot", "animal"]);
const TONES = new Set<ItemTone>(["soy", "oil", "cream", "red", "white", "gold", "dark"]);
const LIMITS = { dishes: 32, items: 128, parts: 3, stages: 6, slots: 3, accepts: 8 };

const fail = (why: string): never => { throw new PackError(why); };
const obj = (v: unknown, where: string, keys: string[]) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) fail(where + ": not an object");
  for (const k of Object.keys(v as object)) if (!keys.includes(k)) fail(where + ": unknown field " + k);
  return v as Record<string, unknown>;
};
const text = (v: unknown, where: string, max: number) => typeof v === "string" && v.trim() && v.length <= max ? v : fail(where + ": bad text");
const id = (v: unknown, where: string) => typeof v === "string" && ID.test(v) ? v : fail(where + ": bad id");
const art = (v: unknown, where: string) => typeof v === "string" && ART.test(v) ? v : fail(where + ": bad art key");
const list = (v: unknown, where: string, min: number, max: number) => Array.isArray(v) && v.length >= min && v.length <= max ? v : fail(where + ": bad list");
const num = (v: unknown, where: string, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : fail(where + ": bad number");
/** Optional fields are left out rather than set to undefined, so a pack hashes the same after a JSON round trip. */
const put = <T extends object>(o: T, k: string, v: unknown) => { if (v !== undefined) (o as Record<string, unknown>)[k] = v; return o; };

function readLabel(v: unknown, where: string): GameLabel {
  const o = obj(v, where, ["title", "ingredients", "contains", "flagged"]);
  const label: GameLabel = { title: text(o.title, where, 80), ingredients: list(o.ingredients, where, 1, 20).map(x => text(x, where, 60)), contains: text(o.contains, where, 80) };
  return put(label, "flagged", o.flagged === undefined ? undefined : text(o.flagged, where, 60));
}
function readItem(v: unknown, i: number): GameItem {
  const where = "item " + i, o = obj(v, where, ["id", "name", "art", "tray", "tags", "label", "variant", "note"]);
  const item: GameItem = { id: id(o.id, where), name: text(o.name, where, 60), art: art(o.art, where), tray: o.tray === "fresh" || o.tray === "pantry" ? o.tray : fail(where + ": bad tray") };
  put(item, "tags", o.tags === undefined ? undefined : list(o.tags, where, 0, TAGS.size).map(t => TAGS.has(t as ItemTag) ? t as ItemTag : fail(where + ": bad tag")));
  put(item, "label", o.label === undefined ? undefined : readLabel(o.label, where));
  put(item, "variant", o.variant === undefined ? undefined : o.variant === "A" || o.variant === "B" ? o.variant : fail(where + ": bad variant"));
  return put(item, "note", o.note === undefined ? undefined : text(o.note, where, 200));
}
function readStage(v: unknown, where: string, known: (item: string) => boolean): Stage {
  const o = obj(v, where, ["slots", "secs", "hint", "band", "scorchSecs", "splitIfHot", "turn"]);
  const slots = list(o.slots, where, 1, LIMITS.slots).map((s, k): Slot => {
    const so = obj(s, where + " slot " + k, ["key", "label", "accepts", "optional"]);
    const accepts = list(so.accepts, where, 1, LIMITS.accepts).map(a => known(id(a, where)) ? a as string : fail(where + ": unknown item " + String(a)));
    const slot: Slot = { key: id(so.key, where), label: text(so.label, where, 40), accepts };
    return put(slot, "optional", so.optional === undefined ? undefined : typeof so.optional === "boolean" ? so.optional : fail(where + ": bad optional"));
  });
  const stage: Stage = { slots, secs: num(o.secs, where, 0, 60), hint: text(o.hint, where, 80) };
  if (o.band !== undefined) {
    const [lo, hi] = list(o.band, where, 2, 2).map(x => num(x, where, 0, 1));
    put(stage, "band", lo < hi ? [lo, hi] : fail(where + ": bad band"));
  }
  put(stage, "scorchSecs", o.scorchSecs === undefined ? undefined : num(o.scorchSecs, where, 0.1, 99));
  put(stage, "turn", o.turn === undefined ? undefined : o.turn === "flip" || o.turn === "fold" ? o.turn : fail(where + ": bad turn"));
  return put(stage, "splitIfHot", o.splitIfHot === undefined ? undefined : list(o.splitIfHot, where, 1, LIMITS.accepts).map(a => known(id(a, where)) ? a as string : fail(where + ": unknown item")));
}
function readDish(v: unknown, i: number, techniques: Set<string>, known: (item: string) => boolean): Dish {
  const where = "dish " + i, o = obj(v, where, ["id", "name", "art", "recipeId", "parts", "remember"]);
  const parts = list(o.parts, where, 1, LIMITS.parts).map((p, k): Part => {
    const pw = where + " part " + k, po = obj(p, pw, ["id", "name", "station", "stages", "makes"]);
    const station = typeof po.station === "string" && techniques.has(po.station) ? po.station as StationKind : fail(pw + ": station not in techniques");
    const part: Part = { id: id(po.id, pw), name: text(po.name, pw, 60), station, stages: list(po.stages, pw, 1, LIMITS.stages).map((s, n) => readStage(s, pw + " stage " + n, known)) };
    return put(part, "makes", po.makes === undefined ? undefined : known(id(po.makes, pw)) ? po.makes : fail(pw + ": unknown item " + String(po.makes)));
  });
  const dish: Dish = { id: id(o.id, where), name: text(o.name, where, 60), art: art(o.art, where), parts, remember: text(o.remember, where, 240) };
  return put(dish, "recipeId", o.recipeId === undefined ? undefined : text(o.recipeId, where, 151));
}

/** Validates untrusted pack JSON. Throws PackError naming the first problem; a station this app lacks says so. */
/** `size` caps a pack's dishes and items: a member or staff pack keeps the defaults; only the built-in content (builtinPack) is larger. */
export function readPack(v: unknown, size: { dishes: number; items: number } = LIMITS): LevelPack {
  const o = obj(v, "pack", ["format", "id", "techniques", "dishes", "items", "forms", "unreviewed"]);
  if (o.format !== PACK_FORMAT) fail("pack: unsupported format " + String(o.format));
  const packId = typeof o.id === "string" && PACK_ID.test(o.id) ? o.id : fail("pack: bad id");
  const techniques = list(o.techniques, "pack", 1, 16).map(t => typeof t === "string" && t in STATIONS ? t as StationKind : fail("needs " + String(t)));
  const items = list(o.items, "pack", 0, size.items).map(readItem);
  const own = new Set(items.map(i => i.id));
  if (own.size !== items.length) fail("pack: duplicate item");
  const known = (item: string) => own.has(item) || item in BUILTIN.items;
  const dishes = list(o.dishes, "pack", 1, size.dishes).map((d, i) => readDish(d, i, new Set(techniques), known));
  if (new Set(dishes.map(d => d.id)).size !== dishes.length) fail("pack: duplicate dish");
  const fo = o.forms === undefined ? {} : obj(o.forms, "forms", [...own, ...Object.keys(BUILTIN.items)]);
  const forms: Record<string, ItemForm> = {};
  for (const [k, f] of Object.entries(fo)) {
    const ff = obj(f, "form " + k, ["form", "tone"]);
    forms[k] = { form: ff.form === "pour" || ff.form === "sprinkle" ? ff.form : fail("form " + k + ": bad form"), tone: TONES.has(ff.tone as ItemTone) ? ff.tone as ItemTone : fail("form " + k + ": bad tone") };
  }
  const unreviewed = o.unreviewed === undefined ? undefined : list(o.unreviewed, "pack", 0, size.items).map(x => own.has(id(x, "unreviewed")) ? x as string : fail("unreviewed: not one of this pack's items"));
  return put({ format: PACK_FORMAT, id: packId, techniques, dishes, items, forms } as LevelPack, "unreviewed", unreviewed?.length ? unreviewed : undefined);
}

/** Same key order at every depth, so equal content always hashes and compares the same. */
const canonical = (v: unknown): string => Array.isArray(v) ? "[" + v.map(canonical).join(",") + "]"
  : v && typeof v === "object" ? "{" + Object.keys(v).sort().filter(k => (v as Record<string, unknown>)[k] !== undefined)
    .map(k => JSON.stringify(k) + ":" + canonical((v as Record<string, unknown>)[k])).join(",") + "}"
  : JSON.stringify(v);
/** FNV-1a of the canonical pack: the pack's identity for caching, runs and replay. */
export function packHash(pack: LevelPack) {
  const s = canonical(pack);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return "p" + h.toString(36);
}

const registered = new Map<string, string>();
/**
 * Adds a validated pack's dishes, items and forms to the content the simulation reads. An id that already exists must
 * hold exactly the same content (registering a pack twice, or the built-in pack, changes nothing); anything else is
 * refused, so a pack can never alter a built-in dish, item or label.
 */
export function registerPack(pack: LevelPack) {
  const hash = packHash(pack);
  if (registered.get(pack.id) === hash) return hash;
  const clash = (have: unknown, next: unknown, what: string) => { if (have !== undefined && canonical(have) !== canonical(next)) fail(what + " already exists with other content"); };
  for (const it of pack.items) clash(ITEMS[it.id], it, "item " + it.id);
  for (const d of pack.dishes) clash(DISHES[d.id], d, "dish " + d.id);
  for (const [k, f] of Object.entries(pack.forms)) clash(ITEM_FORM[k], f, "form " + k);
  for (const it of pack.items) ITEMS[it.id] ??= it;
  for (const d of pack.dishes) DISHES[d.id] ??= d;
  dishesChanged();
  for (const [k, f] of Object.entries(pack.forms)) ITEM_FORM[k] ??= f;
  registered.set(pack.id, hash);
  byHash.set(hash, pack);
  return hash;
}
const byHash = new Map<string, LevelPack>();
/** A registered pack by its hash, for replay; undefined when this process has not registered it. */
export const packByHash = (hash: string) => byHash.get(hash);

/** The built-in content written as a pack: proves the format can express every built dish, item and pan form. */
export function builtinPack(): LevelPack {
  return readPack(JSON.parse(JSON.stringify({ format: PACK_FORMAT, id: "builtin", techniques: Object.keys(STATIONS),
    dishes: Object.values(BUILTIN.dishes), items: Object.values(BUILTIN.items), forms: BUILTIN.forms })), { dishes: 4096, items: 4096 });
}
/** Canonical JSON equality, for checks and tests. */
export const sameContent = (a: unknown, b: unknown) => canonical(a) === canonical(b);
