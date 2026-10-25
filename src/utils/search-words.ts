// Common Singapore spellings of the same dish, read as one word so "wonton" finds "Wanton Mee" and "CKT" finds
// "Char Kuey Teow". The first spelling is the one search keeps; only whole words are replaced.
const variants: [string, string[]][] = [
  ["wanton", ["wonton", "wantan", "wan tan", "won ton", "wantun"]],
  ["kway teow", ["kuey teow", "kwey teow", "kuay teow", "koay teow", "kueh teow", "kway tiao", "kuey tiau", "kway tiau"]],
  ["char kway teow", ["ckt"]],
  ["hor fun", ["horfun", "hor fan", "hofun"]],
  ["bee hoon", ["beehoon", "mee hoon", "bihun", "bi hun", "mihun", "mi hoon"]],
  ["bak kut teh", ["bah kut teh", "bakuteh"]],
  ["char siew", ["char siu", "cha siu", "cha siew", "char sio"]],
  ["yong tau foo", ["yong tau fu", "yong tao foo", "yong tau hu", "ytf"]],
  ["tofu", ["tauhu", "tau hu", "taufu"]],
  ["popiah", ["poh piah"]],
  ["chee cheong fun", ["chee cheong fan", "chee chong fun", "chee cheung fun", "chee chong fan"]],
  ["mee goreng", ["mi goreng"]],
  ["mee rebus", ["mi rebus"]],
  ["mee siam", ["mi siam"]],
  ["dosa", ["thosai", "tosai", "dosai"]],
  ["biryani", ["briyani", "biriyani", "beryani"]],
  ["chapati", ["chapatti", "chappati"]],
  ["carrot cake", ["chai tow kway", "chye tow kway", "chai tow kueh", "chye tow kueh"]],
  ["you tiao", ["youtiao", "you char kway", "you char kueh", "yu char kway"]],
  ["kway chap", ["kuay chap", "kueh chap"]],
  ["economy rice", ["economic rice"]],
  ["noodle", ["noodles"]],
  ["dumpling", ["dumplings"]],
];
const canonical = new Map(variants.flatMap(([word, spellings]) => spellings.map(spelling => [spelling, word] as const)));
const pattern = new RegExp("(^| )(" + [...canonical.keys()].sort((a, b) => b.length - a.length).join("|") + ")(?= |$)", "g");

/** Text as search compares it: no case, accents or punctuation, and one spelling per dish. */
export function searchWords(value: string) {
  const plain = value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return plain.replace(pattern, (_, space: string, word: string) => space + canonical.get(word));
}

/** A letter or digit of a Latin-script word; Chinese characters next to one count as a word break. */
export const wordCharacter = /[a-z0-9]/;
/**
 * How closely a name matches: 0 is the search exactly, 1 holds it as whole words ("Olive Fried Rice", or its plural:
 * "bun" in "Steamed Buns"), 2 starts a longer word (typing "wan" for "wanton"), 3 sits inside a word or in Chinese text,
 * -1 not at all.
 */
export function matchTier(text: string, query: string) {
  if (text === query) return 0;
  let best = -1;
  for (let at = text.indexOf(query); at >= 0 && best !== 1; at = text.indexOf(query, at + 1)) {
    let end = at + query.length;
    while (end < text.length && wordCharacter.test(text[end])) end++;
    const rest = text.slice(at + query.length, end);
    const tier = at > 0 && wordCharacter.test(text[at - 1]) ? 3 : rest === "" || rest === "s" || rest === "es" ? 1 : 2;
    if (best < 0 || tier < best) best = tier;
  }
  return best;
}
