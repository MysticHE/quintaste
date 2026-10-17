import { localRoute, localJson } from "../../../server/local-explore/http";
import { ownCases, submitCase } from "../../../server/local-explore/cases";
export const GET = (request: Request) => localRoute(request, async () => Response.json({ cases: await ownCases(request) }));
export const POST = (request: Request) => localRoute(request, async () => Response.json({ case: await submitCase(request, await localJson(request)) }));
