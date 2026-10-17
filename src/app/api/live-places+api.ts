import { allowSearch } from "../../server/places-search";
import { discoveryInput } from "../../server/discovery-input";
import { BodyError, readSmallJson } from "../../server/read-json";
import { fetchLivePlaces } from "../../server/live-places";
import { AllowanceError } from "../../server/google-allowance";

const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Use a JSON search request." }, { status: 415, headers });
  let input: unknown;
  try { input = await readSmallJson(request); }
  catch (error) { return Response.json({ error: error instanceof BodyError ? error.message : "Invalid search request." },
    { status: error instanceof BodyError ? error.status : 400, headers }); }
  const search = discoveryInput(input);
  if (!search) {
    return Response.json({ error: "Choose a valid Singapore search." }, { status: 400, headers });
  }
  if (!allowSearch()) return Response.json({ error: "Please wait a minute before searching again." }, { status: 429, headers });
  try {
    return Response.json(await fetchLivePlaces(search), { headers });
  } catch (error) {
    return Response.json({ error: error instanceof AllowanceError ? error.message : "Live listings could not be loaded. Retry or open Google Maps." },
      { status: error instanceof AllowanceError ? 503 : 502, headers });
  }
}
