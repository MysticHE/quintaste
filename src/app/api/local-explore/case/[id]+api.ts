import { localRoute, localJson } from "../../../../server/local-explore/http";
import { caseDetails, addInformation } from "../../../../server/local-explore/cases";
export const GET = (request: Request, { id }: { id: string }) => localRoute(request, async () => Response.json({ case: await caseDetails(request, id) }));
export const PATCH = (request: Request, { id }: { id: string }) => localRoute(request, async () => Response.json({ case: await addInformation(request, id, await localJson(request)) }));
