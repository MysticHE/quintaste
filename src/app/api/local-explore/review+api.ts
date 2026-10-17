import { localRoute, localJson, requireReviewer } from "../../../server/local-explore/http";
import { reviewCases, reviewCase, reviewCaseDetails } from "../../../server/local-explore/cases";
export const GET = (request: Request) => localRoute(request, async () => { await requireReviewer(request); const id = new URL(request.url).searchParams.get("id"); return Response.json(id ? { case: await reviewCaseDetails(id) } : { cases: await reviewCases() }); });
export const PATCH = (request: Request) => localRoute(request, async () => { await requireReviewer(request); return Response.json({ case: await reviewCase(await localJson(request)) }); });
