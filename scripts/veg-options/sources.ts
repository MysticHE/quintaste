import { setTimeout as delay } from "node:timers/promises";
import { isRecord } from "../menu-research-files";

const SOCIAL = /(^|\.)(facebook|instagram|tiktok|linktr|wa\.me|whatsapp|google)\./;
export const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export type OneMapAddress = { address: string; building: string | null; postalCode: string; latitude: number; longitude: number };

// OneMap allows about 250 searches a minute: one shared lane, a request every 300 ms, backing off on 429.
let lane: Promise<void> = Promise.resolve();
const slot = () => { const turn = lane.then(() => delay(300)); lane = turn; return turn; };

/** Official Singapore address and map point for a postcode, or for a street address when no postcode matched
 * (OneMap, free public search). A street match must share the block number and give a six-digit postcode. */
export async function oneMap(postal: string, street?: string): Promise<OneMapAddress | null> {
  const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
  url.search = new URLSearchParams({ searchVal: street ?? postal, returnGeom: "Y", getAddrDetails: "Y", pageNum: "1" }).toString();
  const block = street?.match(/^\s*(\d+[A-Z]?)\b/i)?.[1]?.toUpperCase();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await slot();
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null);
    if (!response || response.status === 429 || response.status >= 500) { await response?.body?.cancel(); await delay(3000 * 2 ** attempt); continue; }
    if (!response.ok) { await response.body?.cancel(); return null; }
    const body: unknown = await response.json();
    const rows = isRecord(body) && Array.isArray(body.results) ? body.results.filter(isRecord) : [];
    const hit = street ? rows.find(r => /^\d{6}$/.test(String(r.POSTAL)) && !!block && String(r.BLK_NO).toUpperCase() === block)
      : rows.find(r => r.POSTAL === postal);
    if (!hit) return null;
    postal = String(hit.POSTAL);
    const latitude = Number(hit.LATITUDE), longitude = Number(hit.LONGITUDE);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const building = typeof hit.BUILDING === "string" && !["NIL", "NA", ""].includes(hit.BUILDING) ? hit.BUILDING : null;
    return { address: String(hit.ADDRESS), building, postalCode: postal, latitude, longitude };
  }
  return null;
}

/** True when the venue's own website shows its name or postcode, so the name is confirmed by the venue. */
export async function websiteConfirms(website: string | null | undefined, name: string, postal: string | null) {
  if (!website) return null;
  let host: string;
  try { host = new URL(website).hostname.toLowerCase(); } catch { return null; }
  if (SOCIAL.test(host)) return null;
  const response = await fetch(website, { signal: AbortSignal.timeout(15000), headers: {
    "User-Agent": "QuinTaste research (+https://quintaste.com)", Accept: "text/html" } }).catch(() => null);
  if (!response?.ok || !/html/.test(response.headers.get("content-type") ?? "")) { await response?.body?.cancel(); return null; }
  const text = (await response.text()).slice(0, 1_000_000);
  const page = normalize(text.replace(/<[^>]+>/g, " "));
  // Listings often add a branch or tagline ("Canchita at Dempsey Hill - Best Peruvian…"); the brand part counts.
  const keys = [name, name.split(/\s+(?:-|–|\||@|at)\s+/i)[0]].map(normalize).filter(k => k.length >= 4);
  return { byName: keys.some(k => page.includes(k)), byPostal: !!postal && text.includes(postal) };
}
