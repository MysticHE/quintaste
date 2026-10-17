import { fetchPlaceDetails } from "../../server/place-details";
import { placeIdValid } from "../../server/google-provider";
import { allowProviderRequest } from "../../server/provider-rate";
import { AllowanceError } from "../../server/google-allowance";

const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!placeIdValid(id)) return Response.json({ error: "Choose a valid place." }, { status: 400, headers });
  if (!allowProviderRequest("details")) return Response.json({ error: "Please wait a minute before opening another place." }, { status: 429, headers });
  try {
    const place = await fetchPlaceDetails(id);
    return place ? Response.json({ place }, { headers }) : Response.json({ error: "This branch is closed or unavailable." }, { status: 404, headers });
  } catch (error) { return Response.json({ error: error instanceof AllowanceError ? error.message : "Place details could not be loaded. Retry or open Google Maps." },
    { status: error instanceof AllowanceError ? 503 : 502, headers }); }
}
