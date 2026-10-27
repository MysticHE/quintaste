import { createHash } from "node:crypto";
import index from "../../../data/menus/catalogue-index.json";
import { bundledRecipes } from "../../data/recipes";
import { closedVenues, editorialContent, editorialPlaces, editorialVenue } from "../../server/editorial-content";
import { baseMenu } from "../../server/menu-delivery";
import { discoveryInput } from "../../server/discovery-input";
import { hiddenPlaces, staffContent } from "../../server/staff-content";
import { searchCatalogue } from "../../server/venue-catalogue";
import type { CatalogueVenue } from "../../types/catalogue";

// Staff console only: packaged and bot content before staff changes, so staff can see what an edit covers and when
// newer data arrives underneath. server/index.mjs serves this on the internal port and refuses it on the public one.
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
type Row = { kind: string; id: string; data: Record<string, unknown> };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams, kind = params.get("kind"), id = params.get("id") ?? "";
  // What members see in Explore right now: the same all-Singapore search, after staff hides and closed venues.
  if (kind === "counts") {
    const staff = await staffContent(), withdrawn = new Set([...hiddenPlaces(staff), ...closedVenues()]);
    const total = (kitchen?: "mixed") => searchCatalogue(discoveryInput({ area: "Singapore", query: "", vegan: false, ...(kitchen ? { kitchen } : {}) })!, null, withdrawn, staff).total;
    return Response.json({ veg: total(), mixed: total("mixed") }, { headers });
  }
  const content = editorialContent(), bot = (type: string) => Object.values(content.records as unknown as Record<string, Row>)
    .filter(row => row.kind === type).map(row => ({ source: "bot", hash: hash(row.data), data: row.data }));
  if (kind === "places") return Response.json({ items: [...(index.venues as CatalogueVenue[]).map(venue => {
    const current = editorialVenue(venue, true, content);
    return { hash: hash(current), data: current };
  }),
  // QT Explorer places (Veg Kitchen and Mixed Kitchen), with the diet evidence staff need to judge them; the fingerprint moves on every republish.
  ...[...editorialPlaces(content).values()].map(place => {
    const proof = (content.records as unknown as Record<string, Row>)["place:" + place.venue.id]?.data.dietProof;
    return { source: "bot", hash: place.fingerprint, data: { ...place.venue, ...(proof ? { dietProof: proof } : {}) } };
  })],
  // Venues QT Explorer found permanently closed (Explore withdraws them); kept out of the items so their hashes stay the same.
  closed: closedVenues(content) }, { headers });
  if (kind === "menu" && /^[a-z0-9][a-z0-9-]{2,119}$/.test(id)) {
    const menu = baseMenu(id, content);
    return menu ? Response.json({ hash: menu.fingerprint, data: menu.menu }, { headers }) : Response.json({ error: "No packaged menu" }, { status: 404, headers });
  }
  if (kind === "recipes") return Response.json({ items: [...bundledRecipes(true).map(recipe => ({ source: "bundled", hash: hash(recipe), data: recipe })), ...bot("recipe")] }, { headers });
  if (kind === "events") return Response.json({ items: bot("event") }, { headers });
  return Response.json({ error: "Unknown content" }, { status: 400, headers });
}
