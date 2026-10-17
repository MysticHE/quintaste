import type { IdentityCandidate, IdentityLead, TransientPlace } from "./types";

export function normalizeIdentityText(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function nameForms(name: string) {
  const base = name.replace(/\([^)]*\)/g, " ").split(/\s+[—–]\s+|\s+@\s+/u)[0];
  return new Set([normalizeIdentityText(name), normalizeIdentityText(base)].filter(Boolean));
}

function postal(address: string, supplied?: string) {
  return supplied && /^\d{6}$/.test(supplied) ? supplied : address.match(/\b\d{6}\b/)?.[0];
}

function unit(address: string, supplied?: string) {
  const value = address.match(/#\s*[bB]?\d{1,2}\s*-\s*\d{1,5}(?:\s*(?:to|[-/])\s*\d{1,5})?/i)?.[0] || supplied;
  return value?.toLowerCase().replace(/\s+to\s+/g, "-").replace(/[\s#]/g, "");
}

function street(address: string) {
  return normalizeIdentityText(address.replace(/#\s*[^,]+/g, " ").replace(/\b\d{6}\b/g, " "))
    .replace(/\b(?:singapore|sg|blk|block)\b/g, " ")
    .replace(/\brd\b/g, "road").replace(/\bst\b/g, "street").replace(/\bave\b/g, "avenue")
    .replace(/\bdr\b/g, "drive").replace(/\bctrl\b/g, "central").trim().replace(/\s+/g, " ");
}

function sameStreet(left: string, right: string) {
  const a = street(left).split(" "), b = street(right).split(" ");
  const number = a.find(word => /^\d+[a-z]?$/.test(word));
  if (!number || !b.includes(number)) return false;
  const words = a.filter(word => /[a-z\p{L}]/u.test(word) && !/^\d/.test(word));
  return words.length > 0 && words.slice(0, 3).every(word => b.includes(word));
}

function matchAddress(lead: IdentityLead, observed: string): IdentityCandidate["proof"] | undefined {
  if (!lead.address) return;
  const a = postal(lead.address, lead.postalCode), b = postal(observed);
  const sourceUnit = unit(lead.address, lead.unit), observedUnit = unit(observed);
  if (sourceUnit && observedUnit && sourceUnit !== observedUnit) return;
  const address = a && b && a === b && sameStreet(lead.address, observed) ? "postal-and-street"
    : normalizeIdentityText(lead.address) === normalizeIdentityText(observed) ? "exact-address" : undefined;
  if (!address || (a && b && a !== b)) return;
  return { name: "normalized-exact", address,
    unit: sourceUnit && observedUnit ? "exact" : sourceUnit || observedUnit ? "absent-in-one-source" : "absent-in-both",
    independentSourceFields: true, reviewRequired: true };
}

export function matchIdentity(placeId: string, place: TransientPlace, leads: IdentityLead[], checkedAt: string) {
  const name = place.displayName?.text, address = place.formattedAddress;
  if (!name || !address) return [];
  const forms = nameForms(name);
  const candidates: IdentityCandidate[] = [];
  for (const lead of leads) {
    const sourceForms = nameForms(lead.name);
    if (![...sourceForms].some(form => forms.has(form))) continue;
    const proof = matchAddress(lead, address);
    if (!proof) continue;
    proof.name = normalizeIdentityText(lead.name) === normalizeIdentityText(name) ? "normalized-exact" : "normalized-branch-alias";
    candidates.push({ placeId, observedPlaceId: place.id, leadId: lead.id, leadFile: lead.leadFile,
      name: lead.name, address: lead.address!, sourceUrls: lead.sourceUrls, status: "candidate", checkedAt, proof });
  }
  return candidates;
}
