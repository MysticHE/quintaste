import { createHash } from "node:crypto";
import { discoveryInput } from "../../server/discovery-input";
import { readSmallJson, BodyError } from "../../server/read-json";
import { catalogueVenue, searchCatalogue } from "../../server/venue-catalogue";
import { hiddenPlaces, staffContent } from "../../server/staff-content";
import { closedVenues } from "../../server/editorial-content";
import { localEnabled } from "../../server/local-explore/store";
import { readLocalMenuWithdrawals } from "../../server/local-explore/pilot-catalogue";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", Vary: "X-Catalogue-Version" };
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Use a JSON search." }, { status: 415, headers });
  let body: unknown;
  try { body = await readSmallJson(request, 64_000); }
  catch (error) { return Response.json({ error: "Invalid catalogue request." }, { status: error instanceof BodyError ? error.status : 400, headers }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Invalid catalogue request." }, { status: 400, headers });
  const value = body as Record<string, unknown>;
  const search = discoveryInput(value.search);
  const rawSearch = value.search as Record<string, unknown> | undefined;
  if (search && rawSearch?.savedIds !== undefined) {
    const ids = rawSearch.savedIds;
    if (!Array.isArray(ids) || ids.length > 500 || ids.some(id => typeof id !== "string" || !/^[A-Za-z0-9_-]{3,160}$/.test(id)))
      return Response.json({ error: "Invalid saved places." }, { status: 400, headers });
    search.savedIds = [...new Set(ids as string[])].sort();
  }
  if (!search && !(typeof value.id === "string" && /^[a-z0-9][a-z0-9-]{2,119}$/.test(value.id)))
    return Response.json({ error: "Choose a valid Singapore search." }, { status: 400, headers });
  if (value.cursor !== undefined && value.cursor !== null && typeof value.cursor !== "string") return Response.json({ error: "Invalid page." }, { status: 400, headers });
  try {
    const withdrawn = await localEnabled() ? await readLocalMenuWithdrawals() : new Set<string>();
    const staff = await staffContent();
    for (const id of [...hiddenPlaces(staff), ...closedVenues()]) withdrawn.add(id);
    const data = typeof value.id === "string" ? catalogueVenue(value.id, withdrawn, staff) : searchCatalogue(search!, (value.cursor as string | null) ?? null, withdrawn, staff);
    if (!data) return Response.json({ error: "Venue no longer published." }, { status: 404, headers });
    const text = JSON.stringify(data), etag = '"' + createHash("sha256").update(text).digest("hex") + '"';
    // Search uses POST to keep private coordinates out of URLs. A matching application
    // version returns204; HTTP304 is reserved for conditional GET/HEAD menu requests.
    if (request.headers.get("X-Catalogue-Version") === etag) return new Response(null, { status: 204, headers: { ...headers, ETag: etag } });
    return new Response(text, { headers: { ...headers, ETag: etag, "Content-Type": "application/json" } });
  } catch (error) {
    const invalid = error instanceof Error && /Invalid page|Search changed/.test(error.message);
    return Response.json({ error: invalid ? "Search changed. Refresh results." : "Places unavailable. Please retry." }, { status: invalid ? 400 : 503, headers });
  }
}
