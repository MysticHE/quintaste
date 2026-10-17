/** Format curated UI labels only; never apply to user content or stored IDs. */
export function titleCaseLabel(label: string) {
  return label.replace(/(^|[\s(/-])([a-z])/g, (_, separator: string, letter: string) => separator + letter.toUpperCase());
}
