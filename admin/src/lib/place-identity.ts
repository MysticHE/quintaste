/**
 * When two Explore places are one listing (owner, 24 Oct 2026). Twin of same_place in ops/qt-team/veg_options.py: keep both identical.
 * Same postal code, then either the same unit (two units that differ are two places) or, when a unit is missing, the same name once
 * branch text and generic words are set aside. A Chinese-only name and its English name cannot be matched without a shared unit.
 */
export type PlaceIdentity = { name?: string | null; address?: string | null; postalCode?: string | null };

const generic = new Set(['vegetarian', 'vegan', 'veggie', 'veg', 'food', 'foods', 'stall', 'the', 'and', 'singapore', 'pte', 'ltd']);
const unitPattern = /#\s*(B?\d{1,2})\s*-\s*(\d{1,4}[A-Z]?)/i;
const bracketed = /[(\[\uff08\u3010][^)\]\uff09\u3011]*[)\]\uff09\u3011]/g;
const branch = /\s+[-\u2013\u2014|]\s+|\s*@\s*/;
const wordPattern = /[a-z0-9]+|[\u3400-\u9fff\uf900-\ufaff]+/g;

/** Compatibility forms folded and accents dropped (Café = Cafe, Đ = D), as in the app's search words. */
const plain = (text?: string | null) => String(text ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D');

/** "#01-017" and "# 1-17" are the same unit: 1-17; basements keep their B. */
export function placeUnit(address?: string | null) {
  const m = unitPattern.exec(plain(address));
  return m ? m[1].toUpperCase().replace(/^(B?)0+(?=\d)/, '$1') + '-' + m[2].toUpperCase().replace(/^0+(?=\d)/, '') : null;
}
/** Words of the name before any branch text ("- Le Quest Mall", "@ 325 Woodlands", "(Clementi)"), without generic words. */
export function nameTokens(name?: string | null) {
  const core = plain(name).toLowerCase().replace(bracketed, ' ').split(branch)[0];
  return (core.match(wordPattern) ?? []).filter(word => !generic.has(word));
}
/** Every word of `small` in `large`, counting repeats ("Yuan Yuan" is not inside "De Yuan"); one word only as `large`'s first. */
function contains(large: string[], small: string[]) {
  const left = [...large];
  for (const word of small) {
    const at = left.indexOf(word);
    if (at < 0) return false;
    left.splice(at, 1);
  }
  return small.length > 1 || small[0] === large[0];
}
function sameName(a?: string | null, b?: string | null) {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return false;
  if (contains(ta, tb) || contains(tb, ta)) return true;
  // "Zhen Yi" and "Zhenyi Veggie Place": the Latin letters of one name run on into the other's
  const [short, long] = [ta, tb].map(words => words.filter(word => /^[\x00-\x7f]+$/.test(word)).join('')).sort((x, y) => x.length - y.length);
  return short.length >= 5 && long.startsWith(short);
}
export function samePlace(a: PlaceIdentity, b: PlaceIdentity): 'same unit' | 'same name' | null {
  const postal = String(a.postalCode ?? '');
  if (!/^\d{6}$/.test(postal) || postal !== String(b.postalCode ?? '')) return null;
  const ua = placeUnit(a.address), ub = placeUnit(b.address);
  if (ua && ub) return ua === ub ? 'same unit' : null;
  return sameName(a.name, b.name) ? 'same name' : null;
}
