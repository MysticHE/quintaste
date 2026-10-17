import { createHash } from "node:crypto";
import index from "../../../data/menus/catalogue-index.json";
import { bundledRecipes } from "../../data/recipes";
import { editorialContent, editorialVenue } from "../../server/editorial-content";
import { baseMenu } from "../../server/menu-delivery";
import type { CatalogueVenue } from "../../types/catalogue";

// Staff console only: packaged and bot content before staff changes, so staff can see what an edit covers and when
// newer data arrives underneath. server/index.mjs serves this on the internal port and refuses it on the public one.
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
type Row = { kind: string; id: string; data: Record<string, unknown> };

export function GET(request: Request) {
  const params = new URL(request.url).searchParams, kind = params.get("kind"), id = params.get("id") ?? "";
  const content = editorialContent(), bot = (type: string) => Object.values(content.records as unknown as Record<string, Row>)
    .filter(row => row.kind === type).map(row => ({ source: "bot", hash: hash(row.data), data: row.data }));
  if (kind === "places") return Response.json({ items: (index.venues as CatalogueVenue[]).map(venue => {
    const current = editorialVenue(venue, true, content);
    return { hash: hash(current), data: current };
  }) }, { headers });
  if (kind === "menu" && /^[a-z0-9][a-z0-9-]{2,119}$/.test(id)) {
    const menu = baseMenu(id, content);
    return menu ? Response.json({ hash: menu.fingerprint, data: menu.menu }, { headers }) : Response.json({ error: "No packaged menu" }, { status: 404, headers });
  }
  if (kind === "recipes") return Response.json({ items: [...bundledRecipes(true).map(recipe => ({ source: "bundled", hash: hash(recipe), data: recipe })), ...bot("recipe")] }, { headers });
  if (kind === "events") return Response.json({ items: bot("event") }, { headers });
  return Response.json({ error: "Unknown content" }, { status: 400, headers });
}
