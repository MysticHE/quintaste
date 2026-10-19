import { publishedMenus } from "../../server/published-menus";
import { localEnabled } from "../../server/local-explore/store";
import { readLocalMenuWithdrawals } from "../../server/local-explore/pilot-catalogue";
import { publishedMenuDetail, publishedMenuIndex } from "../../server/menu-delivery";
import { hiddenPlaces, staffContent } from "../../server/staff-content";
import { closedVenues } from "../../server/editorial-content";
import { createHash } from "node:crypto";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function conditional(data: unknown, revision: string, request?: Request) {
  // generatedAt is delivery time; the weak validator identifies unchanged catalogue content.
  const etag = 'W/"' + revision + '"';
  const cacheHeaders = { ...headers, ETag: etag, "Cache-Control": "private, no-cache", Vary: "If-None-Match" };
  return request?.headers.get("If-None-Match") === etag
    ? new Response(null, { status: 304, headers: cacheHeaders }) : Response.json(data, { headers: cacheHeaders });
}
export async function GET(request?: Request) {
  try {
    const withdrawn = await localEnabled() ? await readLocalMenuWithdrawals() : new Set<string>();
    const staff = await staffContent();
    for (const id of [...hiddenPlaces(staff), ...closedVenues()]) withdrawn.add(id);
    const params = new URL(request?.url ?? "http://localhost/api/menus").searchParams;
    if (params.get("view") === "index") {
      const index = publishedMenuIndex(Date.now(), withdrawn, staff);
      return conditional(index, createHash("sha256").update(JSON.stringify(index.venues)).digest("hex"), request);
    }
    if (params.has("id")) {
      const id = params.get("id") ?? "";
      if (!/^[a-z0-9][a-z0-9-]{2,119}$/.test(id)) return Response.json({ error: "Invalid menu" }, { status: 400, headers });
      const detail = publishedMenuDetail(id, Date.now(), withdrawn, staff);
      return detail ? conditional(detail, detail.fingerprint, request) : Response.json({ error: "Menu no longer published" }, { status: 404, headers });
    }
    return Response.json(publishedMenus(Date.now(), withdrawn), { headers });
  } catch {
    return Response.json({ error: "Menus unavailable. Please retry." }, { status: 503, headers });
  }
}
