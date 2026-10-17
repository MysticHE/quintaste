import { localRoute } from "../../../server/local-explore/http";
import { localSession } from "../../../server/local-explore/session";
export const GET = (request: Request) => localRoute(request, async () => Response.json({ mode: "local-development" }));
export const POST = (request: Request) => localRoute(request, () => localSession(request));
