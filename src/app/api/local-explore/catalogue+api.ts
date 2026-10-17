import { localRoute, localJson, requireReviewer } from "../../../server/local-explore/http";
import { readLocalPilotCatalogue, reviewLocalPilotCatalogue } from "../../../server/local-explore/pilot-catalogue";

export const GET = (request: Request) => localRoute(request, async () => {
  await requireReviewer(request); return Response.json(await readLocalPilotCatalogue());
});
export const PATCH = (request: Request) => localRoute(request, async () => {
  await requireReviewer(request); return Response.json(await reviewLocalPilotCatalogue(await localJson(request)));
});
