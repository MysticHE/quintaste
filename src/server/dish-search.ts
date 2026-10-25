import { searchWords, wordCharacter } from "../utils/search-words";

/** End of the Latin-script word running from `from`. */
const wordEnd = (line: string, from: number) => { let end = from; while (end < line.length && wordCharacter.test(line[end])) end++; return end; };
const title = (term: string) => term.replace(/(^| )\p{L}/gu, letter => letter.toUpperCase());
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
  return [...new Set([...single.slice(0, 2), ...pairs])].slice(0, limit).map(title);
}
