import { allowLocationSearch, searchLocations } from "../../server/location-search";
import { BodyError, readSmallJson } from "../../server/read-json";
import { locationQuery } from "../../utils/location-search";
import { object } from "../../server/google-provider";

const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Use a JSON location search." }, { status: 415, headers });
  }
  let input: unknown;
  try { input = await readSmallJson(request); }
  catch (error) {
    return Response.json({ error: error instanceof BodyError ? error.message : "Invalid location search." },
      { status: error instanceof BodyError ? error.status : 400, headers }); 
  }
  const query = object(input) ? locationQuery(input.query) : undefined;
  if (!query) return Response.json({ error: "Enter a place name or postal code, using 2–100 characters." }, { status: 400, headers });
  if (!allowLocationSearch()) return Response.json({ error: "Please wait a minute before searching again." },
    { status: 429, headers: { ...headers, "Retry-After": "60" } });
  try { return Response.json(await searchLocations(query), { headers }); }
  catch (error) { console.warn("Location provider failure", error instanceof Error ? error.name + ": " + error.message : "Unknown provider error"); return Response.json({ error: "Location suggestions are unavailable. Check your connection and retry." }, { status: 502, headers }); }
}
