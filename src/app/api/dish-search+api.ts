import { BodyError, readSmallJson } from "../../server/read-json";
import { object } from "../../server/google-provider";
import { addSavedIds, discoveryInput } from "../../server/discovery-input";
import { dishSuggestions, placeSuggestions } from "../../server/venue-catalogue";
import { hiddenPlaces, staffContent } from "../../server/staff-content";
import { closedVenues } from "../../server/editorial-content";
import { localEnabled } from "../../server/local-explore/store";
import { readLocalMenuWithdrawals } from "../../server/local-explore/pilot-catalogue";
import { locationQuery } from "../../utils/location-search";

const headers = { "Cache-Control": "private, no-store" };
/**
 * Dish names and place names for Explore's search box while a member types, from the places (and their published menus)
 * the same search (tab, labels, area) may list; no outside service. POST keeps private coordinates out of URLs; the server's per-member read
 * limit applies (server/api-rate-limits.mjs).
 */
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Use a JSON dish search." }, { status: 415, headers });
  let input: unknown;
  try { input = await readSmallJson(request, 64_000); }
  catch (error) { return Response.json({ error: "Invalid dish search." }, { status: error instanceof BodyError ? error.status : 400, headers }); }
  const query = object(input) ? locationQuery(input.query) : undefined, search = object(input) ? discoveryInput(input.search) : undefined;
  if (!query || !search || !addSavedIds(search, (input as Record<string, unknown>).search))
    return Response.json({ error: "Enter 2–100 characters in a valid search." }, { status: 400, headers });
  try {
    const withdrawn = await localEnabled() ? await readLocalMenuWithdrawals() : new Set<string>();
    const staff = await staffContent();
    for (const id of [...hiddenPlaces(staff), ...closedVenues()]) withdrawn.add(id);
    const terms = dishSuggestions(query, search, withdrawn, staff);
    // Shop names are an extra: a problem there leaves the dish suggestions in place.
    let places: ReturnType<typeof placeSuggestions> = [];
    try { places = placeSuggestions(query, search, withdrawn, staff); } catch { places = []; }
    return Response.json({ terms, places }, { headers });
  } catch {
    return Response.json({ error: "Dish suggestions are unavailable." }, { status: 503, headers });
  }
}
