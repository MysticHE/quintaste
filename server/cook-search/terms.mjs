/**
 * One spelling of a Cook search or dish request, shared by the search log, the wanted-recipe list and the AI request
 * reuse: lower case, letters and digits only, serving counts dropped ("laksa for 2" and "Laksa!" are the same dish).
 * Returns '' for anything that should never be stored: too short, an address, a link or a long number.
 */
export function normaliseTerm(value) {
  const raw = String(value ?? '').normalize('NFKC').toLowerCase().trim();
  if (!raw || raw.length > 200 || /@|https?:|www\.|\d{5,}/.test(raw)) return '';
  const words = raw.replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(for|serves?|serving|feeds)\s+\d+(\s+(people|persons?|pax))?\b/g, ' ')
    .replace(/\b\d+\s*(pax|people|persons?|servings?)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (words.length < 3) return '';
  return words.slice(0, 60).trim();
}

/** Letter trigrams of a normalised phrase, padded so short words and word starts count. */
export function trigrams(text) {
  const grams = new Set();
  for (const word of String(text).split(' ').filter(Boolean)) {
    const padded = '  ' + word + ' ';
    for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/** Share of trigrams two phrases have in common (0 to 1), the same measure Postgres pg_trgm uses. */
export function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared++;
  return shared / (a.size + b.size - shared);
}
