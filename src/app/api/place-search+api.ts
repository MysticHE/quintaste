import { allowSearch, liveSearch, validatedSearch } from "../../server/places-search";

import { BodyError, readSmallJson } from "../../server/read-json";

const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Use a JSON search request." }, { status: 415, headers });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 4096) {
    return Response.json({ error: "Search request is too large." }, { status: 413, headers });
  }
  let input: unknown;
  try { input = await readSmallJson(request); }
  catch (error) { return Response.json({ error: error instanceof BodyError ? error.message : "Invalid search request." },
    { status: error instanceof BodyError ? error.status : 400, headers }); }
  const search = validatedSearch(input);
  if (!search) return Response.json({ error: "Choose a valid Singapore search area." }, { status: 400, headers });
  if (!allowSearch()) return Response.json({ error: "Please wait a minute before searching again." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  try {
    const result = await liveSearch(search.query, search.bounds);
    return result ? Response.json(result, { headers })
      : Response.json({ error: "Live search is unavailable. Open Google Maps or try again later." }, { status: 503, headers });
  } catch {
    return Response.json({ error: "Google search could not be reached. Retry or open Google Maps." }, { status: 502, headers });
  }
}
