import { searchWords, wordCharacter } from "../utils/search-words";

/** End of the Latin-script word running from `from`. */
const wordEnd = (line: string, from: number) => { let end = from; while (end < line.length && wordCharacter.test(line[end])) end++; return end; };
const joining = new Set(["and", "with", "in", "on", "of", "the", "a", "an", "or"]);
/** A dish in title case; joining words after the first stay lower case ("Sweet and Sour Tofu"). */
export const dishTitle = (term: string) => term.split(" ").map((word, at) => at && joining.has(word) ? word : word.replace(/^\p{L}/u, letter => letter.toUpperCase())).join(" ");
// Words that make a weak next word in a suggestion ("Tofu With").
const filler = new Set(["with", "w", "and", "n", "or", "in", "on", "of", "the", "a", "an", "for", "set", "pc", "pcs", "per", "x"]);

/**
 * Dish names to suggest while typing, from every listed place's menu (one array of search-word dish names per place):
 * the typed word completed ("fried r" → Fried Rice), then the most common next word ("wanton" → Wanton Noodle).
 * Ranked by how many places serve it; a phrase needs two places. A completed word always followed by the same word is
 * left to its phrase, and a plural joins its singular. Latin-script words only: Chinese dish names carry no word breaks.
 */
export function dishTerms(query: string, menus: Iterable<readonly string[]>, limit = 3): string[] {
  const q = searchWords(query);
  if (q.length < 2) return [];
  const words = new Map<string, { places: number; next: Set<string> }>(), phrases = new Map<string, number>();
  for (const lines of menus) {
    const placeWords = new Set<string>(), placePhrases = new Set<string>();
    for (const line of lines) {
      for (let at = line.indexOf(q); at >= 0; at = line.indexOf(q, at + 1)) {
        if (at > 0 && wordCharacter.test(line[at - 1])) continue;
        const end = wordEnd(line, at + q.length);
        const term = line.slice(at, end);
        const next = line[end] === " " ? line.slice(end + 1, wordEnd(line, end + 1)) : "";
        const entry = words.get(term) ?? { places: 0, next: new Set<string>() };
        entry.next.add(next); words.set(term, entry);
        if (!placeWords.has(term)) { placeWords.add(term); entry.places++; }
        if (next && !filler.has(next) && !/\d/.test(next)) placePhrases.add(term + " " + next);
      }
    }
    for (const phrase of placePhrases) phrases.set(phrase, (phrases.get(phrase) ?? 0) + 1);
  }
  const ranked = <T,>(list: [string, T][], count: (value: T) => number) => list.sort((a, b) => count(b[1]) - count(a[1]) || a[0].localeCompare(b[0])).map(([term]) => term);
  const single = ranked([...words].filter(([term, entry]) => !(term.endsWith("s") && words.has(term.slice(0, -1)))
    && (entry.next.size > 1 || entry.next.has(""))), entry => entry.places);
  const pairs = ranked([...phrases].filter(([, count]) => count >= 2), count => count);
  return [...new Set([...single.slice(0, 2), ...pairs])].slice(0, limit).map(dishTitle);
}

// Words a recipe name adds that no menu dish starts or ends on ("Plant-based coconut laksa" must not find "Plant Based Burger").
const describing = new Set([...filler, "plant", "based", "vegan", "vegetarian", "veggie", "fresh", "easy", "quick", "simple", "homemade", "home",
  "healthy", "style", "classic", "version", "gentle", "mini", "no", "free", "less", "allium", "my", "our"]);
// Single words too broad to stand for the dish ("Miso bowl" is not every bowl; "Vegetarian tomato sambal" is not every sambal dish).
const broad = new Set([...describing, "rice", "noodle", "mee", "mian", "mein", "fan", "fun", "hoon", "kway", "teow", "soup", "bowl", "salad", "sauce", "sambal", "curry", "toss", "ball", "cake", "bread", "toast", "roll", "bun", "dumpling",
  "pie", "tart", "drink", "tea", "milk", "water", "oil", "fried", "fry", "stir", "steamed", "braised", "roasted", "roast", "baked", "grilled", "pan",
  "one", "pot", "mixed", "crispy", "spicy", "sweet", "sour", "hot", "cold", "warm", "creamy", "light", "ginger", "garlic", "onion", "coconut", "sesame",
  "pandan", "soy", "tofu", "mushroom", "egg", "greens", "vegetable", "chinese", "malay", "indian", "nyonya", "peranakan", "singapore", "japanese",
  "thai", "korean", "western"]);
const singular = (word: string) => word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;

/**
 * Phrases from a recipe's name that a menu might list, longest first. Each phrase ends on the dish word: the last word, or the
 * one before "with" ("Ginger mushroom oat porridge", "Nasi lemak with sambal tempeh"), since a word from the middle names an
 * ingredient ("Carrot, cumin and lemon salad" is not lemon); "w/" counts as "with". A part in brackets or after a dash is another name for the dish,
 * tried after the first ("Taiwanese egg crepe (Dan Bing)"). A plural is tried as its singular too ("Fresh popiah rolls").
 */
export function recipeDishPhrases(name: string): string[] {
  const found: string[] = [];
  for (const part of name.split(/[()（）—–]|\s-\s/)) {
    const words = searchWords(part).split(" ").filter(word => word && !/\d/.test(word)).slice(0, 12);
    const at = words.findIndex(word => word === "with" || word === "w"), end = at > 0 ? at : words.length;
    for (let size = Math.min(4, end); size >= 1; size--) {
      const phrase = words.slice(end - size, end), last = phrase[size - 1];
      if (describing.has(phrase[0]) || describing.has(last)
        || size === 1 && (broad.has(last) || broad.has(singular(last)) || /^[a-z]{1,2}$/.test(last))) continue;
      found.push(phrase.join(" "));
      if (singular(last) !== last) found.push([...phrase.slice(0, -1), singular(last)].join(" "));
    }
  }
  return [...new Set(found)];
}
